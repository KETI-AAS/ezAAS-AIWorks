"""공통 스키마: 정보 상태(명시/파생/추정/미확인)와 근거(Evidence).

특허 [종래기술 차이점 2] "원천에 명시된 정보와 LLM 등의 분석으로 추정한 정보를 구분하고,
각 정보의 근거를 연결한다" 를 코드 수준에서 보장하기 위해 모든 속성값은 `Fact` 로 표현한다.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class InfoStatus(str, Enum):
    """속성값의 확보 상태."""

    EXPLICIT = "explicit"          # 원천(AAS 속성, CD, 레거시 메타데이터)에 구조적으로 명시됨
    DERIVED = "derived"            # 명시 정보로부터 결정론적으로 도출 (예: 명시 단위 mm/s → 물리량 velocity)
    USER_SUPPLIED = "user_supplied"  # 사용자가 확인 단계에서 보완
    INFERRED = "inferred"          # 컬럼명 약어 해석·LLM·데이터 특성 등으로 추정
    UNKNOWN = "unknown"            # 근거 없음 → 미확인

    @property
    def is_confirmed(self) -> bool:
        """판단 근거로 '확정적으로' 사용할 수 있는 상태인지."""
        return self in (InfoStatus.EXPLICIT, InfoStatus.DERIVED, InfoStatus.USER_SUPPLIED)


class EvidenceSource(str, Enum):
    AAS_PROPERTY = "aas_property"                    # AI Model Nameplate 입력 파라미터의 속성
    AAS_CONCEPT_DESCRIPTION = "aas_concept_description"  # semanticId → Concept Description(IEC 61360)
    SEMANTIC_DICTIONARY = "semantic_dictionary"      # 의미사전(ECLASS/IEC CDD/CD 기반) 조회
    KNOWLEDGE_GRAPH = "knowledge_graph"              # 지식그래프 관계
    SOURCE_METADATA = "source_metadata"              # 레거시 데이터에 제공된 메타데이터(단위·설명 등)
    SOURCE_DESCRIPTION = "source_description"        # 레거시 컬럼 설명문의 용어 매칭
    COLUMN_NAME = "column_name"                      # 컬럼명 문자열/약어 해석
    LLM = "llm"                                      # LLM 해석
    DATA_PROFILE = "data_profile"                    # 실제 값의 특성(자료형, 범위 등)
    UNIT_REGISTRY = "unit_registry"                  # 단위 레지스트리로부터 물리량 도출
    USER = "user"                                    # 사용자 보완
    SYSTEM_POLICY = "system_policy"                  # 시스템 기본 정책


class Evidence(BaseModel):
    source: EvidenceSource
    detail: str
    ref: Optional[str] = None  # AAS 경로, 개념 ID, 컬럼명 등


class Fact(BaseModel):
    """값 + 상태 + 근거."""

    value: Optional[Any] = None
    status: InfoStatus = InfoStatus.UNKNOWN
    evidence: list[Evidence] = Field(default_factory=list)
    confidence: Optional[float] = None  # 추정값의 신뢰도(0~1), 명시값은 None

    @property
    def known(self) -> bool:
        return self.status != InfoStatus.UNKNOWN and self.value not in (None, "")

    @classmethod
    def unknown(cls, reason: str | None = None) -> "Fact":
        ev = [Evidence(source=EvidenceSource.SYSTEM_POLICY, detail=reason)] if reason else []
        return cls(value=None, status=InfoStatus.UNKNOWN, evidence=ev)

    @classmethod
    def of(
        cls,
        value: Any,
        status: InfoStatus,
        source: EvidenceSource,
        detail: str,
        ref: str | None = None,
        confidence: float | None = None,
    ) -> "Fact":
        return cls(
            value=value,
            status=status,
            evidence=[Evidence(source=source, detail=detail, ref=ref)],
            confidence=confidence,
        )


# 상태 우선순위: 높은 쪽이 기존 값을 덮어쓴다.
_STATUS_RANK = {
    InfoStatus.UNKNOWN: 0,
    InfoStatus.INFERRED: 1,
    InfoStatus.DERIVED: 2,
    InfoStatus.EXPLICIT: 3,
    InfoStatus.USER_SUPPLIED: 4,
}


def merge_fact(current: Fact, new: Fact) -> Fact:
    """더 확실한 근거를 가진 값을 채택한다. 같은 등급이면 기존값 유지 + 근거 누적.

    추정값이 명시값을 덮어쓰지 못하도록 하는 것이 핵심(불확실한 추정이 확정 사실처럼
    반영되는 문제 방지).
    """
    if not new.known:
        return current
    if not current.known or _STATUS_RANK[new.status] > _STATUS_RANK[current.status]:
        return new
    if _STATUS_RANK[new.status] == _STATUS_RANK[current.status]:
        if str(new.value).lower() == str(current.value).lower():
            return current.model_copy(update={"evidence": current.evidence + new.evidence})
        # 같은 등급에서 상충 → 기존 값 유지, 충돌 근거만 기록
        conflict = Evidence(
            source=EvidenceSource.SYSTEM_POLICY,
            detail=f"동일 등급의 상충 값 '{new.value}' 이(가) 있어 기존 값 '{current.value}' 를 유지",
        )
        return current.model_copy(update={"evidence": current.evidence + new.evidence + [conflict]})
    return current
