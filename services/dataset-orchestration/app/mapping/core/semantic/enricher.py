"""의미정보 처리부 (특허 5절): 모델 입력항목과 레거시 컬럼의 용어를 개념에 연결하고
정의·관계를 이용해 의미 표현을 보완한다.

정보 상태 부여 규칙
- semanticId 가 의미사전 external_id 와 정확히 일치          → EXPLICIT
- AAS 에 명시된 속성값(예: MeasurementLocation='구동측') 정규화 → EXPLICIT 유지
- AAS 명칭/정의, 레거시 컬럼 '설명문'의 용어 매칭            → DERIVED (명시 텍스트로부터 결정론적 도출)
- 명시 단위 → 물리량 (단위 레지스트리)                       → DERIVED
- 컬럼명/idShort 약어 해석, LLM 해석                         → INFERRED
- 실제 값의 범위·분포                                       → 속성 확정에 사용하지 않음(보조 hint)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.mapping.core import units
from app.mapping.schemas.common import Evidence, EvidenceSource, Fact, InfoStatus, merge_fact
from app.mapping.schemas.legacy import ColumnProfile, ConceptLink
from app.mapping.schemas.requirement import Attr, ModelInputRequirement, RequirementAttribute

from .dictionary import Concept, SemanticDictionary, TermMatch, tokenize
from .interpreter import RuleBasedInterpreter
from .knowledge_graph import InMemoryKnowledgeGraph, Relation

_RANK = {InfoStatus.UNKNOWN: 0, InfoStatus.INFERRED: 1, InfoStatus.DERIVED: 2, InfoStatus.EXPLICIT: 3, InfoStatus.USER_SUPPLIED: 4}

CATEGORY_ATTR = {
    "measurand": Attr.CONCEPT,
    "location": Attr.MEASUREMENT_LOCATION,
    "representation": Attr.VALUE_REPRESENTATION,
    "target": Attr.MEASUREMENT_TARGET,
}


@dataclass
class SemanticContext:
    dictionary: SemanticDictionary
    kg: InMemoryKnowledgeGraph
    interpreter: RuleBasedInterpreter


@dataclass
class _Link:
    concept: Concept
    term: str
    method: str
    status: InfoStatus
    source: EvidenceSource
    field: str
    confidence: Optional[float] = None

    def to_schema(self) -> ConceptLink:
        return ConceptLink(
            concept_id=self.concept.concept_id,
            category=self.concept.category,
            matched_term=self.term,
            method=self.method,
            status=self.status.value,
            source_field=self.field,
        )

    def fact(self, value=None) -> Fact:
        return Fact.of(
            value if value is not None else self.concept.concept_id,
            self.status,
            self.source,
            f"'{self.term}' → {self.concept.label} ({self.method}, {self.field})",
            ref=self.concept.concept_id,
            confidence=self.confidence if self.status == InfoStatus.INFERRED else None,
        )


# =========================================================================== 공통 로직
def _links_from_text(ctx: SemanticContext, text: Optional[str], status: InfoStatus, source: EvidenceSource, field: str) -> list[_Link]:
    if not text:
        return []
    return [_Link(m.concept, m.matched_term, m.method, status, source, field) for m in ctx.dictionary.match_text(text)]


def _links_from_name(ctx: SemanticContext, name: str, status: InfoStatus, source: EvidenceSource, field: str) -> list[_Link]:
    out = []
    for it in ctx.interpreter.interpret_name(name):
        c = ctx.dictionary.get(it.concept_id)
        if c:
            src = EvidenceSource.LLM if it.method == "llm" else source
            out.append(_Link(c, it.matched_term, it.method, status, src, field, it.confidence))
    return out


def _apply_compositions(ctx: SemanticContext, links: list[_Link]) -> list[_Link]:
    """같은 출처 그룹 내에서 조합 규칙 적용 (vibration + velocity → vibration_velocity)."""
    by_field: dict[str, list[_Link]] = {}
    for l in links:
        by_field.setdefault(l.field, []).append(l)
    added: list[_Link] = []
    for field, group in by_field.items():
        ids = {l.concept.concept_id for l in group}
        for result, parts in ctx.dictionary.compose(ids):
            c = ctx.dictionary.get(result)
            if not c:
                continue
            part_links = [l for l in group if l.concept.concept_id in parts]
            weakest = min(part_links, key=lambda l: _RANK[l.status])
            added.append(
                _Link(c, "+".join(l.term for l in part_links), "composition", weakest.status, weakest.source, field, weakest.confidence)
            )
    return links + added


def _pick(ctx: SemanticContext, links: list[_Link], category: str) -> Optional[_Link]:
    cands = [l for l in links if l.concept.category == category]
    if not cands:
        return None
    best_rank = max(_RANK[l.status] for l in cands)
    top = [l for l in cands if _RANK[l.status] == best_rank]
    # 가장 구체적인 개념 우선: 다른 후보의 상위개념(broader)인 것은 제외
    specific = [
        l for l in top
        if not any(ctx.kg.relation(o.concept.concept_id, l.concept.concept_id) == Relation.NARROWER for o in top if o is not l)
    ]
    return (specific or top)[0]


def _distinct_conflicts(links: list[_Link], category: str, chosen: Optional[_Link]) -> list[str]:
    if not chosen:
        return []
    others = {
        l.concept.concept_id
        for l in links
        if l.concept.category == category and _RANK[l.status] == _RANK[chosen.status] and l.concept.concept_id != chosen.concept.concept_id
    }
    return sorted(others)


def _normalize_explicit_value(ctx: SemanticContext, fact: Fact, category: str) -> Fact:
    """명시 속성값(자유 텍스트)을 개념 ID 로 정규화. 상태는 그대로 유지."""
    if not fact.known or not isinstance(fact.value, str):
        return fact
    if ctx.dictionary.get(fact.value):
        return fact
    m: Optional[TermMatch] = ctx.dictionary.lookup_term(fact.value)
    if m and m.concept.category == category:
        ev = fact.evidence + [
            Evidence(source=EvidenceSource.SEMANTIC_DICTIONARY, detail=f"'{fact.value}' → {m.concept.label}", ref=m.concept.concept_id)
        ]
        return fact.model_copy(update={"value": m.concept.concept_id, "evidence": ev})
    return fact.model_copy(update={"value": fact.value.strip().lower()})


def _normalize_quantity(ctx: SemanticContext, fact: Fact) -> Fact:
    if not fact.known or not isinstance(fact.value, str):
        return fact
    raw = fact.value.strip()
    m = ctx.dictionary.lookup_term(raw)
    if m and m.concept.quantity:
        return fact.model_copy(update={"value": m.concept.quantity})
    return fact.model_copy(update={"value": raw.lower().replace(" ", "_")})


def _normalize_unit_fact(fact: Fact, notes: list[str]) -> Fact:
    if not fact.known:
        return fact
    norm = units.normalize_unit(str(fact.value))
    if norm:
        return fact.model_copy(update={"value": norm})
    notes.append(f"단위 '{fact.value}' 를 단위 레지스트리에서 인식하지 못함 → 변환 판단 시 미확인 처리")
    return fact


def _resolve(ctx: SemanticContext, attrs: dict[Attr, Fact], links: list[_Link], notes: list[str]) -> dict[Attr, Fact]:
    links = _apply_compositions(ctx, links)

    # 1) 명시 속성값 정규화
    for cat, key in CATEGORY_ATTR.items():
        if key in attrs and key != Attr.CONCEPT:
            attrs[key] = _normalize_explicit_value(ctx, attrs[key], cat)
    if Attr.QUANTITY in attrs:
        attrs[Attr.QUANTITY] = _normalize_quantity(ctx, attrs[Attr.QUANTITY])
    if Attr.UNIT in attrs:
        attrs[Attr.UNIT] = _normalize_unit_fact(attrs[Attr.UNIT], notes)

    # 2) 개념 링크 → 속성
    for cat, key in CATEGORY_ATTR.items():
        chosen = _pick(ctx, links, cat)
        if not chosen:
            continue
        merged = merge_fact(attrs.get(key, Fact()), chosen.fact())
        conflicts = _distinct_conflicts(links, cat, chosen)
        if conflicts and cat != "measurand" and merged.value == chosen.concept.concept_id:
            notes.append(f"{key.value}: 동일 근거 수준의 다른 후보 {conflicts} 존재 → '{chosen.concept.concept_id}' 채택, 확인 권장")
        attrs[key] = merged

    # 3) 물리량: 단위(명시) → 물리량 (DERIVED)
    unit_fact = attrs.get(Attr.UNIT, Fact())
    if unit_fact.known:
        q = units.quantity_of(str(unit_fact.value))
        if q:
            st = InfoStatus.USER_SUPPLIED if unit_fact.status == InfoStatus.USER_SUPPLIED else (
                InfoStatus.DERIVED if unit_fact.status.is_confirmed else InfoStatus.INFERRED
            )
            attrs[Attr.QUANTITY] = merge_fact(
                attrs.get(Attr.QUANTITY, Fact()),
                Fact.of(q, st, EvidenceSource.UNIT_REGISTRY, f"단위 {unit_fact.value} 의 물리량", ref=str(unit_fact.value)),
            )

    # 4) 물리량: 개념 → 물리량 / 물리량 단어(qw_*)
    concept_fact = attrs.get(Attr.CONCEPT, Fact())
    concept = ctx.dictionary.get(concept_fact.value) if concept_fact.known else None
    if concept and concept.quantity:
        attrs[Attr.QUANTITY] = merge_fact(
            attrs.get(Attr.QUANTITY, Fact()),
            Fact(value=concept.quantity, status=concept_fact.status, confidence=concept_fact.confidence,
                 evidence=[Evidence(source=EvidenceSource.KNOWLEDGE_GRAPH, detail=f"{concept.label} measures {concept.quantity}", ref=concept.concept_id)]),
        )
    qw = _pick(ctx, links, "quantity_word")
    if qw and qw.concept.quantity:
        attrs[Attr.QUANTITY] = merge_fact(attrs.get(Attr.QUANTITY, Fact()), qw.fact(qw.concept.quantity))

    # 5) 개념-물리량 정합: 일반 개념(vibration) + 확정 물리량 → 하위 개념으로 구체화,
    #    추정 개념이 확정 물리량과 상충하면 상위 개념으로 되돌림
    q_fact = attrs.get(Attr.QUANTITY, Fact())
    concept_fact = attrs.get(Attr.CONCEPT, Fact())
    concept = ctx.dictionary.get(concept_fact.value) if concept_fact.known else None
    if concept and q_fact.known:
        if concept.quantity and concept.quantity != q_fact.value and _RANK[q_fact.status] > _RANK[concept_fact.status]:
            parents = [o for p, o in ctx.kg.neighbors(concept.concept_id) if p == "broader"]
            notes.append(
                f"추정 개념 '{concept.concept_id}'({concept.quantity}) 가 확인된 물리량 '{q_fact.value}' 와 상충 → 개념 재해석"
            )
            concept = ctx.dictionary.get(parents[0]) if parents else None
            attrs[Attr.CONCEPT] = (
                Fact(value=concept.concept_id, status=InfoStatus.INFERRED,
                     evidence=concept_fact.evidence + [Evidence(source=EvidenceSource.KNOWLEDGE_GRAPH, detail="상위 개념으로 일반화")])
                if concept else Fact.unknown("개념-물리량 상충")
            )
            concept_fact = attrs[Attr.CONCEPT]
        if concept and not concept.quantity:
            narrower = [n for n in ctx.kg.narrower_of(concept.concept_id) if (ctx.dictionary.get(n) or Concept(n, "")).quantity == q_fact.value]
            if len(narrower) == 1:
                weakest = min((concept_fact, q_fact), key=lambda f: _RANK[f.status])
                attrs[Attr.CONCEPT] = Fact(
                    value=narrower[0], status=weakest.status, confidence=weakest.confidence,
                    evidence=concept_fact.evidence + [Evidence(
                        source=EvidenceSource.KNOWLEDGE_GRAPH,
                        detail=f"일반 개념 '{concept.concept_id}' + 물리량 '{q_fact.value}' → '{narrower[0]}'",
                        ref=narrower[0],
                    )],
                )
    return attrs


def _semantic_text(ctx: SemanticContext, name: str, extra_texts: list[str], attrs: dict[Attr, Fact]) -> str:
    parts: list[str] = [" ".join(ctx.dictionary.expand_token(t) for t in tokenize(name))]
    parts += [t for t in extra_texts if t]
    for key in (Attr.CONCEPT, Attr.MEASUREMENT_TARGET, Attr.MEASUREMENT_LOCATION, Attr.VALUE_REPRESENTATION):
        f = attrs.get(key)
        if f and f.known:
            c = ctx.dictionary.get(str(f.value))
            if c:
                parts.append(" ".join(c.all_names()[:4]))
            else:
                parts.append(str(f.value))
    q = attrs.get(Attr.QUANTITY)
    if q and q.known:
        parts.append(str(q.value).replace("_", " "))
    u = attrs.get(Attr.UNIT)
    if u and u.known:
        parts.append(units.unit_display_name(str(u.value)) or str(u.value))
    return " | ".join(p for p in parts if p)


# =========================================================================== 요구조건
def enrich_requirement(ctx: SemanticContext, req: ModelInputRequirement, notes: list[str]) -> ModelInputRequirement:
    links: list[_Link] = []
    c = ctx.dictionary.by_semantic_id(req.semantic_id)
    if c:
        links.append(_Link(c, req.semantic_id or "", "semantic_id", InfoStatus.EXPLICIT, EvidenceSource.SEMANTIC_DICTIONARY, "semantic_id"))
    links += _links_from_text(ctx, req.display_name, InfoStatus.DERIVED, EvidenceSource.AAS_CONCEPT_DESCRIPTION, "preferred_name")
    links += _links_from_text(ctx, req.definition, InfoStatus.DERIVED, EvidenceSource.AAS_PROPERTY, "definition")
    links += _links_from_name(ctx, req.name, InfoStatus.INFERRED, EvidenceSource.COLUMN_NAME, "name")
    if req.id_short != req.name:
        links += _links_from_name(ctx, req.id_short, InfoStatus.INFERRED, EvidenceSource.COLUMN_NAME, "id_short")

    plain: dict[Attr, Fact] = {k: Fact(**v.model_dump(exclude={"required", "required_reason"})) for k, v in req.attributes.items()}
    resolved = _resolve(ctx, plain, links, notes)
    new_attrs: dict[Attr, RequirementAttribute] = {}
    for k, f in resolved.items():
        old = req.attributes.get(k)
        new_attrs[k] = RequirementAttribute(
            **f.model_dump(),
            required=old.required if old else False,
            required_reason=old.required_reason if old else None,
        )
    syn = []
    concept = ctx.dictionary.get(resolved.get(Attr.CONCEPT, Fact()).value) if resolved.get(Attr.CONCEPT) else None
    if concept:
        syn = concept.all_names()
    req = req.model_copy(update={"attributes": new_attrs, "synonyms": list(dict.fromkeys(req.synonyms + syn))})
    req.semantic_text = _semantic_text(ctx, req.name, [req.display_name or "", req.definition or ""], resolved)
    return req


# =========================================================================== 레거시 컬럼
def enrich_column(ctx: SemanticContext, col: ColumnProfile) -> ColumnProfile:
    notes = list(col.notes)
    attrs = dict(col.attributes)
    links: list[_Link] = []
    links += _links_from_text(ctx, col.description, InfoStatus.DERIVED, EvidenceSource.SOURCE_DESCRIPTION, "description")
    links += _links_from_name(ctx, col.column_name, InfoStatus.INFERRED, EvidenceSource.COLUMN_NAME, "column_name")
    attrs = _resolve(ctx, attrs, links, notes)
    all_links = _apply_compositions(ctx, links)
    col = col.model_copy(update={
        "attributes": attrs,
        "concept_links": [l.to_schema() for l in all_links],
        "tokens": tokenize(col.column_name),
        "notes": list(dict.fromkeys(notes)),
    })
    col.semantic_text = _semantic_text(ctx, col.column_name, [col.description or ""], attrs)
    return col
