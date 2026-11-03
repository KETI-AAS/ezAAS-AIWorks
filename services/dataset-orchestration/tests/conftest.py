import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
EXAMPLES = ROOT / "examples" / "mapping"

from app.mapping.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from app.mapping.services.pipeline import MappingService  # noqa: E402


@pytest.fixture()
def service(tmp_path) -> MappingService:
    s = Settings()
    s.data_dir = tmp_path / "data"
    return MappingService(s)


@pytest.fixture()
def client(service) -> TestClient:
    return TestClient(create_app(service))


@pytest.fixture()
def aas_env() -> dict:
    return json.loads((EXAMPLES / "motor_model_aas.json").read_text(encoding="utf-8"))


@pytest.fixture()
def legacy_bytes() -> bytes:
    return (EXAMPLES / "legacy_motor_data.csv").read_bytes()


@pytest.fixture()
def legacy_meta() -> str:
    return (EXAMPLES / "legacy_motor_metadata.json").read_text(encoding="utf-8")


@pytest.fixture()
def build(service, aas_env, legacy_bytes, legacy_meta):
    rs = service.parse_requirements(aas_env)
    ds = service.register_legacy(legacy_bytes, "legacy_motor_data.csv", legacy_meta)
    return service.create_build(rs.requirement_set_id, ds.legacy_dataset_id, top_k=5)
