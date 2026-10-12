from fastapi import FastAPI

from app.routes.api import router as api_router
from app.routes.auth import router as auth_router


app = FastAPI(title="capability-discovery")
app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "capability-discovery"}
