"""레거시 데이터 분석부 (특허 4절).

파일/DB/API 로 읽은 레거시 데이터의 스키마·컬럼명·설명·단위·실제 데이터 특성을 분석한다.
- 원천 데이터는 보존하고(별도 경로에 원본 저장) 분석 결과는 별도 관리한다.
- 모든 속성에는 출처를 기록한다: 원천 메타데이터 명시 / 컬럼명으로부터 추정 / 사용자 보완.
- 실제 값의 범위만으로 물리량·단위를 확정하지 않는다(보조 hint 로만 제공).
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import uuid
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from app.mapping.core import units
from app.mapping.core.semantic import SemanticContext, enrich_column
from app.mapping.schemas.common import EvidenceSource, Fact, InfoStatus
from app.mapping.schemas.legacy import ColumnMetadataInput, ColumnProfile, DataProfile, LegacyDataset
from app.mapping.schemas.requirement import Attr

TIME_NAME_RE = re.compile(r"(time|timestamp|datetime|date|ts|일시|시간|시각|날짜)", re.I)
SUPPORTED_FORMATS = ("csv", "tsv", "xlsx", "xls", "parquet", "json")


# --------------------------------------------------------------------------- I/O
def detect_format(filename: str) -> str:
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(f"지원하지 않는 파일 형식: .{ext} (지원: {', '.join(SUPPORTED_FORMATS)})")
    return ext


def read_table(data: bytes | str | Path, fmt: str) -> pd.DataFrame:
    if isinstance(data, (str, Path)):
        data = Path(data).read_bytes()
    buf = io.BytesIO(data)
    if fmt == "csv":
        return pd.read_csv(buf, encoding_errors="replace")
    if fmt == "tsv":
        return pd.read_csv(buf, sep="\t", encoding_errors="replace")
    if fmt in ("xlsx", "xls"):
        return pd.read_excel(buf)
    if fmt == "parquet":
        return pd.read_parquet(buf)
    if fmt == "json":
        raw = json.loads(data.decode("utf-8"))
        return pd.DataFrame(raw["rows"] if isinstance(raw, dict) and "rows" in raw else raw)
    raise ValueError(f"unsupported format {fmt}")


def parse_column_metadata(raw: Any) -> dict[str, ColumnMetadataInput]:
    """{'columns': {col: {...}}} 또는 {col: {...}} 또는 [{'name': col, ...}] 지원."""
    if raw is None or raw == "":
        return {}
    if isinstance(raw, (str, bytes)):
        raw = json.loads(raw)
    if isinstance(raw, dict) and "columns" in raw:
        raw = raw["columns"]
    out: dict[str, ColumnMetadataInput] = {}
    if isinstance(raw, list):
        for item in raw:
            item = dict(item)
            name = item.pop("name", None) or item.pop("column", None)
            if name:
                out[str(name)] = _meta(item)
    elif isinstance(raw, dict):
        for name, item in raw.items():
            out[str(name)] = _meta(item or {})
    return out


def _meta(d: dict) -> ColumnMetadataInput:
    known = set(ColumnMetadataInput.model_fields) - {"extra"}
    return ColumnMetadataInput(**{k: v for k, v in d.items() if k in known}, extra={k: v for k, v in d.items() if k not in known})


# --------------------------------------------------------------------------- 프로파일
def _jsonable(v: Any) -> Any:
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return None if np.isnan(v) else float(v)
    if isinstance(v, (pd.Timestamp,)):
        return v.isoformat()
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


def profile_series(s: pd.Series) -> DataProfile:
    n = int(len(s))
    missing = int(s.isna().sum())
    non_null = s.dropna()
    raw_dtype = str(s.dtype)
    inferred, num_ratio = "string", None
    numeric = None
    if n == 0 or len(non_null) == 0:
        inferred = "empty"
    elif pd.api.types.is_bool_dtype(s):
        inferred = "boolean"
    elif pd.api.types.is_integer_dtype(s):
        inferred = "integer"
    elif pd.api.types.is_float_dtype(s):
        inferred = "float"
    elif pd.api.types.is_datetime64_any_dtype(s):
        inferred = "datetime"
    else:
        conv = pd.to_numeric(non_null.astype(str).str.replace(",", "", regex=False).str.strip(), errors="coerce")
        num_ratio = float(conv.notna().mean())
        if num_ratio >= 0.98:
            numeric = conv
            inferred = "numeric_string"
        else:
            dt = pd.to_datetime(non_null.astype(str), errors="coerce", format="mixed")
            if dt.notna().mean() >= 0.95:
                inferred = "datetime"
    if inferred in ("integer", "float"):
        numeric = non_null.astype(float)

    prof = DataProfile(
        inferred_dtype=inferred,
        raw_dtype=raw_dtype,
        row_count=n,
        missing_count=missing,
        missing_ratio=round(missing / n, 6) if n else 0.0,
        unique_count=int(non_null.nunique()),
        sample_values=[_jsonable(v) for v in non_null.head(5).tolist()],
        numeric_parse_ratio=num_ratio,
    )
    if numeric is not None and len(numeric):
        prof.min, prof.max = float(numeric.min()), float(numeric.max())
        prof.mean, prof.std = float(numeric.mean()), float(numeric.std(ddof=0))
        prof.is_monotonic_increasing = bool(numeric.is_monotonic_increasing)
        prof.hints.append(f"값 범위 [{prof.min:g}, {prof.max:g}] — 품질 참고용이며 물리량·단위 판단 근거로 사용하지 않음")
    if prof.missing_ratio > 0.3:
        prof.hints.append(f"결측 비율 높음 ({prof.missing_ratio:.0%})")
    if prof.unique_count == 1 and n > 1:
        prof.hints.append("상수 컬럼")
    return prof


def _dtype_fact(prof: DataProfile) -> Fact:
    mapping = {"integer": "integer", "float": "float", "boolean": "boolean", "datetime": "datetime",
               "string": "string", "numeric_string": "string"}
    v = mapping.get(prof.inferred_dtype)
    if not v:
        return Fact.unknown("값이 없어 자료형 판단 불가")
    detail = f"실제 값 자료형 분석 (raw={prof.raw_dtype})"
    if prof.inferred_dtype == "numeric_string":
        detail += f", 숫자 변환 가능 비율 {prof.numeric_parse_ratio:.0%}"
    return Fact.of(v, InfoStatus.DERIVED, EvidenceSource.DATA_PROFILE, detail)


def build_column_attributes(name: str, meta: ColumnMetadataInput, prof: DataProfile, user_fields: set[str]) -> tuple[dict[Attr, Fact], list[str]]:
    """메타데이터·컬럼명·데이터 프로파일 → 1차 속성 (의미 보완 전)."""
    attrs: dict[Attr, Fact] = {}
    notes: list[str] = []

    def src_status(field: str) -> tuple[InfoStatus, EvidenceSource, str]:
        if field in user_fields:
            return InfoStatus.USER_SUPPLIED, EvidenceSource.USER, "사용자 보완"
        return InfoStatus.EXPLICIT, EvidenceSource.SOURCE_METADATA, "원천 메타데이터 명시"

    for field, attr in (
        ("unit", Attr.UNIT),
        ("quantity", Attr.QUANTITY),
        ("measurement_target", Attr.MEASUREMENT_TARGET),
        ("measurement_location", Attr.MEASUREMENT_LOCATION),
        ("value_representation", Attr.VALUE_REPRESENTATION),
    ):
        val = getattr(meta, field)
        if val not in (None, ""):
            st, src, label = src_status(field)
            attrs[attr] = Fact.of(val, st, src, f"{label}: {field}={val}", ref=name)

    if Attr.UNIT not in attrs:
        found = units.extract_unit_from_text(name)
        if found:
            sym, frag = found
            attrs[Attr.UNIT] = Fact.of(sym, InfoStatus.INFERRED, EvidenceSource.COLUMN_NAME,
                                       f"컬럼명 문자열 '{frag}' 로부터 단위 추정", ref=name, confidence=0.6)
        elif meta.description:
            found = units.extract_unit_from_text(meta.description)
            if found:
                sym, frag = found
                st = InfoStatus.USER_SUPPLIED if "description" in user_fields else InfoStatus.DERIVED
                attrs[Attr.UNIT] = Fact.of(sym, st, EvidenceSource.SOURCE_DESCRIPTION, f"설명문의 단위 표기 '{frag}'", ref=name)
        if Attr.UNIT not in attrs:
            notes.append("단위 정보 없음")
    attrs[Attr.DATA_TYPE] = _dtype_fact(prof)
    return attrs, notes


def schema_hash(columns: list[ColumnProfile]) -> str:
    payload = [[c.column_name, c.profile.inferred_dtype] for c in columns]
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False).encode()).hexdigest()


def _detect_time_column(df: pd.DataFrame, profiles: dict[str, DataProfile]) -> Optional[str]:
    for name, prof in profiles.items():
        if prof.inferred_dtype == "datetime":
            return name
    for name, prof in profiles.items():
        if TIME_NAME_RE.search(str(name)) and prof.inferred_dtype in ("integer", "float") and prof.is_monotonic_increasing:
            return name
    return None


def analyze_dataframe(
    ctx: SemanticContext,
    df: pd.DataFrame,
    metadata: dict[str, ColumnMetadataInput] | None = None,
    user_fields: dict[str, set[str]] | None = None,
) -> tuple[list[ColumnProfile], Optional[str]]:
    metadata = metadata or {}
    user_fields = user_fields or {}
    profiles = {str(c): profile_series(df[c]) for c in df.columns}
    time_col = _detect_time_column(df, profiles)
    cols: list[ColumnProfile] = []
    for pos, c in enumerate(df.columns):
        name = str(c)
        meta = metadata.get(name, ColumnMetadataInput())
        prof = profiles[name]
        attrs, notes = build_column_attributes(name, meta, prof, user_fields.get(name, set()))
        relations = []
        if name == time_col:
            relations.append("time_index")
        if prof.unique_count == prof.row_count and prof.row_count > 1 and prof.inferred_dtype in ("integer", "string"):
            relations.append("possible_key")
        col = ColumnProfile(
            column_name=name,
            position=pos,
            description=meta.description,
            metadata=meta,
            attributes=attrs,
            profile=prof,
            relations=relations,
            notes=notes,
        )
        cols.append(enrich_column(ctx, col))
    # 같은 접두어 그룹(예: Vib_DE_RMS / Vib_NDE_RMS) 관계 표시
    prefix: dict[str, list[str]] = {}
    for c in cols:
        if c.tokens:
            prefix.setdefault(c.tokens[0].lower(), []).append(c.column_name)
    for c in cols:
        grp = prefix.get(c.tokens[0].lower(), []) if c.tokens else []
        if len(grp) > 1:
            c.relations.append("same_prefix_group:" + ",".join(x for x in grp if x != c.column_name))
    return cols, time_col


def analyze_legacy_file(
    ctx: SemanticContext,
    data: bytes,
    filename: str,
    metadata_raw: Any = None,
    name: Optional[str] = None,
    stored_path: Optional[str] = None,
    source_uri: Optional[str] = None,
) -> tuple[LegacyDataset, pd.DataFrame]:
    fmt = detect_format(filename)
    df = read_table(data, fmt)
    meta = parse_column_metadata(metadata_raw)
    unknown_meta = sorted(set(meta) - {str(c) for c in df.columns})
    cols, time_col = analyze_dataframe(ctx, df, meta)
    ds = LegacyDataset(
        legacy_dataset_id=f"lds_{uuid.uuid4().hex[:12]}",
        name=name or Path(filename).stem,
        source_uri=source_uri or filename,
        connection_type="file",
        file_format=fmt,
        stored_path=stored_path,
        content_hash=hashlib.sha256(data).hexdigest(),
        record_count=int(len(df)),
        column_count=int(df.shape[1]),
        columns=cols,
        time_column=time_col,
    )
    ds.schema_hash = schema_hash(cols)
    if unknown_meta:
        for c in ds.columns[:1]:
            c.notes.append(f"메타데이터에 있으나 데이터에 없는 컬럼: {unknown_meta}")
    return ds, df


def reanalyze_with_supplement(
    ctx: SemanticContext,
    ds: LegacyDataset,
    df: pd.DataFrame,
    column: str,
    supplement: ColumnMetadataInput,
) -> LegacyDataset:
    """사용자 정보 보완 → 해당 컬럼만 재분석. 기존 원천 메타데이터는 보존하고 보완값은 USER_SUPPLIED 로 기록."""
    col = ds.column(column)
    if col is None:
        raise KeyError(column)
    base = col.metadata.model_dump()
    sup = supplement.model_dump(exclude_none=True, exclude={"extra"})
    user_fields = set(sup)
    prev_user = set(col.metadata.extra.get("_user_fields", []))
    merged = {**base, **sup}
    merged_extra = {**col.metadata.extra, **supplement.extra, "_user_fields": sorted(prev_user | user_fields)}
    merged["extra"] = merged_extra
    meta = ColumnMetadataInput(**merged)
    prof = col.profile
    attrs, notes = build_column_attributes(column, meta, prof, prev_user | user_fields)
    new_col = ColumnProfile(
        column_name=column,
        position=col.position,
        description=meta.description,
        metadata=meta,
        attributes=attrs,
        profile=prof,
        relations=col.relations,
        notes=notes,
    )
    new_col = enrich_column(ctx, new_col)
    ds.columns = [new_col if c.column_name == column else c for c in ds.columns]
    return ds
