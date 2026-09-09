from fastapi import FastAPI

app = FastAPI(title="ai-deploy")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-deploy"}
