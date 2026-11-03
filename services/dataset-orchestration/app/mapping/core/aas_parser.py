"""AAS 입력정보 해석부 (특허 3절).

AI Model Nameplate 서브모델에서 입력 파라미터 목록을 추출하고, 각 파라미터의 semanticId 가
참조하는 Concept Description(IEC 61360 데이터 명세)을 조회하여 명칭·정의·단위·자료형을 확보한다.
확보한 정보는 입력항목별 요구조건(ModelInputRequirement)으로 구조화되며, 확인되지 않은 항목은
임의로 확정하지 않고 UNKNOWN 으로 남긴다.

지원 입력 형식
1) AAS Environment JSON (v3: assetAdministrationShells / submodels / conceptDescriptions)
2) 단일 Submodel JSON
3) model_version.inputs (jsonb) 형태의 입력 목록 [{name, type, unit, description, ...}]
"""
from __future__ import annotations

import hashlib
import json
import re
import uuid
from typing import Any, Optional

from app.mapping.config import settings
from app.mapping.core.semantic import SemanticContext, enrich_requirement
from app.mapping.schemas.common import EvidenceSource, Fact, InfoStatus
from app.mapping.schemas.requirement import (
    Attr,
    ModelInputRequirement,
    RequirementAttribute,
    RequirementSet,
    ValueCondition,
)

NAMEPLATE_HINTS = ("aimodelnameplate", "modelnameplate", "ai_model_nameplate")
INPUT_CONTAINER_RE = re.compile(r"^(inputs?|inputparameters?|modelinputs?|inputfeatures?|features)$", re.I)

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "name": ("name", "inputname", "featurename", "parametername", "columnname"),
    "display_name": ("displayname", "label", "preferredname", "title"),
    "description": ("description", "definition", "comment"),
    "data_type": ("type", "datatype", "valuetype", "dtype"),
    "unit": ("unit", "unitofmeasure", "uom", "measurementunit"),
    "quantity": ("physicalquantity", "quantity", "quantitykind", "measurand"),
    "measurement_target": ("measurementtarget", "measuredobject", "target", "measuredcomponent"),
    "measurement_location": ("measurementlocation", "location", "measurementpoint", "sensorposition"),
    "value_representation": ("valuerepresentation", "representation", "statistic", "aggregation", "signaltype", "valuetypeofsignal"),
    "time_condition": ("timecondition", "samplingrate", "samplinginterval", "timeresolution"),
    "order": ("order", "index", "position", "orderindex"),
    "required": ("required", "isrequired", "mandatory"),
    "optional": ("optional", "isoptional"),
    "min": ("min", "minvalue", "lowerlimit", "rangemin"),
    "max": ("max", "maxvalue", "upperlimit", "rangemax"),
    "allowed_values": ("allowedvalues", "enumeration", "valuelist"),
    "required_conditions": ("requiredconditions",),
    "optional_conditions": ("optionalconditions",),
    "shape": ("shape",),
}
_ALIAS_TO_FIELD = {alias: f for f, aliases in FIELD_ALIASES.items() for alias in aliases}

ATTR_FIELDS: dict[str, Attr] = {
    "unit": Attr.UNIT,
    "quantity": Attr.QUANTITY,
    "data_type": Attr.DATA_TYPE,
    "measurement_target": Attr.MEASUREMENT_TARGET,
    "measurement_location": Attr.MEASUREMENT_LOCATION,
    "value_representation": Attr.VALUE_REPRESENTATION,
    "time_condition": Attr.TIME_CONDITION,
}


