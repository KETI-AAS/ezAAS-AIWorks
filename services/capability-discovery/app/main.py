from fastapi import FastAPI

from app.routes.api import register_routes


app = FastAPI(title="capability-discovery")
register_routes(app)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "capability-discovery"}
