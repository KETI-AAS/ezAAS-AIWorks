from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from fastapi.testclient import TestClient

from app.main import app
from app.services import aasxtojson


client = TestClient(app)


def test_rejects_non_aasx_file():
    response = client.post(
        "/api/v1/aasx/convert",
        files={"file": ("model.txt", b"not an aasx", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only .aasx files are accepted"


def test_converts_aas31_aasx(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(aasxtojson, "STORAGE_ROOT", tmp_path)
    payload = _minimal_aas31_package()

    response = client.post(
        "/api/v1/aasx/convert",
        files={
            "file": (
                "example.aasx",
                payload,
                "application/asset-administration-shell-package",
            )
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["modelVersions"] == ["3.1"]
    assert body["identifiableCount"] == 1
    assert body["environment"]["submodels"][0]["id"] == "urn:test:submodel"

    output_dir = tmp_path / body["conversionId"]
    assert (output_dir / "example.json").is_file()
    assert (output_dir / "example.sanitized.aasx").is_file()


def _minimal_aas31_package() -> bytes:
    output = BytesIO()
    with ZipFile(output, "w") as package:
        package.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>""",
        )
        package.writestr(
            "_rels/.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="origin" Type="http://admin-shell.io/aasx/relationships/aasx-origin" Target="/aasx/aasx-origin"/>
</Relationships>""",
        )
        package.writestr("aasx/aasx-origin", b"")
        package.writestr(
            "aasx/_rels/aasx-origin.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="spec" Type="http://admin-shell.io/aasx/relationships/aas-spec" Target="model.xml"/>
</Relationships>""",
        )
        package.writestr(
            "aasx/model.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
<environment xmlns="https://admin-shell.io/aas/3/1">
  <submodels>
    <submodel>
      <id>urn:test:submodel</id>
      <idShort>TestSubmodel</idShort>
    </submodel>
  </submodels>
</environment>""",
        )
    return output.getvalue()