# --------------------------------------------------------------------------- 자료형 정규화
def normalize_dtype(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    s = str(raw).strip().lower()
    s = s.replace("xs:", "").replace("xsd:", "")
    if not s:
        return None
    if s in {"double", "float", "decimal", "real_measure", "real_count", "real_currency", "number", "float32", "float64", "실수", "real"}:
        return "float"
    if s in {"int", "integer", "long", "short", "byte", "integer_measure", "integer_count", "int32", "int64", "정수",
             "nonnegativeinteger", "positiveinteger", "unsignedint", "unsignedlong"}:
        return "integer"
    if s in {"boolean", "bool"}:
        return "boolean"
    if s in {"string", "str", "langstring", "string_translatable", "text", "문자열", "categorical"}:
        return "string"
    if s in {"datetime", "date", "timestamp", "time", "date_time"}:
        return "datetime"
    if s.startswith("float") or s.startswith("double"):
        return "float"
    if s.startswith("int") or s.startswith("uint"):
        return "integer"
    return None


# --------------------------------------------------------------------------- AAS 헬퍼
def _ref_value(ref: Any) -> Optional[str]:
    if not ref:
        return None
    if isinstance(ref, str):
        return ref
    keys = ref.get("keys") if isinstance(ref, dict) else None
    if keys:
        return keys[-1].get("value")
    return None


def _lang_text(v: Any, prefer: tuple[str, ...] = ("ko", "en")) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        by_lang = {str(x.get("language", "")).lower()[:2]: x.get("text") for x in v if isinstance(x, dict)}
        for lang in prefer:
            if by_lang.get(lang):
                return by_lang[lang]
        return next((t for t in by_lang.values() if t), None)
    if isinstance(v, dict):
        return v.get("text") or next(iter(v.values()), None)
    return str(v)


def _element_value(el: dict) -> Any:
    mt = el.get("modelType")
    if isinstance(mt, dict):
        mt = mt.get("name")
    if mt == "MultiLanguageProperty":
        return _lang_text(el.get("value"))
    if mt == "Range":
        return {"min": el.get("min"), "max": el.get("max")}
    if mt in ("ReferenceElement",):
        return _ref_value(el.get("value"))
    return el.get("value")


def _children(el: dict) -> list[dict]:
    v = el.get("value") if "value" in el else el.get("submodelElements")
    return v if isinstance(v, list) and all(isinstance(x, dict) for x in v) else []


def _model_type(el: dict) -> str:
    mt = el.get("modelType")
    return (mt.get("name") if isinstance(mt, dict) else mt) or ""


class ConceptDescriptionIndex:
    def __init__(self, cds: list[dict] | None):
        self._by_id: dict[str, dict] = {}
        for cd in cds or []:
            if cd.get("id"):
                self._by_id[cd["id"].strip().lower()] = cd
            for ic in cd.get("isCaseOf", []) or []:
                v = _ref_value(ic)
                if v:
                    self._by_id.setdefault(v.strip().lower(), cd)

    def resolve(self, semantic_id: Optional[str]) -> Optional[dict]:
        """CD → IEC 61360 내용(평탄화)."""
        if not semantic_id:
            return None
        cd = self._by_id.get(semantic_id.strip().lower())
        if not cd:
            return None
        out: dict[str, Any] = {"id": cd.get("id"), "idShort": cd.get("idShort")}
        for eds in cd.get("embeddedDataSpecifications", []) or []:
            content = eds.get("dataSpecificationContent") or {}
            out.update({
                "preferred_name": _lang_text(content.get("preferredName")),
                "short_name": _lang_text(content.get("shortName")),
                "unit": content.get("unit") or None,
                "unit_id": _ref_value(content.get("unitId")),
                "data_type": content.get("dataType"),
                "definition": _lang_text(content.get("definition")),
                "symbol": content.get("symbol"),
                "value_format": content.get("valueFormat"),
            })
        if not out.get("preferred_name"):
            out["preferred_name"] = cd.get("idShort")
        if not out.get("definition"):
            out["definition"] = _lang_text(cd.get("description"))
        return out


# --------------------------------------------------------------------------- 탐색
def find_nameplate_submodel(env: dict) -> Optional[dict]:
    if env.get("modelType") in ("Submodel", {"name": "Submodel"}) or "submodelElements" in env:
        return env
    for sm in env.get("submodels", []) or []:
        sem = (_ref_value(sm.get("semanticId")) or "").lower().replace("-", "")
        ids = (sm.get("idShort") or "").lower()
        if any(h in sem for h in NAMEPLATE_HINTS) or any(h in ids for h in NAMEPLATE_HINTS):
            return sm
    # 이름이 다르더라도 입력 컨테이너가 있는 서브모델
    for sm in env.get("submodels", []) or []:
        if _find_input_container(sm.get("submodelElements", [])):
            return sm
    return None


def _find_input_container(elements: list[dict], path: str = "") -> Optional[tuple[dict, str]]:
    for el in elements or []:
        p = f"{path}/{el.get('idShort', '')}"
        if INPUT_CONTAINER_RE.match(el.get("idShort", "") or "") and _children(el):
            return el, p
    for el in elements or []:
        p = f"{path}/{el.get('idShort', '')}"
        kids = _children(el)
        if kids:
            found = _find_input_container(kids, p)
            if found:
                return found
    return None


def _fields_of_input(el: dict) -> tuple[dict[str, Any], dict[str, Optional[str]]]:
    """입력 파라미터 SMC → (필드값, 필드별 semanticId)."""
    fields: dict[str, Any] = {}
    sems: dict[str, Optional[str]] = {}
    if _model_type(el) in ("Property", "MultiLanguageProperty", "Range"):
        fields["name"] = el.get("idShort")
        fields["data_type"] = el.get("valueType")
        fields["description"] = _lang_text(el.get("description"))
        sems["name"] = _ref_value(el.get("semanticId"))
        return fields, sems
    for child in _children(el):
        key = (child.get("idShort") or "").lower().replace("_", "")
        f = _ALIAS_TO_FIELD.get(key)
        if not f:
            continue
        val = _element_value(child)
        if isinstance(val, dict) and f in ("min", "max"):
            val = val.get(f)
        if _model_type(child) == "Range" and key in ("range", "valuerange"):
            fields["min"], fields["max"] = val.get("min"), val.get("max")
            continue
        fields[f] = val
        sems[f] = _ref_value(child.get("semanticId"))
    if "description" not in fields and el.get("description"):
        fields["description"] = _lang_text(el.get("description"))
    return fields, sems


def _as_bool(v: Any) -> Optional[bool]:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in {"true", "1", "yes", "y", "필수"}:
        return True
    if s in {"false", "0", "no", "n", "선택"}:
        return False
    return None


def _as_float(v: Any) -> Optional[float]:
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _parse_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    return [x.strip() for x in str(v).split(",") if x.strip()]


# --------------------------------------------------------------------------- 요구조건 구성
def _build_input(
    idx: int,
    el: dict,
    path: str,
    cds: ConceptDescriptionIndex,
    warnings: list[str],
) -> tuple[ModelInputRequirement, dict]:
    fields, sems = _fields_of_input(el)
    id_short = el.get("idShort") or f"Input_{idx + 1}"
    name = str(fields.get("name") or id_short).strip()
    el_path = f"{path}/{id_short}"

    semantic_id = _ref_value(el.get("semanticId")) or sems.get("name")
    cd = cds.resolve(semantic_id)
    attrs: dict[Attr, RequirementAttribute] = {}

    def put(attr: Attr, value: Any, source: EvidenceSource, detail: str, ref: str | None = None):
        if value in (None, ""):
            return
        if attr == Attr.DATA_TYPE:
            norm = normalize_dtype(value)
            if norm is None:
                warnings.append(f"{name}: 자료형 '{value}' 해석 불가")
                return
            value = norm
        cur = attrs.get(attr)
        if cur and cur.known:
            return  # 입력 파라미터 자체의 명시값이 CD 보다 우선
        attrs[attr] = RequirementAttribute(**Fact.of(value, InfoStatus.EXPLICIT, source, detail, ref=ref).model_dump())

    for f, attr in ATTR_FIELDS.items():
        if f in fields:
            put(attr, fields[f], EvidenceSource.AAS_PROPERTY, f"AAS 입력 파라미터 속성 '{f}'", ref=f"{el_path}/{f}")
    if cd:
        ref = cd.get("id")
        put(Attr.UNIT, cd.get("unit"), EvidenceSource.AAS_CONCEPT_DESCRIPTION, "Concept Description(IEC 61360) unit", ref)
        if not cd.get("unit") and cd.get("unit_id"):
            put(Attr.UNIT, cd.get("unit_id"), EvidenceSource.AAS_CONCEPT_DESCRIPTION, "Concept Description unitId", ref)
        put(Attr.DATA_TYPE, cd.get("data_type"), EvidenceSource.AAS_CONCEPT_DESCRIPTION, "Concept Description dataType", ref)
    elif semantic_id:
        warnings.append(f"{name}: semanticId '{semantic_id}' 의 Concept Description 을 환경에서 찾지 못함")

    for a in Attr:
        attrs.setdefault(a, RequirementAttribute())

    required_input = True
    if _as_bool(fields.get("required")) is False or _as_bool(fields.get("optional")) is True:
        required_input = False

    vc = None
    vmin, vmax = _as_float(fields.get("min")), _as_float(fields.get("max"))
    allowed = _parse_list(fields.get("allowed_values")) or None
    if vmin is not None or vmax is not None or allowed:
        vc = ValueCondition(min=vmin, max=vmax, allowed_values=allowed)

    order = fields.get("order")
    try:
        order_index = int(order) if order not in (None, "") else idx
    except (TypeError, ValueError):
        order_index = idx

    texts = [t for t in ((cd or {}).get("definition"), fields.get("description")) if t]
    definition = " / ".join(dict.fromkeys(str(t) for t in texts)) or None
    display = fields.get("display_name") or (cd or {}).get("preferred_name")
    req = ModelInputRequirement(
        input_id=f"in_{idx + 1:02d}",
        order_index=order_index,
        id_short=id_short,
        name=name,
        display_name=display,
        definition=definition,
        semantic_id=semantic_id,
        concept_description_id=(cd or {}).get("id"),
        is_required_input=required_input,
        attributes=attrs,
        value_condition=vc,
        aas_path=el_path,
    )
    overrides = {
        "required": _parse_list(fields.get("required_conditions")),
        "optional": _parse_list(fields.get("optional_conditions")),
        "description_text": fields.get("description"),
    }
    return req, overrides


def _apply_required_policy(req: ModelInputRequirement, overrides: dict) -> ModelInputRequirement:
    """필수 조건 결정: 정책 대상 속성 중 **AAS 근거(명시/파생)로 확보된 것**만 필수로 둔다.
    추정(INFERRED) 속성은 필수 조건으로 쓰지 않는다(불확실한 추정이 배제 근거가 되는 것 방지)."""
    policy = {p.strip() for p in settings.required_attrs_policy if p.strip()}
    force_req = {x.strip().lower() for x in overrides.get("required", [])}
    force_opt = {x.strip().lower() for x in overrides.get("optional", [])}
    for key, a in req.attributes.items():
        if not a.known:
            a.required, a.required_reason = False, "정보 없음(미확인)"
            continue
        if key.value in force_opt:
            a.required, a.required_reason = False, "AAS OptionalConditions"
        elif key.value in force_req:
            a.required, a.required_reason = True, "AAS RequiredConditions"
        elif key.value in policy and a.status.is_confirmed:
            a.required, a.required_reason = True, "필수 조건 정책 + AAS 근거 확보"
        else:
            a.required = False
            a.required_reason = "추정 정보(필수 조건 미적용)" if not a.status.is_confirmed else "정책상 선택 조건"
    return req


def requirement_hash(inputs: list[ModelInputRequirement]) -> str:
    payload = [
        {
            "name": r.name,
            "order": r.order_index,
            "semantic_id": r.semantic_id,
            "required": r.is_required_input,
            "attrs": {k.value: [v.value, v.required] for k, v in sorted(r.attributes.items(), key=lambda kv: kv[0].value)},
        }
        for r in sorted(inputs, key=lambda r: r.order_index)
    ]
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()


def parse_requirements(env: dict, ctx: SemanticContext) -> RequirementSet:
    warnings: list[str] = []
    cds = ConceptDescriptionIndex(env.get("conceptDescriptions"))
    model_name = model_version = aas_id = None
    shells = env.get("assetAdministrationShells") or []
    if shells:
        aas_id = shells[0].get("id")

    raw_inputs: list[tuple[dict, str]] = []
    submodel = None
    if isinstance(env.get("inputs"), list) and not env.get("submodels"):
        # model_version.inputs (jsonb) 형식
        raw_inputs = [(_inputs_dict_to_smc(i, n), "/inputs") for n, i in enumerate(env["inputs"])]
        model_name, model_version = env.get("model_name"), env.get("model_version")
    else:
        submodel = find_nameplate_submodel(env)
        if not submodel:
            raise ValueError("AI Model Nameplate 서브모델을 찾을 수 없습니다.")
        found = _find_input_container(submodel.get("submodelElements", []))
        if not found:
            raise ValueError("AI Model Nameplate 서브모델에서 입력 파라미터(Inputs) 컬렉션을 찾을 수 없습니다.")
        container, path = found
        raw_inputs = [(el, path) for el in _children(container)]
        model_name, model_version = _find_model_identity(submodel)

    inputs: list[ModelInputRequirement] = []
    for idx, (el, path) in enumerate(raw_inputs):
        req, overrides = _build_input(idx, el, path, cds, warnings)
        notes: list[str] = []
        req = enrich_requirement(ctx, req, notes)
        req = _apply_required_policy(req, overrides)
        warnings += [f"{req.name}: {n}" for n in notes]
        if not req.attr(Attr.DATA_TYPE).known:
            warnings.append(f"{req.name}: 자료형 미확인")
        inputs.append(req)

    inputs.sort(key=lambda r: r.order_index)
    names = [r.name for r in inputs]
    dup = {n for n in names if names.count(n) > 1}
    if dup:
        warnings.append(f"입력항목명 중복: {sorted(dup)}")

    return RequirementSet(
        requirement_set_id=f"req_{uuid.uuid4().hex[:12]}",
        model_name=model_name,
        model_version=model_version,
        aas_identifier=aas_id,
        submodel_id=(submodel or {}).get("id"),
        submodel_semantic_id=_ref_value((submodel or {}).get("semanticId")),
        inputs=inputs,
        warnings=warnings,
        content_hash=requirement_hash(inputs),
    )


def _find_model_identity(submodel: dict) -> tuple[Optional[str], Optional[str]]:
    name = version = None

    def walk(els):
        nonlocal name, version
        for el in els or []:
            key = (el.get("idShort") or "").lower()
            if key in ("modelname", "name") and name is None and _model_type(el) in ("Property", "MultiLanguageProperty"):
                name = _element_value(el)
            if key in ("version", "modelversion") and version is None:
                version = _element_value(el)
            if INPUT_CONTAINER_RE.match(el.get("idShort", "") or ""):
                continue
            walk(_children(el))

    walk(submodel.get("submodelElements", []))
    return name, version


def _inputs_dict_to_smc(d: dict, n: int) -> dict:
    """{'name':..,'unit':..} → SMC 유사 구조로 변환하여 동일 파서를 재사용."""
    value = []
    for k, v in d.items():
        if k in ("semantic_id", "semanticId"):
            continue
        value.append({"idShort": k, "modelType": "Property", "value": v})
    out = {"idShort": d.get("id_short") or d.get("name") or f"Input_{n + 1}", "modelType": "SubmodelElementCollection", "value": value}
    if d.get("semantic_id") or d.get("semanticId"):
        out["semanticId"] = d.get("semantic_id") or d.get("semanticId")
    return out
