import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from app.auth import hub_client
from app.auth.router import router
from app.auth.dependencies import SESSION_COOKIE
from app.auth.memory_store import MemoryStore, get_store, digest
from app.auth.schemas import HubIdentity
from app.core.config import Settings, get_settings


@pytest.fixture
def context(monkeypatch):
    cfg = Settings("https://hub.example.com/api", "https://capa.example.com/auth/hub/callback",
                   "test-only-server-secret-not-for-production-123456789")
    store = MemoryStore()
    app = FastAPI(); app.include_router(router)
    app.dependency_overrides[get_settings] = lambda: cfg
    app.dependency_overrides[get_store] = lambda: store
    exchange = AsyncMock(return_value=HubIdentity(hub_user_id="42", hub_session_id=uuid4(),
                         expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)))
    monkeypatch.setattr(hub_client, "exchange_code", exchange)
    with TestClient(app, base_url="https://capa.example.com") as client:
        yield client, store, exchange, cfg


def start(client):
    response = client.get("/auth/hub/start")
    assert response.status_code == 200
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "Secure" in response.headers["set-cookie"]
    return response.json()["authorization_request"]["state"]


def callback(client, state):
    return client.get("/auth/hub/callback", params={"code": "c" * 43, "state": state})


def test_login_me_and_replay(context):
    client, store, exchange, cfg = context
    assert client.get("/auth/me").status_code == 401
    state = start(client)
    response = callback(client, state)
    assert response.status_code == 200
    assert response.json()["hub_user_id"] == "42"
    raw = client.cookies[SESSION_COOKIE]
    assert raw not in store.sessions and digest(raw) in store.sessions
    assert response.headers["cache-control"] == "no-store"
    assert client.get("/auth/me").status_code == 200
    assert callback(client, state).status_code == 400
    assert exchange.await_count == 1


def test_callback_requires_browser_transaction(context):
    client, store, exchange, cfg = context
    assert callback(client, "s" * 43).status_code == 400
    exchange.assert_not_awaited()


def test_bad_state_rejected_before_hub(context):
    client, store, exchange, cfg = context
    start(client)
    assert callback(client, "wrong" * 10).status_code == 400
    exchange.assert_not_awaited()


def test_expired_transaction(context):
    client, store, exchange, cfg = context
    state = start(client)
    for item in store.transactions.values():
        item["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert callback(client, state).status_code == 400
    exchange.assert_not_awaited()


def test_hub_failure_does_not_create_session(context):
    client, store, exchange, cfg = context
    exchange.side_effect = HTTPException(502, "Hub unavailable")
    assert callback(client, start(client)).status_code == 502
    assert not store.sessions
    assert SESSION_COOKIE not in client.cookies


def test_hub_expired_session_rejected(context):
    client, store, exchange, cfg = context
    exchange.return_value.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert callback(client, start(client)).status_code == 401
    assert not store.sessions


def test_user_mapping_and_session_rotation(context):
    client, store, exchange, cfg = context
    a = callback(client, start(client)).json()
    previous = client.cookies[SESSION_COOKIE]
    b = callback(client, start(client)).json()
    assert a["capability_user_id"] == b["capability_user_id"]
    assert previous != client.cookies[SESSION_COOKIE]
    assert digest(previous) not in store.sessions
    assert len(store.users) == 1


def test_session_expiry_and_restart(context):
    client, store, exchange, cfg = context
    callback(client, start(client))
    item = next(iter(store.sessions.values()))
    assert item["expires_at"] <= exchange.return_value.expires_at
    item["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert client.get("/auth/me").status_code == 401
    assert MemoryStore().get_session(client.cookies[SESSION_COOKIE]) is None


def test_unknown_cookie_rejected(context):
    client, store, exchange, cfg = context
    client.cookies.set(SESSION_COOKIE, "forged")
    assert client.get("/auth/me").status_code == 401


def test_disabled_without_configuration(monkeypatch):
    monkeypatch.delenv("CAPABILITY_SSO_ENABLED", raising=False)
    app = FastAPI(); app.include_router(router)
    with TestClient(app) as client:
        assert client.get("/auth/hub/start").status_code == 503


def test_real_hub_client_contract(monkeypatch):
    cfg = Settings("https://hub.example.com/api", "https://capa.example.com/auth/hub/callback", "secret")
    captured = []
    def handler(request):
        captured.append(request)
        return httpx.Response(200, json={"hub_user_id": "42", "hub_session_id": str(uuid4()),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=2)).isoformat()})
    original = httpx.AsyncClient
    monkeypatch.setattr(hub_client.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    result = asyncio.run(hub_client.exchange_code("code", "verifier", cfg))
    assert result.hub_user_id == "42"
    assert str(captured[0].url) == "https://hub.example.com/api/sso/exchange"
    assert captured[0].headers["authorization"] == "Bearer secret"
    assert b'code_verifier' in captured[0].content


@pytest.mark.parametrize("data", [{}, {"hub_user_id": "42", "hub_session_id": "not-a-uuid", "expires_at": "bad"}])
def test_malformed_hub_response(monkeypatch, data):
    cfg = Settings("https://hub.example.com", "https://capa.example.com/auth/hub/callback", "secret")
    original = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=data))
    monkeypatch.setattr(hub_client.httpx, "AsyncClient", lambda **kwargs: original(transport=transport, **kwargs))
    with pytest.raises(HTTPException) as error:
        asyncio.run(hub_client.exchange_code("code", "verifier", cfg))
    assert error.value.status_code == 502
