import base64
import hashlib
from fastapi import HTTPException
from app.auth import hub_client


def start_login(cfg, store):
    try:
        browser_id, state, verifier = store.begin()
    except OverflowError:
        raise HTTPException(503, "Prototype login capacity reached")
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return browser_id, {"hub_code_endpoint": cfg.hub_base_url + "/sso/codes",
                       "authorization_request": {"client_id": cfg.client_id,
                          "redirect_uri": cfg.callback_url, "state": state, "code_challenge": challenge}}


async def finish_login(code, state, browser_id, previous, cfg, store):
    transaction = store.take_transaction(browser_id, state)
    if transaction is None:
        raise HTTPException(400, "Invalid, expired or already used login transaction")
    # Remove before networking: duplicate callbacks cannot establish multiple sessions.
    identity = await hub_client.exchange_code(code, transaction["verifier"], cfg)
    try:
        return store.create_session(identity, cfg.session_seconds, previous)
    except ValueError:
        raise HTTPException(401, "Hub session has expired")
    except OverflowError:
        raise HTTPException(503, "Prototype session capacity reached")
