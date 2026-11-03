from app.mapping.core.semantic import Relation, tokenize
from app.mapping.schemas.requirement import Attr


def test_tokenize():
    assert tokenize("Vib_NDE_RMS") == ["Vib", "NDE", "RMS"]
    assert tokenize("VibrationVelocity") == ["Vibration", "Velocity"]
    assert tokenize("DEBearingTemp01") == ["DE", "Bearing", "Temp", "01"]


def test_synonym_vs_related(service):
    kg = service.kg
    assert kg.relation("vibration_velocity", "vibration_velocity") == Relation.SAME
    # 관련 개념이지만 다른 물리량 → 동일 처리 금지
    assert kg.relation("vibration_acceleration", "vibration_velocity") == Relation.RELATED
    assert kg.relation("vibration", "vibration_velocity") == Relation.BROADER
    assert kg.relation("drive_end", "non_drive_end") == Relation.OPPOSITE


def test_name_abbreviations_are_inferred(service, legacy_bytes):
    ds = service.register_legacy(legacy_bytes, "x.csv", None)
    vib01 = ds.column("Vib_01")
    concept = vib01.attr(Attr.CONCEPT)
    assert concept.value == "vibration" and concept.status.value == "inferred"
    assert not vib01.attr(Attr.UNIT).known  # 값 범위로 단위를 확정하지 않음
    nde = ds.column("Vib_NDE_RMS")
    assert nde.attr(Attr.MEASUREMENT_LOCATION).value == "non_drive_end"
    assert nde.attr(Attr.MEASUREMENT_LOCATION).status.value == "inferred"


def test_composition_from_name(service):
    import pandas as pd
    from app.mapping.core.legacy_analyzer import analyze_dataframe

    cols, _ = analyze_dataframe(service.ctx, pd.DataFrame({"VibVel_DE_mm_s": [1.0, 2.0], "AccelVib_NDE": [1.0, 2.0]}))
    by = {c.column_name: c for c in cols}
    assert by["VibVel_DE_mm_s"].attr(Attr.CONCEPT).value == "vibration_velocity"
    assert by["VibVel_DE_mm_s"].attr(Attr.UNIT).value == "mm/s"
    assert by["AccelVib_NDE"].attr(Attr.CONCEPT).value == "vibration_acceleration"


def test_explicit_beats_inferred(service):
    import pandas as pd
    from app.mapping.core.legacy_analyzer import analyze_dataframe, parse_column_metadata

    # 컬럼명은 속도처럼 보이지만 명시 단위는 가속도 → 명시 정보 우선, 추정 개념 재해석
    meta = parse_column_metadata({"VibVel_X": {"unit": "m/s²"}})
    cols, _ = analyze_dataframe(service.ctx, pd.DataFrame({"VibVel_X": [1.0, 2.0]}), meta)
    c = cols[0]
    assert c.attr(Attr.QUANTITY).value == "acceleration"
    assert c.attr(Attr.CONCEPT).value == "vibration_acceleration"
