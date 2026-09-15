from fastapi import FastAPI

from app.routes.api import router as api_router


app = FastAPI(title="capability-discovery")
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "capability-discovery"}
