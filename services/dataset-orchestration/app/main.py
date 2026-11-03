from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.mapping.config import settings
from app.mapping.routes.api import init_service, router as mapping_router
from app.mapping.services.pipeline import MappingService


def create_app(service: MappingService | None = None) -> FastAPI:
    app = FastAPI(
        title="dataset-orchestration",
        description="레거시 제조데이터 의미 매핑 · 전처리 · AI-Ready 데이터셋 생성 서비스",
        version="0.1.0",
    )
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    svc = service or MappingService(settings)
    init_service(svc)
    app.include_router(mapping_router, prefix="/api/v1/mapping", tags=["mapping"])

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "service": "dataset-orchestration",
            "mapping": {
                "embedding": svc.embedding.name,
                "interpreter": svc.interpreter.name,
                "dictionary_concepts": len(svc.dictionary.concepts),
            },
        }

    return app


app = create_app()
