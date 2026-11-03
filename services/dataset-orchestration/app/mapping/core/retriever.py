"""후보 검색부 (특허 6절): 입력항목별 Top-K 원천 컬럼 검색.

이 단계의 결과는 최종 매핑이 아닌 '검토 대상 후보 목록'이다.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from app.mapping.core.embedding import EmbeddingProvider, cosine_matrix
from app.mapping.schemas.legacy import ColumnProfile
from app.mapping.schemas.requirement import ModelInputRequirement


@dataclass
class RetrievedCandidate:
    column: ColumnProfile
    similarity: float
    rank: int


def resolve_top_k(requested: int | None, n_columns: int, default_k: int) -> int:
    """K 결정: 사용자 설정 > 시스템 기본값, 전체 컬럼 수를 넘지 않음.
    requested=0 이면 컬럼 수 기반 자동값(√N, 최소 3)."""
    if n_columns <= 0:
        return 0
    if requested is None:
        k = default_k
    elif requested == 0:
        k = max(3, math.ceil(math.sqrt(n_columns)))
    else:
        k = requested
    return max(1, min(k, n_columns))


def retrieve_top_k(
    provider: EmbeddingProvider,
    requirements: list[ModelInputRequirement],
    columns: list[ColumnProfile],
    top_k: int,
    exclude_columns: set[str] | None = None,
    min_similarity: float = 0.0,
) -> dict[str, list[RetrievedCandidate]]:
    exclude_columns = exclude_columns or set()
    cols = [c for c in columns if c.column_name not in exclude_columns]
    if not cols or not requirements:
        return {r.input_id: [] for r in requirements}
    req_vec = provider.embed([r.semantic_text or r.name for r in requirements])
    col_vec = provider.embed([c.semantic_text or c.column_name for c in cols])
    sim = cosine_matrix(req_vec, col_vec)
    out: dict[str, list[RetrievedCandidate]] = {}
    for i, r in enumerate(requirements):
        order = sim[i].argsort()[::-1]
        picked: list[RetrievedCandidate] = []
        for j in order:
            s = float(sim[i, j])
            if s < min_similarity:
                break
            picked.append(RetrievedCandidate(cols[j], round(s, 4), len(picked) + 1))
            if len(picked) >= top_k:
                break
        out[r.input_id] = picked
    return out


def similarity_for(provider: EmbeddingProvider, req: ModelInputRequirement, col: ColumnProfile) -> float:
    a = provider.embed([req.semantic_text or req.name])
    b = provider.embed([col.semantic_text or col.column_name])
    return round(float(cosine_matrix(a, b)[0, 0]), 4)
