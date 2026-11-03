"""지식그래프 (특허 5절).

물리량·설비·구성요소·측정 대상·단위 간 관계를 표현한다. 핵심 원칙:
**동의어(same) 관계와 단순 관련(related) 관계를 구분**한다.
예) vibration_velocity ↔ vibration_acceleration 은 related_to 이므로 동일 물리량으로 취급하지 않는다.

기본 구현은 의미사전의 relations 로 구성되는 인메모리 그래프이며,
KG_BACKEND=neo4j 설정 시 Neo4jKnowledgeGraph 를 사용한다(neo4j 드라이버 필요).
"""
from __future__ import annotations

import logging
from collections import defaultdict
from enum import Enum
from typing import Optional, Protocol

from .dictionary import SemanticDictionary

log = logging.getLogger(__name__)


class Relation(str, Enum):
    SAME = "same"            # 동일 개념(동의어 포함)
    NARROWER = "narrower"    # a 가 b 보다 구체적 (a broader b)
    BROADER = "broader"      # a 가 b 보다 일반적
    PART_OF = "part_of"
    HAS_PART = "has_part"
    RELATED = "related"      # 관련 있으나 다른 개념
    OPPOSITE = "opposite"    # 상반 개념 (구동측 ↔ 반구동측)
    NONE = "none"


class KnowledgeGraph(Protocol):
    def relation(self, a: str, b: str) -> Relation: ...
    def neighbors(self, concept_id: str) -> list[tuple[str, str]]: ...
    def narrower_of(self, concept_id: str) -> list[str]: ...
    def context_for(self, concept_ids: list[str]) -> list[str]: ...


class InMemoryKnowledgeGraph:
    def __init__(self, dictionary: SemanticDictionary):
        self.dictionary = dictionary
        self._out: dict[str, list[tuple[str, str]]] = defaultdict(list)
        self._in: dict[str, list[tuple[str, str]]] = defaultdict(list)
        for s, p, o in dictionary.relations:
            self._out[s].append((p, o))
            self._in[o].append((p, s))
        # 개념 속성도 트리플로 노출 (Graph RAG 컨텍스트)
        for c in dictionary.concepts.values():
            if c.quantity:
                self._out[c.concept_id].append(("measures_quantity", c.quantity))
            if c.default_unit:
                self._out[c.concept_id].append(("typical_unit", c.default_unit))

    def _ancestors(self, a: str, pred: str) -> set[str]:
        seen, stack = set(), [a]
        while stack:
            cur = stack.pop()
            for p, o in self._out.get(cur, []):
                if p == pred and o not in seen:
                    seen.add(o)
                    stack.append(o)
        return seen

    def relation(self, a: str, b: str) -> Relation:
        if not a or not b:
            return Relation.NONE
        if a == b:
            return Relation.SAME
        if b in self._ancestors(a, "broader"):
            return Relation.NARROWER
        if a in self._ancestors(b, "broader"):
            return Relation.BROADER
        if b in self._ancestors(a, "part_of"):
            return Relation.PART_OF
        if a in self._ancestors(b, "part_of"):
            return Relation.HAS_PART
        for p, o in self._out.get(a, []) + self._out.get(b, []):
            if p == "opposite_of" and o in (a, b):
                return Relation.OPPOSITE
        for p, o in self._out.get(a, []):
            if p == "related_to" and o == b:
                return Relation.RELATED
        for p, o in self._out.get(b, []):
            if p == "related_to" and o == a:
                return Relation.RELATED
        # 같은 상위개념을 공유하는 형제 개념 → related
        if self._ancestors(a, "broader") & self._ancestors(b, "broader"):
            return Relation.RELATED
        return Relation.NONE

    def neighbors(self, concept_id: str) -> list[tuple[str, str]]:
        out = list(self._out.get(concept_id, []))
        out += [(f"inverse:{p}", s) for p, s in self._in.get(concept_id, [])]
        return out

    def narrower_of(self, concept_id: str) -> list[str]:
        return [s for p, s in self._in.get(concept_id, []) if p == "broader"]

    def context_for(self, concept_ids: list[str]) -> list[str]:
        """Graph RAG: 관련 개념의 정의와 관계를 LLM 프롬프트용 문장으로 반환."""
        lines: list[str] = []
        for cid in dict.fromkeys(concept_ids):
            c = self.dictionary.get(cid)
            if not c:
                continue
            lines.append(f"[{cid}] {c.label} ({c.names.get('ko', '')}): {c.definition or ''}".strip())
            for p, o in self.neighbors(cid):
                lines.append(f"  {cid} --{p}--> {o}")
        return lines


class Neo4jKnowledgeGraph(InMemoryKnowledgeGraph):
    """Neo4j 기반 지식그래프 어댑터.

    (:Concept {id})-[:BROADER|PART_OF|RELATED_TO|OPPOSITE_OF]->(:Concept) 스키마를 가정한다.
    연결 실패 시 인메모리 그래프로 폴백한다.
    """

    def __init__(self, dictionary: SemanticDictionary, uri: str, user: str, password: str):
        super().__init__(dictionary)
        try:
            from neo4j import GraphDatabase  # type: ignore

            self._driver = GraphDatabase.driver(uri, auth=(user, password))
            self._load_from_neo4j()
        except Exception as exc:  # pragma: no cover - 외부 의존
            log.warning("Neo4j 연결 실패, 인메모리 지식그래프 사용: %s", exc)
            self._driver = None

    def _load_from_neo4j(self) -> None:  # pragma: no cover - 외부 의존
        q = "MATCH (a:Concept)-[r]->(b:Concept) RETURN a.id AS s, toLower(type(r)) AS p, b.id AS o"
        with self._driver.session() as session:
            for rec in session.run(q):
                s, p, o = rec["s"], rec["p"], rec["o"]
                self._out[s].append((p, o))
                self._in[o].append((p, s))


def build_knowledge_graph(dictionary: SemanticDictionary, backend: str = "memory", **kw) -> InMemoryKnowledgeGraph:
    if backend == "neo4j":
        return Neo4jKnowledgeGraph(dictionary, kw.get("uri", ""), kw.get("user", ""), kw.get("password", ""))
    return InMemoryKnowledgeGraph(dictionary)


def relation_label(rel: Optional[Relation]) -> str:
    return {
        Relation.SAME: "동일 개념",
        Relation.NARROWER: "후보가 더 구체적인 하위 개념",
        Relation.BROADER: "후보가 더 일반적인 상위 개념(구체 물리량 미확인)",
        Relation.PART_OF: "구성요소 관계",
        Relation.HAS_PART: "구성요소 관계",
        Relation.RELATED: "관련 개념이나 서로 다른 개념",
        Relation.OPPOSITE: "상반 개념",
        Relation.NONE: "관계 없음",
    }.get(rel or Relation.NONE, "")
