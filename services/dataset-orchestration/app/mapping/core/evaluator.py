"""후보 적합성 판단부 (특허 7절).

Top-K 후보별로 모델 입력 요구조건과 원천 컬럼 정보를 비교한다.
  7.1 의미·물리량 검토  — 관련 개념이어도 물리량이 다르면 불일치. 정보가 없으면 '정보 부족'.
  7.2 단위 호환성 검토  — 단위 일치 / 변환 가능 / 변환 불가 / 미확인
  7.3 우선 추천 결정    — 필수 조건의 '확인된(명시)' 불일치 → 우선 추천 제외,
                          나머지는 단위 호환성·의미 유사도로 정렬, 정보 부족은 추가 확인 표시.
                          필수 조건을 충족하는 후보가 없으면 강제 매핑하지 않는다.
"""
from __future__ import annotations

from typing import Optional

from app.mapping.core import units
from app.mapping.core.retriever import RetrievedCandidate
from app.mapping.core.semantic import InMemoryKnowledgeGraph, Relation, SemanticDictionary
from app.mapping.core.semantic.knowledge_graph import relation_label
from app.mapping.schemas.candidate import (
    CandidateCategory,
    CandidateEvaluation,
    CheckResult,
    CheckStatus,
    InputCandidates,
    Tier,
    UnitCompatibility,
)
from app.mapping.schemas.common import Fact, InfoStatus
from app.mapping.schemas.legacy import ColumnProfile
from app.mapping.schemas.requirement import Attr, ModelInputRequirement, RequirementAttribute

ATTR_LABEL_KO = {
    Attr.CONCEPT: "의미(개념)",
    Attr.QUANTITY: "물리량",
    Attr.UNIT: "단위",
    Attr.DATA_TYPE: "자료형",
    Attr.MEASUREMENT_TARGET: "측정 대상",
    Attr.MEASUREMENT_LOCATION: "측정 위치",
    Attr.VALUE_REPRESENTATION: "값의 표현 방식",
    Attr.TIME_CONDITION: "시간 조건",
}

_CHECK_WEIGHT = {
    CheckStatus.MATCH: 1.0,
    CheckStatus.CONVERTIBLE: 0.9,
    CheckStatus.INSUFFICIENT: 0.5,
    CheckStatus.MISMATCH: 0.0,
}
_TIER_ORDER = {Tier.RECOMMENDED: 0, Tier.NEEDS_REVIEW: 1, Tier.SUSPECTED_MISMATCH: 2, Tier.EXCLUDED: 3}


