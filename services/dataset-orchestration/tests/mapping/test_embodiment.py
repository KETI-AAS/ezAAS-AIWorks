"""특허 12절 실시예 재현.

모델: 구동측 베어링 진동속도 RMS, mm/s, 실수
  Vib_DE_RMS  (구동측 진동속도 RMS, m/s)   → 우선 추천, ×1000 변환
  Acc_DE_RMS  (구동측 진동가속도 RMS, m/s²) → 물리량 불일치 (부적합)
  Vib_NDE_RMS (반대측 진동속도 RMS, mm/s)  → 측정 위치 불일치
  Vib_01      (단위·위치 미확인)            → 정보 부족, 추가 확인 항목 제공
"""
import pandas as pd
import pytest

from app.mapping.schemas.build import GenerateRequest
from app.mapping.schemas.candidate import CandidateCategory, CheckStatus, Tier
from app.mapping.schemas.mapping import DecisionRequest, DecisionType, UserDecision
from app.mapping.schemas.requirement import Attr


def _cands(build, input_id="in_01"):
    return {c.column_name: c for c in build.candidates[input_id].candidates}


def test_requirement_from_aas(service, aas_env):
    rs = service.parse_requirements(aas_env)
    r = rs.inputs[0]
    assert r.name == "DE_Bearing_VibVelocity_RMS"
    assert r.attr(Attr.UNIT).value == "mm/s"                 # Concept Description unit
    assert r.attr(Attr.QUANTITY).value == "velocity"
    assert r.attr(Attr.MEASUREMENT_LOCATION).value == "drive_end"
    assert r.attr(Attr.VALUE_REPRESENTATION).value == "rms"
    assert r.attr(Attr.DATA_TYPE).value == "float"
    assert r.attr(Attr.MEASUREMENT_TARGET).value == "motor_bearing"
    assert not r.attr(Attr.TIME_CONDITION).known                # 확인되지 않은 항목은 미확인
    assert rs.inputs[3].is_required_input is False


def test_embodiment_verdicts(build):
    ic = build.candidates["in_01"]
    c = _cands(build)
    assert ic.primary == "Vib_DE_RMS"

    v = c["Vib_DE_RMS"]
    assert v.tier == Tier.RECOMMENDED and v.category == CandidateCategory.CONVERTIBLE
    assert v.unit_conversion.scale == pytest.approx(1000.0)

    a = c["Acc_DE_RMS"]
    assert a.tier == Tier.EXCLUDED
    q = next(x for x in a.checks if x.attribute == Attr.QUANTITY)
    assert q.status == CheckStatus.MISMATCH and q.confirmed

    n = c["Vib_NDE_RMS"]
    assert n.tier == Tier.EXCLUDED
    loc = next(x for x in n.checks if x.attribute == Attr.MEASUREMENT_LOCATION)
    assert loc.status == CheckStatus.MISMATCH
    # 물리량·단위는 일치 — 위치 때문에만 제외됨
    assert next(x for x in n.checks if x.attribute == Attr.QUANTITY).status == CheckStatus.MATCH

    u = c["Vib_01"]
    assert u.tier == Tier.NEEDS_REVIEW and u.category == CandidateCategory.INSUFFICIENT
    assert "단위" in u.unknowns and "측정 위치" in u.unknowns
    assert u.needs_confirmation

    # 정보 부족 후보가 확인된 불일치 후보보다 앞에 정렬
    order = [x.column_name for x in ic.candidates]
    assert order.index("Vib_01") < order.index("Vib_NDE_RMS")


def test_explicit_vs_inferred_separated(build):
    v = _cands(build)["Vib_DE_RMS"]
    assert v.explicit_facts["unit"] == "m/s"
    u = _cands(build)["Vib_01"]
    assert u.inferred_facts.get("concept") == "vibration"
    assert "unit" not in u.explicit_facts


def test_no_forced_mapping(build):
    amb = build.candidates["in_04"]
    assert amb.primary is None and amb.resolution == "needs_user_input"


def test_confirm_spec_and_generate(service, build):
    d = DecisionRequest(decided_by="euna", decisions=[
        UserDecision(input_id="in_01", decision=DecisionType.ACCEPT_RECOMMENDATION),
        UserDecision(input_id="in_02", decision=DecisionType.ACCEPT_RECOMMENDATION),
        UserDecision(input_id="in_03", decision=DecisionType.ACCEPT_RECOMMENDATION),
        UserDecision(input_id="in_04", decision=DecisionType.LEAVE_UNMAPPED),
    ])
    rev = service.apply_decisions(build.build_id, d)
    assert rev.ready_to_confirm, rev.blocking_issues

    spec = service.confirm(build.build_id, "euna")
    e1 = next(e for e in spec.entries if e.input_id == "in_01")
    assert e1.source_column == "Vib_DE_RMS"
    assert e1.transform.unit_conversion.scale == pytest.approx(1000.0)
    assert e1.transform.output_column == "DE_Bearing_VibVelocity_RMS"
    assert e1.confirmation.decided_by == "euna"
    assert spec.spec_hash and spec.target.requirement_hash

    dataset, report = service.generate(build.build_id, GenerateRequest(output_format="csv"))
    assert report.passed, report.issues
    out = pd.read_csv(dataset.stored_path)
    assert list(out.columns) == ["DE_Bearing_VibVelocity_RMS", "Bearing_Temperature", "Motor_Speed", "Ambient_Temperature"]

    src = pd.read_csv(service.get_legacy(build.legacy_dataset_id).stored_path)
    src = src.assign(_t=pd.to_datetime(src["Timestamp"])).sort_values("_t", kind="stable")
    assert out["DE_Bearing_VibVelocity_RMS"].tolist() == pytest.approx((src["Vib_DE_RMS"] * 1000).tolist(), nan_ok=True)
    assert out["Bearing_Temperature"].iloc[0] == pytest.approx((src["Temp_Brg_F"].iloc[0] - 32) * 5 / 9)
    assert dataset.lineage["spec_id"] == spec.spec_id
    assert any(e["unit_conversion"] and e["unit_conversion"]["expression"] == "y = x * 1000"
               for e in dataset.lineage["applied"]["entries"])
