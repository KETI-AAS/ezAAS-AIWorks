"""컬럼명·약어 해석기 (특허 4절 "LLM 은 컬럼명에 포함된 약어와 자연어 설명을 해석").

- RuleBasedInterpreter (기본): 의미사전 약어/동의어 + 조합 규칙. 외부 의존 없음.
- OpenAIInterpreter (선택): Graph RAG 컨텍스트를 제공해 LLM 이 개념 후보를 제시.
  LLM 결과는 항상 INFERRED 로만 기록되며, 의미사전에 존재하는 개념 ID 만 채택한다.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Optional, Protocol

from .dictionary import SemanticDictionary, TermMatch, tokenize
from .knowledge_graph import InMemoryKnowledgeGraph

log = logging.getLogger(__name__)


@dataclass
class Interpretation:
    concept_id: str
    matched_term: str
    method: str          # abbreviation / synonym / composition / llm
    confidence: float
    rationale: str


class Interpreter(Protocol):
    name: str

    def interpret_name(self, name: str, description: Optional[str] = None) -> list[Interpretation]: ...


class RuleBasedInterpreter:
    name = "rule_based"

    def __init__(self, dictionary: SemanticDictionary):
        self.dictionary = dictionary

    def interpret_name(self, name: str, description: Optional[str] = None) -> list[Interpretation]:
        tokens = tokenize(name)
        matches: list[TermMatch] = self.dictionary.match_tokens(tokens)
        out = [
            Interpretation(
                concept_id=m.concept.concept_id,
                matched_term=m.matched_term,
                method=m.method,
                confidence=0.75 if m.method == "synonym" else 0.6,
                rationale=f"컬럼명 토큰 '{m.matched_term}' → '{m.concept.label}' ({m.method})",
            )
            for m in matches
        ]
        return out


class OpenAIInterpreter(RuleBasedInterpreter):
    """OpenAI 호환 Chat Completions API 사용 (OPENAI_API_KEY, LLM_MODEL, LLM_BASE_URL)."""

    name = "openai"

    def __init__(self, dictionary: SemanticDictionary, kg: InMemoryKnowledgeGraph):
        super().__init__(dictionary)
        self.kg = kg
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")

    def interpret_name(self, name: str, description: Optional[str] = None) -> list[Interpretation]:
        base = super().interpret_name(name, description)
        if not self.api_key:
            return base
        try:  # pragma: no cover - 외부 API
            import httpx

            ctx = self.kg.context_for([i.concept_id for i in base]) or []
            catalog = [
                {"id": c.concept_id, "category": c.category, "name": c.label}
                for c in self.dictionary.concepts.values()
            ]
            prompt = (
                "제조 데이터 컬럼명을 해석해 아래 개념 카탈로그의 ID 로만 답하라. 확신이 없으면 포함하지 마라.\n"
                f"컬럼명: {name}\n설명: {description or '(없음)'}\n"
                f"지식그래프 컨텍스트:\n" + "\n".join(ctx) + "\n"
                f"카탈로그: {json.dumps(catalog, ensure_ascii=False)}\n"
                'JSON 으로만 응답: {"concepts":[{"id":"...","term":"...","confidence":0.0,"rationale":"..."}]}'
            )
            r = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                },
                timeout=20,
            )
            r.raise_for_status()
            payload = json.loads(r.json()["choices"][0]["message"]["content"])
            known = {i.concept_id for i in base}
            for item in payload.get("concepts", []):
                cid = item.get("id")
                if cid in self.dictionary.concepts and cid not in known:
                    base.append(
                        Interpretation(
                            concept_id=cid,
                            matched_term=item.get("term", name),
                            method="llm",
                            confidence=min(float(item.get("confidence", 0.5)), 0.7),
                            rationale=f"LLM 해석: {item.get('rationale', '')}",
                        )
                    )
        except Exception as exc:
            log.warning("LLM 해석 실패, 규칙 기반 결과 사용: %s", exc)
        return base


def build_interpreter(kind: str, dictionary: SemanticDictionary, kg: InMemoryKnowledgeGraph) -> RuleBasedInterpreter:
    if kind == "openai":
        return OpenAIInterpreter(dictionary, kg)
    return RuleBasedInterpreter(dictionary)
