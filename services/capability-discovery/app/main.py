from fastapi import FastAPI

from app.routes.aasx import router as aasx_router


app = FastAPI(title="capability-discovery")
app.include_router(aasx_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "capability-discovery"}