class Evaluator:
    def __init__(self, dictionary: SemanticDictionary, kg: InMemoryKnowledgeGraph, allow_numeric_string_cast: bool = True):
        self.dictionary = dictionary
        self.kg = kg
        self.allow_numeric_string_cast = allow_numeric_string_cast

    # ------------------------------------------------------------------ 표시
    def _label(self, v) -> Optional[str]:
        if v is None:
            return None
        c = self.dictionary.get(str(v))
        return f"{c.label}" if c else str(v)

    def _result(self, attr: Attr, ra: RequirementAttribute, cf: Fact, status: CheckStatus, message: str, **kw) -> CheckResult:
        confirmed = bool(ra.known and cf.known and ra.status.is_confirmed and cf.status.is_confirmed)
        ev = [e.detail for e in (cf.evidence or [])][:3]
        return CheckResult(
            attribute=attr,
            required=ra.required,
            status=status,
            confirmed=confirmed,
            requirement_value=ra.value,
            candidate_value=cf.value,
            requirement_status=ra.status.value if ra.known else None,
            candidate_status=cf.status.value if cf.known else InfoStatus.UNKNOWN.value,
            message=message,
            evidence=ev,
            **kw,
        )

    # ------------------------------------------------------------------ 7.1 의미/물리량
    def check_concept(self, req: ModelInputRequirement, col: ColumnProfile) -> CheckResult:
        ra, cf = req.attr(Attr.CONCEPT), col.attr(Attr.CONCEPT)
        if not ra.known:
            return self._result(Attr.CONCEPT, ra, cf, CheckStatus.NOT_APPLICABLE, "요구 개념 정보 없음")
        if not cf.known:
            return self._result(Attr.CONCEPT, ra, cf, CheckStatus.INSUFFICIENT, "후보 컬럼의 의미(개념)를 확인할 수 없음")
        rel = self.kg.relation(str(cf.value), str(ra.value))
        rl, cl = self._label(ra.value), self._label(cf.value)
        if rel in (Relation.SAME, Relation.NARROWER):
            return self._result(Attr.CONCEPT, ra, cf, CheckStatus.MATCH, f"개념 일치: {cl} ({relation_label(rel)})")
        if rel == Relation.BROADER:
            return self._result(Attr.CONCEPT, ra, cf, CheckStatus.INSUFFICIENT,
                                f"후보 개념 '{cl}' 이(가) 요구 개념 '{rl}' 보다 일반적 — 구체 물리량 확인 필요")
        return self._result(Attr.CONCEPT, ra, cf, CheckStatus.MISMATCH, f"개념 불일치: 요구 '{rl}' ↔ 후보 '{cl}' ({relation_label(rel)})")

    def check_quantity(self, req: ModelInputRequirement, col: ColumnProfile) -> CheckResult:
        ra, cf = req.attr(Attr.QUANTITY), col.attr(Attr.QUANTITY)
        if not ra.known:
            return self._result(Attr.QUANTITY, ra, cf, CheckStatus.NOT_APPLICABLE, "요구 물리량 정보 없음")
        if not cf.known:
            return self._result(Attr.QUANTITY, ra, cf, CheckStatus.INSUFFICIENT, "후보 컬럼의 물리량 미확인")
        if str(ra.value) == str(cf.value):
            return self._result(Attr.QUANTITY, ra, cf, CheckStatus.MATCH, f"물리량 일치 ({ra.value})")
        return self._result(Attr.QUANTITY, ra, cf, CheckStatus.MISMATCH, f"물리량 불일치: 요구 {ra.value} ↔ 후보 {cf.value}")

    # ------------------------------------------------------------------ 7.2 단위
    def check_unit(self, req: ModelInputRequirement, col: ColumnProfile) -> CheckResult:
        ra, cf = req.attr(Attr.UNIT), col.attr(Attr.UNIT)
        if not ra.known:
            return self._result(Attr.UNIT, ra, cf, CheckStatus.NOT_APPLICABLE, "요구 단위 정보 없음",
                                unit_compatibility=UnitCompatibility.UNKNOWN)
        compat, conv, msg = units.check_unit_compatibility(cf.value if cf.known else None, str(ra.value))
        status = {
            UnitCompatibility.MATCH: CheckStatus.MATCH,
            UnitCompatibility.CONVERTIBLE: CheckStatus.CONVERTIBLE,
            UnitCompatibility.INCOMPATIBLE: CheckStatus.MISMATCH,
            UnitCompatibility.UNKNOWN: CheckStatus.INSUFFICIENT,
        }[compat]
        return self._result(Attr.UNIT, ra, cf, status, msg, unit_compatibility=compat, conversion=conv)

    # ------------------------------------------------------------------ 자료형
    def check_dtype(self, req: ModelInputRequirement, col: ColumnProfile) -> tuple[CheckResult, Optional[str]]:
        ra, cf = req.attr(Attr.DATA_TYPE), col.attr(Attr.DATA_TYPE)
        if not ra.known:
            return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.NOT_APPLICABLE, "요구 자료형 정보 없음"), None
        if not cf.known:
            return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.INSUFFICIENT, "후보 컬럼 자료형 미확인(값 없음)"), None
        want, have = str(ra.value), str(cf.value)
        prof = col.profile
        numeric_str = prof.inferred_dtype == "numeric_string"
        if want == have and not numeric_str:
            return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.MATCH, f"자료형 일치 ({want})"), None
        if want == "float":
            if have == "integer":
                return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.CONVERTIBLE, "정수 → 실수 변환"), "integer→float"
            if numeric_str and self.allow_numeric_string_cast:
                return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.CONVERTIBLE, "숫자 문자열 → 실수 변환"), "string→float"
        if want == "integer":
            if have == "float":
                return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.CONVERTIBLE, "실수 → 정수 변환(소수부 확인 필요)"), "float→integer"
            if numeric_str and self.allow_numeric_string_cast:
                return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.CONVERTIBLE, "숫자 문자열 → 정수 변환"), "string→integer"
        if want == "boolean" and have == "integer" and prof.unique_count <= 2:
            return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.CONVERTIBLE, "0/1 정수 → 불리언 변환"), "integer→boolean"
        if want == "string":
            return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.CONVERTIBLE, f"{have} → 문자열 변환"), f"{have}→string"
        return self._result(Attr.DATA_TYPE, ra, cf, CheckStatus.MISMATCH, f"자료형 불일치: 요구 {want} ↔ 후보 {have}"), None

    # ------------------------------------------------------------------ 측정 대상/위치/표현방식
    def check_categorical(self, attr: Attr, req: ModelInputRequirement, col: ColumnProfile) -> CheckResult:
        ra, cf = req.attr(attr), col.attr(attr)
        name = ATTR_LABEL_KO[attr]
        if not ra.known:
            return self._result(attr, ra, cf, CheckStatus.NOT_APPLICABLE, f"요구 {name} 정보 없음")
        if not cf.known:
            return self._result(attr, ra, cf, CheckStatus.INSUFFICIENT, f"후보 컬럼의 {name} 미확인")
        rv, cv = str(ra.value), str(cf.value)
        rl, cl = self._label(rv), self._label(cv)
        if rv == cv:
            return self._result(attr, ra, cf, CheckStatus.MATCH, f"{name} 일치 ({rl})")
        if self.dictionary.get(rv) and self.dictionary.get(cv):
            rel = self.kg.relation(cv, rv)
            if rel in (Relation.SAME, Relation.NARROWER, Relation.PART_OF):
                return self._result(attr, ra, cf, CheckStatus.MATCH, f"{name} 대응: {cl} ⊂ {rl} ({relation_label(rel)})")
            if rel in (Relation.BROADER, Relation.HAS_PART):
                return self._result(attr, ra, cf, CheckStatus.INSUFFICIENT, f"후보 {name} '{cl}' 이(가) 요구 '{rl}' 보다 포괄적 — 확인 필요")
            return self._result(attr, ra, cf, CheckStatus.MISMATCH, f"{name} 불일치: 요구 '{rl}' ↔ 후보 '{cl}' ({relation_label(rel)})")
        return self._result(attr, ra, cf, CheckStatus.MISMATCH, f"{name} 불일치: 요구 '{rl}' ↔ 후보 '{cl}'")

    def check_time(self, req: ModelInputRequirement, col: ColumnProfile) -> CheckResult:
        ra, cf = req.attr(Attr.TIME_CONDITION), col.attr(Attr.TIME_CONDITION)
        if not ra.known:
            return self._result(Attr.TIME_CONDITION, ra, cf, CheckStatus.NOT_APPLICABLE, "요구 시간 조건 없음")
        if not cf.known:
            return self._result(Attr.TIME_CONDITION, ra, cf, CheckStatus.INSUFFICIENT, "후보 컬럼의 시간 조건(샘플링 등) 미확인")
        status = CheckStatus.MATCH if str(ra.value).lower() == str(cf.value).lower() else CheckStatus.MISMATCH
        return self._result(Attr.TIME_CONDITION, ra, cf, status, f"시간 조건 {'일치' if status == CheckStatus.MATCH else '불일치'}")

    # ------------------------------------------------------------------ 종합
    def evaluate(self, req: ModelInputRequirement, col: ColumnProfile, similarity: float, sim_rank: int = 0) -> CandidateEvaluation:
        dtype_check, cast = self.check_dtype(req, col)
        checks = [
            self.check_concept(req, col),
            self.check_quantity(req, col),
            self.check_unit(req, col),
            dtype_check,
            self.check_categorical(Attr.MEASUREMENT_TARGET, req, col),
            self.check_categorical(Attr.MEASUREMENT_LOCATION, req, col),
            self.check_categorical(Attr.VALUE_REPRESENTATION, req, col),
            self.check_time(req, col),
        ]
        req_checks = [c for c in checks if c.required and c.status != CheckStatus.NOT_APPLICABLE]
        opt_checks = [c for c in checks if not c.required and c.status != CheckStatus.NOT_APPLICABLE]

        confirmed_mm = [c for c in req_checks if c.status == CheckStatus.MISMATCH and c.confirmed]
        suspected_mm = [c for c in req_checks if c.status == CheckStatus.MISMATCH and not c.confirmed]
        insufficient = [c for c in req_checks if c.status == CheckStatus.INSUFFICIENT]
        convertible = [c for c in req_checks if c.status == CheckStatus.CONVERTIBLE]

        if confirmed_mm:
            tier = Tier.EXCLUDED
        elif suspected_mm:
            tier = Tier.SUSPECTED_MISMATCH
        elif insufficient:
            tier = Tier.NEEDS_REVIEW
        else:
            tier = Tier.RECOMMENDED

        if confirmed_mm or suspected_mm:
            category = CandidateCategory.MISMATCH
        elif insufficient:
            category = CandidateCategory.INSUFFICIENT
        elif convertible:
            category = CandidateCategory.CONVERTIBLE
        else:
            category = CandidateCategory.MATCH

        check_score = (sum(_CHECK_WEIGHT[c.status] for c in req_checks) / len(req_checks)) if req_checks else 0.5
        opt_penalty = 0.05 * sum(1 for c in opt_checks if c.status == CheckStatus.MISMATCH)
        score = round(0.4 * max(similarity, 0.0) + 0.6 * check_score - opt_penalty, 4)

        unit_check = next(c for c in checks if c.attribute == Attr.UNIT)
        conversion = unit_check.conversion if unit_check.status in (CheckStatus.MATCH, CheckStatus.CONVERTIBLE) else None

        mismatches = [f"{ATTR_LABEL_KO[c.attribute]}: {c.message}" + ("" if c.confirmed else " (추정 정보 기준)")
                      for c in checks if c.status == CheckStatus.MISMATCH]
        unknowns = [ATTR_LABEL_KO[c.attribute] for c in checks if c.status == CheckStatus.INSUFFICIENT]

        needs = []
        for c in req_checks:
            if c.status == CheckStatus.INSUFFICIENT:
                needs.append(f"{ATTR_LABEL_KO[c.attribute]} 정보 보완 필요")
            elif c.status in (CheckStatus.MATCH, CheckStatus.CONVERTIBLE) and not c.confirmed:
                needs.append(f"{ATTR_LABEL_KO[c.attribute]} 판단이 추정 정보(컬럼명·LLM)에 근거 — 확인 권장")
            elif c.status == CheckStatus.MISMATCH and not c.confirmed:
                needs.append(f"{ATTR_LABEL_KO[c.attribute]} 불일치가 추정 정보에 근거 — 실제 정보 확인 필요")
        needs += self._value_condition_notes(req, col, conversion)

        explicit, inferred = {}, {}
        for k, f in col.attributes.items():
            if not f.known:
                continue
            (explicit if f.status.is_confirmed else inferred)[k.value] = f.value

        summary = self._summary(tier, category, mismatches, unknowns, conversion, cast)
        return CandidateEvaluation(
            column_name=col.column_name,
            similarity=similarity,
            similarity_rank=sim_rank,
            checks=checks,
            category=category,
            tier=tier,
            score=score,
            unit_conversion=conversion,
            dtype_cast=cast,
            mismatches=mismatches,
            unknowns=unknowns,
            explicit_facts=explicit,
            inferred_facts=inferred,
            needs_confirmation=needs,
            summary=summary,
        )

    def _value_condition_notes(self, req: ModelInputRequirement, col: ColumnProfile, conv) -> list[str]:
        vc = req.value_condition
        p = col.profile
        if not vc or p.min is None or p.max is None:
            return []
        lo, hi = p.min, p.max
        if conv:
            lo, hi = sorted((lo * conv.scale + conv.offset, hi * conv.scale + conv.offset))
        out = []
        if vc.min is not None and lo < vc.min:
            out.append(f"변환 후 최소값 {lo:g} 이(가) 요구 하한 {vc.min:g} 미만 (품질 확인)")
        if vc.max is not None and hi > vc.max:
            out.append(f"변환 후 최대값 {hi:g} 이(가) 요구 상한 {vc.max:g} 초과 (품질 확인)")
        return out

    @staticmethod
    def _summary(tier, category, mismatches, unknowns, conv, cast) -> str:
        if tier == Tier.EXCLUDED:
            return "확인된 필수 조건 불일치로 우선 추천에서 제외: " + "; ".join(mismatches)
        if tier == Tier.SUSPECTED_MISMATCH:
            return "추정 정보 기준 불일치 — 확인 필요: " + "; ".join(mismatches)
        if tier == Tier.NEEDS_REVIEW:
            return "정보 부족 — 추가 확인 필요: " + ", ".join(unknowns)
        parts = ["필수 조건 충족"]
        if conv and not conv.is_identity:
            parts.append(f"단위 변환 {conv.source_unit}→{conv.target_unit} ({conv.expression})")
        if cast:
            parts.append(f"자료형 변환 {cast}")
        return ", ".join(parts)

    # ------------------------------------------------------------------ 7.3 순위 결정
    def rank_candidates(self, req: ModelInputRequirement, retrieved: list[RetrievedCandidate], top_k: int) -> InputCandidates:
        evals = [self.evaluate(req, rc.column, rc.similarity, rc.rank) for rc in retrieved]
        return self.finalize(req, evals, top_k)

    def finalize(self, req: ModelInputRequirement, evals: list[CandidateEvaluation], top_k: int) -> InputCandidates:
        evals.sort(key=lambda e: (_TIER_ORDER[e.tier], -e.score, -e.similarity))
        for i, e in enumerate(evals, 1):
            e.rank = i
        primary = next((e for e in evals if e.tier == Tier.RECOMMENDED), None)
        if primary:
            resolution, msg = "recommended", f"우선 추천: {primary.column_name} — {primary.summary}"
        elif evals:
            resolution = "needs_user_input"
            msg = "필수 조건을 충족한다고 판단할 수 있는 후보가 없어 강제 매핑하지 않음 — 정보 보완 또는 직접 선택 필요"
        else:
            resolution, msg = "no_candidate", "검색된 후보 없음"
        return InputCandidates(
            input_id=req.input_id,
            input_name=req.name,
            top_k=top_k,
            candidates=evals,
            primary=primary.column_name if primary else None,
            resolution=resolution,
            message=msg,
        )
