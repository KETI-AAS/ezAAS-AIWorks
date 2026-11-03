"""서비스 설정 (환경변수)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _bool(v: str | None, default: bool = False) -> bool:
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    port: int = int(os.getenv("PORT", "8002"))
    data_dir: Path = Path(os.getenv("SEMANTIC_MAPPING_DATA_DIR", "./data"))

    # 후보 검색
    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    min_similarity: float = float(os.getenv("MIN_SIMILARITY", "0.05"))

    # 임베딩: hashing(기본, 오프라인) / sentence_transformers / openai
    embedding_backend: str = os.getenv("EMBEDDING_BACKEND", "hashing")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "")

    # 해석기(LLM): rule_based(기본) / openai
    interpreter_backend: str = os.getenv("INTERPRETER_BACKEND", "rule_based")

    # 지식그래프: memory(기본) / neo4j
    kg_backend: str = os.getenv("KG_BACKEND", "memory")
    neo4j_uri: str = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    neo4j_user: str = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "")

    # 추가 의미사전 (콤마 구분 JSON 경로)
    extra_dictionaries: list[str] = field(
        default_factory=lambda: [p for p in os.getenv("SEMANTIC_DICTIONARY_PATH", "").split(",") if p.strip()]
    )

    # AAS 에 명시된 속성 중 기본적으로 '필수 조건'으로 취급할 속성
    required_attrs_policy: list[str] = field(
        default_factory=lambda: os.getenv(
            "REQUIRED_ATTRS",
            "concept,quantity,unit,data_type,measurement_location,value_representation",
        ).split(",")
    )
    # 레거시 데이터 미리보기 행 수
    preview_rows: int = int(os.getenv("PREVIEW_ROWS", "5"))
    allow_numeric_string_cast: bool = _bool(os.getenv("ALLOW_NUMERIC_STRING_CAST"), True)


settings = Settings()
