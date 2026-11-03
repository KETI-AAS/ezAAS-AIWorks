"""데이터셋 생성·검증부 (특허 10절).

매핑 명세(MappingSpec)를 **유일한 실행 기준**으로 사용해 원천 컬럼 추출 → 자료형/단위 변환 →
모델 입력 순서 구성 → 추가 처리(시간 정렬·결측) → 최종 검증을 수행한다.
화면에서 확정한 대응 관계와 실제 처리 컬럼이 같은 명세를 참조하므로 불일치가 생기지 않는다.

통계·분포는 품질 검토 보조정보로만 제공하며, 의미적 대응 확정에는 사용하지 않는다.
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from app.mapping.schemas.build import ColumnStat, ValidationIssue, ValidationReport
from app.mapping.schemas.mapping import MappingEntry, MappingSpec, MissingValuePolicy, ProcessingOptions
from app.mapping.schemas.requirement import Attr, RequirementSet


def _to_numeric(s: pd.Series) -> pd.Series:
    if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
        return s.astype(float)
    return pd.to_numeric(s.astype(str).str.replace(",", "", regex=False).str.strip().replace({"": None, "nan": None}), errors="coerce")


def transform_series(src: pd.Series, entry: MappingEntry) -> tuple[pd.Series, dict]:
    """명세의 변환 조건을 한 컬럼에 적용. 반환: (결과, 적용 기록)."""
    t = entry.transform
    applied: dict = {"source_column": entry.source_column, "cast": None, "unit_conversion": None, "cast_failures": 0}
    if t is None:
        return src.copy(), applied
    target = t.target_dtype
    s = src
    before_na = int(s.isna().sum())
    if target in ("float", "integer"):
        s = _to_numeric(s)
        applied["cast"] = f"{t.source_dtype}→float"
    elif target == "boolean":
        s = s.map(lambda v: None if pd.isna(v) else bool(int(v)) if str(v).strip() in ("0", "1") else str(v).strip().lower() in ("true", "yes"))
        applied["cast"] = f"{t.source_dtype}→boolean"
    elif target == "string":
        s = s.astype("string")
        applied["cast"] = f"{t.source_dtype}→string"
    elif target == "datetime":
        s = pd.to_datetime(s, errors="coerce", format="mixed")
        applied["cast"] = f"{t.source_dtype}→datetime"
    applied["cast_failures"] = int(s.isna().sum()) - before_na

    conv = t.unit_conversion
    if conv is not None and target in ("float", "integer"):
        if not conv.is_identity:
            s = s * conv.scale + conv.offset
        applied["unit_conversion"] = {
            "source_unit": conv.source_unit,
            "target_unit": conv.target_unit,
            "expression": conv.expression,
            "applied": True,
        }
    if target == "integer":
        frac = s.dropna() % 1
        applied["non_integral_values"] = int((frac != 0).sum())
        s = s.round().astype("Int64")
    return s.rename(t.output_column), applied


def _apply_missing(df: pd.DataFrame, policy: MissingValuePolicy, cols: list[str]) -> tuple[pd.DataFrame, dict]:
    info = {"policy": policy.value, "rows_before": int(len(df))}
    if policy == MissingValuePolicy.DROP_ROWS:
        df = df.dropna(subset=cols)
    elif policy == MissingValuePolicy.FORWARD_FILL:
        df[cols] = df[cols].ffill()
    elif policy == MissingValuePolicy.MEAN:
        for c in cols:
            if pd.api.types.is_numeric_dtype(df[c]):
                df[c] = df[c].fillna(df[c].mean())
    info["rows_after"] = int(len(df))
    return df, info


def _dtype_name(s: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(s):
        return "boolean"
    if pd.api.types.is_integer_dtype(s):
        return "integer"
    if pd.api.types.is_float_dtype(s):
        return "float"
    if pd.api.types.is_datetime64_any_dtype(s):
        return "datetime"
    return "string"


def build_dataset(
    spec: MappingSpec,
    df: pd.DataFrame,
    requirements: RequirementSet,
    processing: Optional[ProcessingOptions] = None,
) -> tuple[pd.DataFrame, ValidationReport, dict]:
    proc = processing or spec.processing
    issues: list[ValidationIssue] = []
    checks: dict[str, bool] = {}
    log: dict = {"entries": [], "processing": {}}
    req_by_id = {r.input_id: r for r in requirements.inputs}

    # 0) 명세-요구조건 정합 (모델 입력조건 변경 감지)
    if spec.target.requirement_hash and requirements.content_hash and spec.target.requirement_hash != requirements.content_hash:
        issues.append(ValidationIssue(code="REQUIREMENT_CHANGED", severity="error",
                                      message="매핑 명세 생성 이후 모델 입력 요구조건이 변경됨 — 영향 항목 재검토 필요"))
    # 1) 원천 컬럼 존재
    missing_src = [e for e in spec.entries if e.source_column and e.source_column not in df.columns]
    for e in missing_src:
        issues.append(ValidationIssue(code="SOURCE_COLUMN_MISSING", severity="error", input_id=e.input_id,
                                      source_column=e.source_column, message=f"원천 컬럼 '{e.source_column}' 이(가) 데이터에 없음"))
    checks["source_columns_present"] = not missing_src

    # 2) 추출·변환 (명세의 순서 = 모델 입력 순서)
    entries = sorted(spec.entries, key=lambda e: e.order_index)
    out_cols: dict[str, pd.Series] = {}
    applied_ok = True
    for e in entries:
        out_name = e.transform.output_column if e.transform else e.input_name
        if not e.source_column or e.source_column not in df.columns:
            out_cols[out_name] = pd.Series([pd.NA] * len(df), index=df.index, name=out_name, dtype="Float64")
            if not e.source_column:
                issues.append(ValidationIssue(code="OPTIONAL_INPUT_UNMAPPED", severity="warning", input_id=e.input_id,
                                              message=f"선택 입력 '{e.input_name}' 미매핑 — 결측으로 채움"))
            continue
        s, applied = transform_series(df[e.source_column], e)
        out_cols[out_name] = s
        log["entries"].append({"input_id": e.input_id, **applied})
        if applied["cast_failures"] > 0:
            sev = "error" if applied["cast_failures"] >= len(s) - int(df[e.source_column].isna().sum()) else "warning"
            issues.append(ValidationIssue(code="CAST_FAILED", severity=sev, input_id=e.input_id, source_column=e.source_column,
                                          message=f"자료형 변환 실패 {applied['cast_failures']}건 → 결측 처리"))
        if applied.get("non_integral_values"):
            issues.append(ValidationIssue(code="NON_INTEGRAL", severity="warning", input_id=e.input_id,
                                          message=f"정수 변환 시 소수부가 있는 값 {applied['non_integral_values']}건 반올림"))
        # 단위 변환 적용 여부: 명세에 변환이 있으면 반드시 적용 기록이 있어야 함
        req = req_by_id.get(e.input_id)
        conv = e.transform.unit_conversion if e.transform else None
        req_unit = req.attr(Attr.UNIT).value if req else None
        if req_unit and conv is None:
            issues.append(ValidationIssue(code="UNIT_CONVERSION_UNDEFINED", severity="error", input_id=e.input_id,
                                          message=f"요구 단위 {req_unit} 에 대한 단위 처리 조건이 명세에 없음"))
            applied_ok = False
        elif conv is not None:
            if not applied.get("unit_conversion"):
                applied_ok = False
                issues.append(ValidationIssue(code="UNIT_CONVERSION_NOT_APPLIED", severity="error", input_id=e.input_id,
                                              message="명세의 단위 변환이 적용되지 않음"))
            if req_unit and conv.target_unit != req_unit:
                applied_ok = False
                issues.append(ValidationIssue(code="UNIT_TARGET_MISMATCH", severity="error", input_id=e.input_id,
                                              message=f"명세 변환 대상 단위 {conv.target_unit} ≠ 현재 요구 단위 {req_unit}"))
    checks["unit_conversion_applied"] = applied_ok

    out = pd.DataFrame(out_cols, index=df.index)
    input_cols = list(out.columns)
    mapped_cols = [
        (e.transform.output_column if e.transform else e.input_name)
        for e in entries if e.source_column and e.source_column in df.columns
    ]

    # 3) 추가 처리: 시간 정렬 / 결측
    if spec.time_column and spec.time_column in df.columns:
        t = pd.to_datetime(df[spec.time_column], errors="coerce", format="mixed")
        if t.isna().all() and pd.api.types.is_numeric_dtype(df[spec.time_column]):
            t = df[spec.time_column]
        if proc.sort_by_time:
            order = t.sort_values(kind="stable").index
            out = out.loc[order]
            t = t.loc[order]
            log["processing"]["sorted_by"] = spec.time_column
        if proc.include_time_column:
            out.insert(0, spec.time_column, t.values)
    if proc.missing_values == MissingValuePolicy.FAIL:
        n_missing = int(out[mapped_cols].isna().sum().sum())
        if n_missing:
            issues.append(ValidationIssue(code="MISSING_VALUES", severity="error", message=f"결측값 {n_missing}건 (정책: fail)"))
    else:
        out, info = _apply_missing(out, proc.missing_values, mapped_cols)  # 미매핑 선택 입력은 제외
        log["processing"]["missing_values"] = info
    out = out.reset_index(drop=True)

    # 4) 최종 검증
    required_ids = [r.input_id for r in requirements.inputs if r.is_required_input]
    mapped_required = {e.input_id for e in spec.entries if e.source_column}
    missing_req = [i for i in required_ids if i not in mapped_required]
    for i in missing_req:
        issues.append(ValidationIssue(code="REQUIRED_INPUT_MISSING", severity="error", input_id=i,
                                      message=f"필수 입력항목 '{req_by_id[i].name}' 이(가) 매핑되지 않음"))
    checks["required_inputs_present"] = not missing_req

    expected_order = [r.name for r in sorted(requirements.inputs, key=lambda r: r.order_index)]
    actual_order = [c for c in out.columns if c in set(expected_order)]
    checks["input_order"] = actual_order == expected_order
    if not checks["input_order"]:
        issues.append(ValidationIssue(code="INPUT_ORDER", severity="error",
                                      message=f"입력 순서 불일치: 기대 {expected_order}, 실제 {actual_order}"))

    dtype_ok = True
    for r in requirements.inputs:
        want = r.attr(Attr.DATA_TYPE).value
        if not want or r.name not in out.columns:
            continue
        have = _dtype_name(out[r.name])
        if out[r.name].isna().all() and not r.is_required_input:
            continue
        if not (want == have or (want == "float" and have == "integer")):
            dtype_ok = False
            issues.append(ValidationIssue(code="DTYPE_MISMATCH", severity="error", input_id=r.input_id,
                                          message=f"'{r.name}' 자료형 {have} ≠ 요구 {want}"))
    checks["data_types"] = dtype_ok

    vc_ok = True
    for r in requirements.inputs:
        vc = r.value_condition
        if not vc or r.name not in out.columns:
            continue
        s = out[r.name]
        viol = 0
        if vc.min is not None and pd.api.types.is_numeric_dtype(s):
            viol += int((s < vc.min).sum())
        if vc.max is not None and pd.api.types.is_numeric_dtype(s):
            viol += int((s > vc.max).sum())
        if vc.allowed_values:
            viol += int((~s.dropna().astype(str).isin(vc.allowed_values)).sum())
        if viol:
            sev = "error" if proc.enforce_value_conditions else "warning"
            vc_ok = vc_ok and sev != "error"
            issues.append(ValidationIssue(code="VALUE_CONDITION", severity=sev, input_id=r.input_id,
                                          message=f"'{r.name}' 값 조건 위반 {viol}건 (min={vc.min}, max={vc.max})"))
    checks["value_conditions"] = vc_ok

    if proc.max_missing_ratio is not None:
        ok = True
        for c in input_cols:
            ratio = float(out[c].isna().mean()) if len(out) else 0.0
            if ratio > proc.max_missing_ratio:
                ok = False
                issues.append(ValidationIssue(code="MISSING_RATIO", severity="error",
                                              message=f"'{c}' 결측 비율 {ratio:.1%} > 허용 {proc.max_missing_ratio:.1%}"))
        checks["missing_ratio"] = ok
    checks["non_empty"] = len(out) > 0
    if not checks["non_empty"]:
        issues.append(ValidationIssue(code="EMPTY_RESULT", severity="error", message="처리 결과 행이 없음"))
    checks["requirement_consistency"] = not any(i.code == "REQUIREMENT_CHANGED" for i in issues)

    stats = []
    for c in input_cols:
        s = out[c]
        st = ColumnStat(column=c, dtype=_dtype_name(s), count=int(s.notna().sum()), missing=int(s.isna().sum()))
        if pd.api.types.is_numeric_dtype(s) and s.notna().any():
            v = s.astype(float)
            st.min, st.max = float(np.nanmin(v)), float(np.nanmax(v))
            st.mean, st.std = float(np.nanmean(v)), float(np.nanstd(v))
        stats.append(st)

    passed = not any(i.severity == "error" for i in issues)
    return out, ValidationReport(passed=passed, checks=checks, issues=issues, column_stats=stats), log


def preview_conversion(src: pd.Series, entry: MappingEntry, n: int = 5) -> list[dict]:
    head = src.head(n)
    conv, _ = transform_series(head, entry)
    return [{"source": None if pd.isna(a) else (a.item() if hasattr(a, "item") else a),
             "converted": None if pd.isna(b) else (float(b) if isinstance(b, (int, float, np.number)) else str(b))}
            for a, b in zip(head.tolist(), conv.tolist())]
