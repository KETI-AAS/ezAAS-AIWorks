"""단위 레지스트리 및 단위 호환성 판단 (특허 7.2절).

각 단위는 (물리량, 배율, 기준점 오프셋) 으로 정의한다.
    SI 값 = 원값 * factor + offset
원천 단위 → 요구 단위 변환식:  y = x * scale + offset
    scale  = f_src / f_tgt
    offset = (o_src - o_tgt) / f_tgt
예) m/s → mm/s : scale = 1 / 0.001 = 1000
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from app.mapping.schemas.candidate import UnitCompatibility, UnitConversion


@dataclass(frozen=True)
class UnitDef:
    symbol: str
    quantity: str
    factor: float
    offset: float = 0.0
    name: str = ""


_UNITS: list[UnitDef] = [
    # velocity
    UnitDef("m/s", "velocity", 1.0, name="metre per second"),
    UnitDef("mm/s", "velocity", 1e-3, name="millimetre per second"),
    UnitDef("cm/s", "velocity", 1e-2, name="centimetre per second"),
    UnitDef("µm/s", "velocity", 1e-6, name="micrometre per second"),
    UnitDef("in/s", "velocity", 0.0254, name="inch per second"),
    UnitDef("km/h", "velocity", 1 / 3.6, name="kilometre per hour"),
    # acceleration
    UnitDef("m/s²", "acceleration", 1.0, name="metre per second squared"),
    UnitDef("mm/s²", "acceleration", 1e-3, name="millimetre per second squared"),
    UnitDef("g", "acceleration", 9.80665, name="standard gravity"),
    # displacement / length
    UnitDef("m", "length", 1.0, name="metre"),
    UnitDef("mm", "length", 1e-3, name="millimetre"),
    UnitDef("µm", "length", 1e-6, name="micrometre"),
    UnitDef("in", "length", 0.0254, name="inch"),
    # temperature
    UnitDef("K", "temperature", 1.0, 0.0, name="kelvin"),
    UnitDef("°C", "temperature", 1.0, 273.15, name="degree Celsius"),
    UnitDef("°F", "temperature", 5 / 9, 273.15 - 32 * 5 / 9, name="degree Fahrenheit"),
    # pressure
    UnitDef("Pa", "pressure", 1.0, name="pascal"),
    UnitDef("kPa", "pressure", 1e3, name="kilopascal"),
    UnitDef("MPa", "pressure", 1e6, name="megapascal"),
    UnitDef("bar", "pressure", 1e5, name="bar"),
    UnitDef("mbar", "pressure", 1e2, name="millibar"),
    UnitDef("psi", "pressure", 6894.757293168, name="pound per square inch"),
    # electric current / voltage / power
    UnitDef("A", "electric_current", 1.0, name="ampere"),
    UnitDef("mA", "electric_current", 1e-3, name="milliampere"),
    UnitDef("V", "voltage", 1.0, name="volt"),
    UnitDef("mV", "voltage", 1e-3, name="millivolt"),
    UnitDef("kV", "voltage", 1e3, name="kilovolt"),
    UnitDef("W", "power", 1.0, name="watt"),
    UnitDef("kW", "power", 1e3, name="kilowatt"),
    # frequency / rotational speed
    UnitDef("Hz", "frequency", 1.0, name="hertz"),
    UnitDef("kHz", "frequency", 1e3, name="kilohertz"),
    UnitDef("rpm", "rotational_speed", 1.0, name="revolution per minute"),
    UnitDef("rps", "rotational_speed", 60.0, name="revolution per second"),
    # time
    UnitDef("s", "time", 1.0, name="second"),
    UnitDef("ms", "time", 1e-3, name="millisecond"),
    UnitDef("min", "time", 60.0, name="minute"),
    UnitDef("h", "time", 3600.0, name="hour"),
    # mass / force / torque
    UnitDef("kg", "mass", 1.0, name="kilogram"),
    UnitDef("N", "force", 1.0, name="newton"),
    UnitDef("kN", "force", 1e3, name="kilonewton"),
    UnitDef("N·m", "torque", 1.0, name="newton metre"),
    # flow
    UnitDef("L/min", "volume_flow", 1.0 / 60000, name="litre per minute"),
    UnitDef("m³/h", "volume_flow", 1.0 / 3600, name="cubic metre per hour"),
    # ratio
    UnitDef("%", "ratio", 0.01, name="percent"),
    UnitDef("1", "ratio", 1.0, name="dimensionless"),
]

_BY_SYMBOL = {u.symbol: u for u in _UNITS}

# 표기 변형 → 표준 심볼
_ALIASES: dict[str, str] = {
    "m/s": "m/s", "mps": "m/s", "m/sec": "m/s", "meter/second": "m/s",
    "mm/s": "mm/s", "mm/sec": "mm/s", "mmps": "mm/s", "mm_s": "mm/s", "mms": "mm/s",
    "cm/s": "cm/s",
    "um/s": "µm/s", "μm/s": "µm/s", "µm/s": "µm/s",
    "in/s": "in/s", "ips": "in/s", "inch/s": "in/s",
    "km/h": "km/h", "kph": "km/h",
    "m/s2": "m/s²", "m/s^2": "m/s²", "m/s²": "m/s²", "m/s**2": "m/s²", "mps2": "m/s²", "m_s2": "m/s²",
    "mm/s2": "mm/s²", "mm/s^2": "mm/s²", "mm/s²": "mm/s²",
    "g": "g", "gn": "g", "g0": "g",
    "m": "m", "mm": "mm", "um": "µm", "μm": "µm", "µm": "µm", "micron": "µm", "in": "in", "inch": "in",
    "k": "K", "kelvin": "K",
    "°c": "°C", "℃": "°C", "degc": "°C", "deg_c": "°C", "celsius": "°C", "c": "°C", "도": "°C",
    "°f": "°F", "℉": "°F", "degf": "°F", "fahrenheit": "°F", "f": "°F",
    "pa": "Pa", "kpa": "kPa", "mpa": "MPa", "bar": "bar", "mbar": "mbar", "psi": "psi",
    "a": "A", "amp": "A", "ampere": "A", "ma": "mA",
    "v": "V", "volt": "V", "mv": "mV", "kv": "kV",
    "w": "W", "kw": "kW",
    "hz": "Hz", "khz": "kHz",
    "rpm": "rpm", "r/min": "rpm", "1/min": "rpm", "rev/min": "rpm", "rps": "rps", "r/s": "rps",
    "s": "s", "sec": "s", "ms": "ms", "min": "min", "h": "h", "hr": "h",
    "kg": "kg", "n": "N", "kn": "kN", "nm": "N·m", "n·m": "N·m", "n.m": "N·m", "n*m": "N·m",
    "l/min": "L/min", "lpm": "L/min", "m3/h": "m³/h", "m³/h": "m³/h",
    "%": "%", "percent": "%", "pct": "%", "1": "1", "-": "1", "ratio": "1",
}

# UCUM / QUDT 스타일 코드 일부 (AAS unitId 가 이런 형식일 수 있음)
_CODE_ALIASES: dict[str, str] = {
    "unit:MilliM-PER-SEC": "mm/s", "unit:M-PER-SEC": "m/s", "unit:M-PER-SEC2": "m/s²",
    "unit:DEG_C": "°C", "unit:KiloPA": "kPa", "unit:BAR": "bar", "unit:A": "A", "unit:V": "V",
    "unit:REV-PER-MIN": "rpm", "unit:HZ": "Hz",
    "mm/s{ucum}": "mm/s", "Cel": "°C", "[psi]": "psi", "{rpm}": "rpm",
}


def normalize_unit(raw: Optional[str]) -> Optional[str]:
    """단위 문자열을 표준 심볼로 정규화. 인식 불가 시 None."""
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if s in _CODE_ALIASES:
        return _CODE_ALIASES[s]
    s = s.strip("[]() ")
    if s in _BY_SYMBOL:
        return s
    key = s.lower().replace(" ", "")
    return _ALIASES.get(key)


def get_unit(symbol: Optional[str]) -> Optional[UnitDef]:
    norm = normalize_unit(symbol)
    return _BY_SYMBOL.get(norm) if norm else None


def quantity_of(symbol: Optional[str]) -> Optional[str]:
    u = get_unit(symbol)
    return u.quantity if u else None


def unit_display_name(symbol: Optional[str]) -> str:
    u = get_unit(symbol)
    return u.name if u else ""


def check_unit_compatibility(
    source_unit: Optional[str], target_unit: Optional[str]
) -> tuple[UnitCompatibility, Optional[UnitConversion], str]:
    """단위 관계 판단 → (상태, 변환식, 설명)."""
    if not target_unit:
        return UnitCompatibility.UNKNOWN, None, "모델 요구 단위 정보가 없음"
    if not source_unit:
        return UnitCompatibility.UNKNOWN, None, "원천 컬럼의 단위 정보가 없음"
    src, tgt = get_unit(source_unit), get_unit(target_unit)
    if tgt is None:
        return UnitCompatibility.UNKNOWN, None, f"요구 단위 '{target_unit}' 를 단위 레지스트리에서 인식할 수 없음"
    if src is None:
        return UnitCompatibility.UNKNOWN, None, f"원천 단위 '{source_unit}' 를 단위 레지스트리에서 인식할 수 없음"
    if src.symbol == tgt.symbol:
        conv = UnitConversion(source_unit=src.symbol, target_unit=tgt.symbol, quantity=tgt.quantity, scale=1.0)
        return UnitCompatibility.MATCH, conv, f"단위 일치 ({tgt.symbol})"
    if src.quantity != tgt.quantity:
        return (
            UnitCompatibility.INCOMPATIBLE,
            None,
            f"물리량이 달라 단위 변환 불가 ({src.symbol}: {src.quantity} ≠ {tgt.symbol}: {tgt.quantity})",
        )
    scale = src.factor / tgt.factor
    offset = (src.offset - tgt.offset) / tgt.factor
    scale = float(f"{scale:.12g}")
    offset = float(f"{offset:.12g}")
    conv = UnitConversion(source_unit=src.symbol, target_unit=tgt.symbol, quantity=tgt.quantity, scale=scale, offset=offset)
    return UnitCompatibility.CONVERTIBLE, conv, f"변환 가능 {src.symbol} → {tgt.symbol} ({conv.expression})"


_UNIT_IN_NAME = re.compile(r"[\[\(]\s*([^\]\)]+?)\s*[\]\)]")


def extract_unit_from_text(text: str) -> Optional[tuple[str, str]]:
    """컬럼명/설명 문자열에서 단위 후보 추출 → (표준심볼, 매칭 문자열).

    괄호 표기 ``Speed [rpm]``, ``Temp(°C)`` 를 우선 보고, 이후 구분자 토큰
    (``Vib_mm_s``, ``Temp_degC``) 을 검사한다. 단일 문자 토큰(예: 'A','V','g')은
    오탐이 많으므로 괄호 안에 있을 때만 인정한다.
    """
    if not text:
        return None
    for m in _UNIT_IN_NAME.finditer(text):
        norm = normalize_unit(m.group(1))
        if norm:
            return norm, m.group(0)
    # 구분자 기반: 2토큰 결합(mm_s, m_s2) 우선
    parts = [p for p in re.split(r"[_\-\s.]+", text) if p]
    for i in range(len(parts) - 1):
        joined = f"{parts[i]}/{parts[i + 1]}"
        norm = normalize_unit(joined)
        if norm and "/" in norm:
            return norm, f"{parts[i]}_{parts[i + 1]}"
    for p in parts[1:]:  # 첫 토큰은 보통 의미어
        if len(p) < 2:
            continue
        norm = normalize_unit(p)
        if norm and p.lower() not in {"in", "min", "h", "s", "m", "ms", "c", "f", "n", "nm", "w"}:
            return norm, p
    return None
