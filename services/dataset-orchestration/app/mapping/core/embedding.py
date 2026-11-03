"""임베딩 제공자 (특허 6절).

- HashingEmbedding (기본): 문자 n-gram + 단어 해시 벡터. 외부 모델 없이 동작하며, 의미사전으로
  보완된 의미 표현(대표 명칭·동의어 포함)을 입력으로 받기 때문에 약어/다국어 차이를 상당 부분 흡수한다.
- SentenceTransformerEmbedding: EMBEDDING_BACKEND=sentence_transformers (sentence-transformers 설치 필요)
- OpenAIEmbedding: EMBEDDING_BACKEND=openai (OPENAI_API_KEY 필요)
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
from typing import Protocol

import numpy as np

log = logging.getLogger(__name__)


class EmbeddingProvider(Protocol):
    name: str

    def embed(self, texts: list[str]) -> np.ndarray: ...


def _l2(m: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(m, axis=1, keepdims=True)
    n[n == 0] = 1.0
    return m / n


class HashingEmbedding:
    name = "hashing"

    def __init__(self, dim: int = 2048, ngram: tuple[int, int] = (3, 5)):
        self.dim = dim
        self.ngram = ngram

    def _h(self, s: str) -> tuple[int, float]:
        d = hashlib.blake2b(s.encode("utf-8"), digest_size=8).digest()
        v = int.from_bytes(d, "little")
        return v % self.dim, (1.0 if (v >> 63) & 1 else -1.0)

    def _vec(self, text: str) -> np.ndarray:
        v = np.zeros(self.dim, dtype=np.float32)
        t = text.lower()
        words = re.findall(r"[a-z0-9µ°/²%]+|[가-힣]+", t)
        for w in words:
            i, s = self._h("w:" + w)
            v[i] += 2.0 * s
        for w in words:
            padded = f" {w} "
            for n in range(self.ngram[0], self.ngram[1] + 1):
                for k in range(0, max(len(padded) - n + 1, 1)):
                    i, s = self._h("c:" + padded[k : k + n])
                    v[i] += s
        return v

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        return _l2(np.stack([self._vec(t or "") for t in texts]))


class SentenceTransformerEmbedding:  # pragma: no cover - 외부 의존
    name = "sentence_transformers"

    def __init__(self, model: str):
        from sentence_transformers import SentenceTransformer  # type: ignore

        self.model = SentenceTransformer(model or "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    def embed(self, texts: list[str]) -> np.ndarray:
        return _l2(np.asarray(self.model.encode(texts, normalize_embeddings=True), dtype=np.float32))


class OpenAIEmbedding:  # pragma: no cover - 외부 의존
    name = "openai"

    def __init__(self, model: str):
        self.model = model or "text-embedding-3-small"
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")

    def embed(self, texts: list[str]) -> np.ndarray:
        import httpx

        r = httpx.post(
            f"{self.base_url}/embeddings",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"model": self.model, "input": texts},
            timeout=30,
        )
        r.raise_for_status()
        return _l2(np.asarray([d["embedding"] for d in r.json()["data"]], dtype=np.float32))


def build_embedding_provider(backend: str, model: str = "") -> EmbeddingProvider:
    try:
        if backend == "sentence_transformers":
            return SentenceTransformerEmbedding(model)
        if backend == "openai":
            return OpenAIEmbedding(model)
    except Exception as exc:  # pragma: no cover
        log.warning("임베딩 백엔드 '%s' 초기화 실패 → hashing 사용: %s", backend, exc)
    return HashingEmbedding()


def cosine_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """L2 정규화된 행렬 간 코사인 유사도."""
    if a.size == 0 or b.size == 0:
        return np.zeros((a.shape[0], b.shape[0]), dtype=np.float32)
    return np.clip(a @ b.T, -1.0, 1.0)
