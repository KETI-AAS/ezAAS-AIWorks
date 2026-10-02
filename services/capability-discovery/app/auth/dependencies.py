from fastapi import Depends, HTTPException, Request
from app.auth.memory_store import get_store
from app.core.config import get_settings

SESSION_COOKIE = "capability_session"
TRANSACTION_COOKIE = "capability_sso_transaction"


def current_user(request: Request, cfg=Depends(get_settings), store=Depends(get_store)):
    raw = request.cookies.get(SESSION_COOKIE, "")
    user = store.get_session(raw) if raw else None
    if user is None:
        raise HTTPException(401, "Capability login required", headers={"Cache-Control": "no-store"})
    return user
