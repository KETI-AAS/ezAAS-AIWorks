from fastapi import FastAPI

app = FastAPI(title="capability-discovery")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "capability-discovery"}
