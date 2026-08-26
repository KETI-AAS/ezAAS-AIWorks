from fastapi import FastAPI

app = FastAPI(title="dataset-orchestration")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "dataset-orchestration"}
