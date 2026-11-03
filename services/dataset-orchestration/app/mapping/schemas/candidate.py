"""후보 검색·적합성 판단 스키마 (특허 6~7절)."""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field

from .requirement import Attr


class CheckStatus(str, Enum):
    MATCH = "match"                # 일치
    CONVERTIBLE = "convertible"    # 변환 가능
    MISMATCH = "mismatch"          # 불일치
    INSUFFICIENT = "insufficient"  # 정보 부족(미확인)
    NOT_APPLICABLE = "not_applicable"  # 요구조건에 해당 속성이 없음


class UnitCompatibility(str, Enum):
    MATCH = "unit_match"              # 단위 일치
    CONVERTIBLE = "convertible"       # 변환 가능
    INCOMPATIBLE = "incompatible"     # 변환 불가
    UNKNOWN = "unknown"               # 미확인


class CandidateCategory(str, Enum):
    """후보 분류 (특허: 일치 / 변환 가능 / 불일치 / 정보 부족)."""

    MATCH = "match"
    CONVERTIBLE = "convertible"
    MISMATCH = "mismatch"
    INSUFFICIENT = "insufficient"


class Tier(str, Enum):
    """추천 등급 — 정렬 우선순위."""

    RECOMMENDED = "recommended"           # 필수 조건 충족 (우선 추천 대상)
    NEEDS_REVIEW = "needs_review"         # 필수 조건 정보 부족 → 추가 확인 필요
    SUSPECTED_MISMATCH = "suspected_mismatch"  # 추정 정보 기준 불일치 → 확인 필요
    EXCLUDED = "excluded"                 # 확인된(명시) 필수 조건 불일치 → 우선 추천 제외


class UnitConversion(BaseModel):
    """단위 변환식: y = x * scale + offset"""

    source_unit: str
    target_unit: str
    quantity: str
    scale: float
    offset: float = 0.0

    @property
    def is_identity(self) -> bool:
        return self.scale == 1.0 and self.offset == 0.0

    @property
    def expression(self) -> str:
        s = f"{self.scale:g}"
        if self.offset:
            sign = "+" if self.offset > 0 else "-"
            return f"y = x * {s} {sign} {abs(self.offset):g}"
        return f"y = x * {s}"


class CheckResult(BaseModel):
    attribute: Attr
    required: bool
    status: CheckStatus
    confirmed: bool                       # 양측 정보가 모두 명시/파생/사용자보완인지
    requirement_value: Optional[Any] = None
    candidate_value: Optional[Any] = None
    requirement_status: Optional[str] = None
    candidate_status: Optional[str] = None
    message: str
    unit_compatibility: Optional[UnitCompatibility] = None
    conversion: Optional[UnitConversion] = None
    evidence: list[str] = Field(default_factory=list)


class CandidateEvaluation(BaseModel):
    column_name: str
    similarity: float                     # 임베딩 코사인 유사도
    similarity_rank: int                  # Top-K 내 유사도 순위 (1부터)
    checks: list[CheckResult]
    category: CandidateCategory
    tier: Tier
    score: float                          # 최종 정렬 점수
    rank: int = 0                         # 요구조건 검토 후 최종 순위
    unit_conversion: Optional[UnitConversion] = None
    dtype_cast: Optional[str] = None      # 필요한 자료형 변환 (예: integer→float)
    mismatches: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    explicit_facts: dict[str, Any] = Field(default_factory=dict)
    inferred_facts: dict[str, Any] = Field(default_factory=dict)
    needs_confirmation: list[str] = Field(default_factory=list)  # 사용자에게 요청할 확인/보완 항목
    summary: str = ""


class InputCandidates(BaseModel):
    input_id: str
    input_name: str
    top_k: int
    candidates: list[CandidateEvaluation]
    primary: Optional[str] = None          # 우선 추천 컬럼
    resolution: str                        # recommended / needs_user_input / no_candidate
    message: str = ""
