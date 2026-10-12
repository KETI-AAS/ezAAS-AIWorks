import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from app.auth.dependencies import current_user, SESSION_COOKIE, TRANSACTION_COOKIE
from app.auth.memory_store import get_store
from app.auth.schemas import CurrentUser
from app.auth import service
from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["Hub SSO prototype"])
HEADERS = {"Cache-Control": "no-store", "Pragma": "no-cache", "Referrer-Policy": "no-referrer"}


def response(data, status=200):
    return JSONResponse(jsonable_encoder(data), status_code=status, headers=HEADERS)


@router.get("/hub/start")
def start(cfg=Depends(get_settings), store=Depends(get_store)):
    browser_id, data = service.start_login(cfg, store)
    result = response(data)
    result.set_cookie(TRANSACTION_COOKIE, browser_id, httponly=True, secure=cfg.secure_cookie,
                      samesite="lax", path="/auth/hub", max_age=300)
    return result


@router.get("/hub/callback")
async def callback(request: Request, code: str = "", state: str = "",
                   cfg=Depends(get_settings), store=Depends(get_store)):
    try:
        if not re.fullmatch(r"[A-Za-z0-9_-]{43}", code) or not re.fullmatch(r"[A-Za-z0-9_-]{32,256}", state):
            raise HTTPException(400, "Invalid callback parameters")
        raw, user = await service.finish_login(code, state,
            request.cookies.get(TRANSACTION_COOKIE, ""), request.cookies.get(SESSION_COOKIE, ""), cfg, store)
        result = response(CurrentUser(**user))
        remaining = max(0, int((user["expires_at"] - datetime.now(timezone.utc)).total_seconds()))
        result.set_cookie(SESSION_COOKIE, raw, httponly=True, secure=cfg.secure_cookie,
                          samesite="lax", path="/", max_age=remaining)
    except HTTPException as exc:
        result = response({"detail": exc.detail}, exc.status_code)
    result.delete_cookie(TRANSACTION_COOKIE, path="/auth/hub", secure=cfg.secure_cookie,
                         httponly=True, samesite="lax")
    return result


@router.get("/me", response_model=CurrentUser)
def me(user=Depends(current_user)):
    return response(CurrentUser(**user))
