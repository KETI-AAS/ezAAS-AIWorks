"""프론트엔드 mock-aas 형식 / model_version.inputs(jsonb) 형식 호환."""
from app.mapping.schemas.requirement import Attr


def test_frontend_mock_nameplate(service):
    env = {"submodels": [{
        "idShort": "AIModelNameplate", "id": "urn:aas:sm:model:1:nameplate", "modelType": "Submodel",
        "semanticId": {"type": "ExternalReference", "keys": [{"type": "GlobalReference", "value": "https://admin-shell.io/idta/AIModelNameplate/1/0"}]},
        "submodelElements": [
            {"idShort": "GeneralInformation", "modelType": "SubmodelElementCollection", "value": [
                {"idShort": "ModelName", "modelType": "Property", "valueType": "xs:string", "value": "PdM"},
                {"idShort": "Version", "modelType": "Property", "valueType": "xs:string", "value": "2.1"}]},
            {"idShort": "Inputs", "modelType": "SubmodelElementCollection", "value": [
                {"idShort": "Input_1", "modelType": "SubmodelElementCollection", "value": [
                    {"idShort": "Name", "modelType": "Property", "valueType": "xs:string", "value": "spindle_temp"},
                    {"idShort": "Type", "modelType": "Property", "valueType": "xs:string", "value": "float32"},
                    {"idShort": "Shape", "modelType": "Property", "valueType": "xs:string", "value": "[1]"},
                    {"idShort": "Description", "modelType": "MultiLanguageProperty", "value": [{"language": "ko", "text": "주축 온도 (℃)"}]}]}]}]}]}
    rs = service.parse_requirements(env)
    assert rs.model_name == "PdM" and rs.model_version == "2.1"
    r = rs.inputs[0]
    assert r.attr(Attr.DATA_TYPE).value == "float"
    assert r.attr(Attr.QUANTITY).value == "temperature"
    # 단위는 설명문에만 있으므로 명시 단위로 확정하지 않음 → 미확인
    assert not r.attr(Attr.UNIT).known


def test_model_version_inputs_jsonb(service):
    rs = service.parse_requirements({"model_name": "m", "inputs": [
        {"name": "vib_de", "type": "xs:double", "unit": "mm/s", "description": "구동측 진동속도 RMS"},
        {"name": "rpm", "type": "xs:double", "unit": "rpm", "required": False}]})
    assert [r.name for r in rs.inputs] == ["vib_de", "rpm"]
    assert rs.inputs[0].attr(Attr.MEASUREMENT_LOCATION).value == "drive_end"
    assert rs.inputs[1].is_required_input is False
