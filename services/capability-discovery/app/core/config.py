"""Opt-in prototype settings; no database or secrets loaded during startup."""
import os
from dataclasses import dataclass
from urllib.parse import urlsplit
from fastapi import HTTPException


@dataclass(frozen=True)
class Settings:
    hub_base_url: str
    callback_url: str
    client_secret: str
    client_id: str = "capability"
    secure_cookie: bool = True
    session_seconds: int = 3600


def get_settings():
    if os.getenv("CAPABILITY_SSO_ENABLED", "false").lower() != "true":
        raise HTTPException(503, "Capability SSO is disabled")
    hub = os.getenv("HUB_SSO_BASE_URL", "").rstrip("/")
    callback = os.getenv("CAPABILITY_SSO_CALLBACK_URL", "")
    secret = os.getenv("CAPABILITY_SSO_CLIENT_SECRET", "")
    local = os.getenv("CAPABILITY_SSO_ALLOW_LOCAL_HTTP", "false").lower() == "true"
    secure = os.getenv("CAPABILITY_SSO_COOKIE_SECURE", "true").lower() == "true"
    client_id = os.getenv("CAPABILITY_SSO_CLIENT_ID", "capability")
    try:
        ttl = int(os.getenv("CAPABILITY_SSO_SESSION_SECONDS", "3600"))
        if not 1 <= ttl <= 86400 or len(secret) < 32 or secret.startswith("CHANGE_ME") or not client_id:
            raise ValueError()
        for url in [hub, callback]:
            parts = urlsplit(url)
            loopback = parts.hostname in {"localhost", "127.0.0.1"}
            if (not parts.hostname or parts.username or parts.password or parts.query or parts.fragment
                or not (parts.scheme == "https" or (local and loopback and parts.scheme == "http"))):
                raise ValueError()
            if not secure and not (local and loopback):
                raise ValueError()
        if urlsplit(callback).path != "/auth/hub/callback":
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(503, "Invalid Capability SSO configuration")
    return Settings(hub, callback, secret, client_id, secure, ttl)
