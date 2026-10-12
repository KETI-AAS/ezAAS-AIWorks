import httpx
from fastapi import HTTPException
from app.auth.schemas import HubIdentity


async def exchange_code(code, verifier, cfg):
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False, trust_env=False) as client:
            response = await client.post(cfg.hub_base_url + "/sso/exchange",
                headers={"Authorization": "Bearer " + cfg.client_secret},
                json={"client_id": cfg.client_id, "redirect_uri": cfg.callback_url,
                      "code": code, "code_verifier": verifier})
        if response.status_code in {400, 401, 403}:
            raise HTTPException(401, "Hub rejected the login exchange")
        if response.status_code != 200:
            raise HTTPException(502, "Hub authentication service unavailable")
        identity = HubIdentity(**response.json())
        if identity.expires_at.tzinfo is None or not identity.hub_user_id.isdigit() or int(identity.hub_user_id) <= 0:
            raise ValueError()
        return identity
    except httpx.HTTPError:
        raise HTTPException(502, "Hub authentication service unavailable")
    except (ValueError, TypeError):
        raise HTTPException(502, "Invalid Hub authentication response")
