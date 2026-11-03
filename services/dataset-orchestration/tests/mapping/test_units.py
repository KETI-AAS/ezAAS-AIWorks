import pytest

from app.mapping.core.units import check_unit_compatibility, extract_unit_from_text, normalize_unit
from app.mapping.schemas.candidate import UnitCompatibility


def test_scale_conversion_m_s_to_mm_s():
    st, conv, _ = check_unit_compatibility("m/s", "mm/s")
    assert st == UnitCompatibility.CONVERTIBLE
    assert conv.scale == pytest.approx(1000.0) and conv.offset == 0
    assert conv.expression == "y = x * 1000"


def test_offset_conversion_fahrenheit_to_celsius():
    st, conv, _ = check_unit_compatibility("°F", "°C")
    assert st == UnitCompatibility.CONVERTIBLE
    assert 212 * conv.scale + conv.offset == pytest.approx(100.0)
    assert 32 * conv.scale + conv.offset == pytest.approx(0.0, abs=1e-9)


def test_unit_states():
    assert check_unit_compatibility("mm/s", "mm/s")[0] == UnitCompatibility.MATCH
    assert check_unit_compatibility("m/s²", "mm/s")[0] == UnitCompatibility.INCOMPATIBLE
    assert check_unit_compatibility(None, "mm/s")[0] == UnitCompatibility.UNKNOWN
    assert check_unit_compatibility("furlong/fortnight", "mm/s")[0] == UnitCompatibility.UNKNOWN


@pytest.mark.parametrize("raw,norm", [("mm/sec", "mm/s"), ("m/s^2", "m/s²"), ("℃", "°C"), ("degF", "°F"), ("RPM", "rpm"), ("kpa", "kPa")])
def test_aliases(raw, norm):
    assert normalize_unit(raw) == norm


def test_extract_unit_from_name():
    assert extract_unit_from_text("Speed [rpm]")[0] == "rpm"
    assert extract_unit_from_text("Vib_mm_s")[0] == "mm/s"
    assert extract_unit_from_text("Temp_degC")[0] == "°C"
    assert extract_unit_from_text("Vib_DE_RMS") is None
