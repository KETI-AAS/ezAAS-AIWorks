"""HTTP API 전 과정 + 정책 검증."""


def _setup(client, aas_env, legacy_bytes, legacy_meta):
    r = client.post("/api/v1/mapping/requirements/parse", json=aas_env)
    assert r.status_code == 201, r.text
    rid = r.json()["requirement_set_id"]
    r = client.post("/api/v1/mapping/legacy-datasets",
                    files={"file": ("legacy_motor_data.csv", legacy_bytes, "text/csv")},
                    data={"metadata": legacy_meta})
    assert r.status_code == 201, r.text
    lid = r.json()["legacy_dataset_id"]
    r = client.post("/api/v1/mapping/builds", json={"requirement_set_id": rid, "legacy_dataset_id": lid, "top_k": 5})
    assert r.status_code == 201, r.text
    return rid, lid, r.json()["build_id"]


def test_full_flow(client, aas_env, legacy_bytes, legacy_meta):
    rid, lid, bid = _setup(client, aas_env, legacy_bytes, legacy_meta)

    rev = client.get(f"/api/v1/mapping/builds/{bid}/review").json()
    assert not rev["ready_to_confirm"]
    item = rev["items"][0]
    assert item["candidates"]["primary"] == "Vib_DE_RMS"
    p = item["preview"][0]
    assert abs(p["converted"] - p["source"] * 1000) < 1e-6

    # 확정 전 confirm → 409
    assert client.post(f"/api/v1/mapping/builds/{bid}/confirm", json={}).status_code == 409

    # 정책: 필수 입력 미매핑 불가 / 추천 없는 항목 수락 불가 / 불일치 후보는 명시 승인 필요
    def dec(*ds):
        return client.post(f"/api/v1/mapping/builds/{bid}/decisions", json={"decisions": list(ds)})
    assert dec({"input_id": "in_01", "decision": "leave_unmapped"}).status_code == 409
    assert dec({"input_id": "in_04", "decision": "accept_recommendation"}).status_code == 409
    assert dec({"input_id": "in_01", "decision": "select_candidate", "column_name": "Acc_DE_RMS"}).status_code == 409

    r = dec({"input_id": "in_01", "decision": "accept_recommendation"},
            {"input_id": "in_02", "decision": "accept_recommendation"},
            {"input_id": "in_03", "decision": "accept_recommendation"},
            {"input_id": "in_04", "decision": "leave_unmapped"})
    assert r.status_code == 200 and r.json()["ready_to_confirm"], r.text

    spec = client.post(f"/api/v1/mapping/builds/{bid}/confirm", json={"decided_by": "euna"})
    assert spec.status_code == 201
    spec = spec.json()

    g = client.post(f"/api/v1/mapping/builds/{bid}/generate", json={"output_format": "csv", "processing": {"missing_values": "drop_rows"}})
    assert g.status_code == 200, g.text
    ds = g.json()
    assert ds["validation"]["passed"] and ds["record_count"] == 198  # 결측 2행 제거
    dl = client.get(f"/api/v1/mapping/datasets/{ds['ai_ready_dataset_id']}/download")
    assert dl.status_code == 200 and dl.text.splitlines()[0].startswith("DE_Bearing_VibVelocity_RMS")

    hist = client.get("/api/v1/mapping/history", params={"target_id": bid}).json()
    assert {"build.created", "build.decisions"} <= {h["action"] for h in hist}

    # 동일 구조 데이터 재사용: 모든 항목 승계
    r = client.post(f"/api/v1/mapping/specs/{spec['spec_id']}/reuse", json={"legacy_dataset_id": lid})
    assert r.status_code == 200
    assert r.json()["needs_review"] == []
    rev2 = client.get(f"/api/v1/mapping/builds/{r.json()['build_id']}/review").json()
    assert rev2["ready_to_confirm"]


def test_supplement_and_reevaluate(client, aas_env, legacy_bytes, legacy_meta):
    rid, lid, bid = _setup(client, aas_env, legacy_bytes, legacy_meta)
    # Vib_01 의 정보 보완: 구동측 진동속도 RMS, mm/s → 재판단 결과 우선 추천 후보로 승격
    r = client.post(f"/api/v1/mapping/builds/{bid}/decisions", json={"decided_by": "euna", "decisions": [{
        "input_id": "in_01", "decision": "supplement", "column_name": "Vib_01",
        "supplement": {"unit": "mm/s", "measurement_location": "구동측", "value_representation": "RMS",
                       "description": "구동측 진동속도"}}]})
    assert r.status_code == 200, r.text
    cands = {c["column_name"]: c for c in r.json()["items"][0]["candidates"]["candidates"]}
    v = cands["Vib_01"]
    assert v["tier"] == "recommended" and v["category"] == "match"
    loc = next(c for c in v["checks"] if c["attribute"] == "measurement_location")
    assert loc["candidate_status"] == "user_supplied"

    lds = client.get(f"/api/v1/mapping/legacy-datasets/{lid}").json()
    col = next(c for c in lds["columns"] if c["column_name"] == "Vib_01")
    assert col["metadata"]["extra"]["_user_fields"]


def test_unknown_unit_blocks_until_resolved(client, aas_env, legacy_bytes):
    # 메타데이터 없이 업로드 → Vib_DE_RMS 단위 미확인
    r = client.post("/api/v1/mapping/requirements/parse", json=aas_env)
    rid = r.json()["requirement_set_id"]
    lid = client.post("/api/v1/mapping/legacy-datasets", files={"file": ("d.csv", legacy_bytes, "text/csv")}).json()["legacy_dataset_id"]
    bid = client.post("/api/v1/mapping/builds", json={"requirement_set_id": rid, "legacy_dataset_id": lid}).json()["build_id"]
    base = [{"input_id": "in_02", "decision": "select_column", "column_name": "Temp_Brg_F"},
            {"input_id": "in_03", "decision": "accept_recommendation"},
            {"input_id": "in_04", "decision": "leave_unmapped"}]
    r = client.post(f"/api/v1/mapping/builds/{bid}/decisions", json={"decisions": base + [
        {"input_id": "in_01", "decision": "select_column", "column_name": "Vib_DE_RMS"}]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert not body["ready_to_confirm"]
    assert any("단위" in b for b in body["blocking_issues"])
    # 단위 보완(m/s) → ×1000 변환 조건 확보 → 확정 가능
    r = client.post(f"/api/v1/mapping/builds/{bid}/decisions", json={"decisions": [
        {"input_id": "in_01", "decision": "supplement", "column_name": "Vib_DE_RMS", "supplement": {"unit": "m/s"}},
        {"input_id": "in_02", "decision": "supplement", "column_name": "Temp_Brg_F", "supplement": {"unit": "°F"}},
        {"input_id": "in_01", "decision": "select_column", "column_name": "Vib_DE_RMS"},
        {"input_id": "in_02", "decision": "select_column", "column_name": "Temp_Brg_F"}]})
    assert r.status_code == 200, r.text
    assert r.json()["ready_to_confirm"], r.json()["blocking_issues"]
    spec = client.post(f"/api/v1/mapping/builds/{bid}/confirm", json={}).json()
    e = next(x for x in spec["entries"] if x["input_id"] == "in_01")
    assert e["transform"]["unit_conversion"]["scale"] == 1000
    assert e["confirmation"]["supplemented_info"]["unit"] == "m/s"


def test_validation_failure_on_value_condition(service, build):
    from app.mapping.schemas.build import GenerateRequest
    from app.mapping.schemas.mapping import DecisionRequest, UserDecision

    # 범위 조건(0~50 mm/s)을 위반하도록 Vib_NDE_RMS 를 승인하고 선택하는 대신,
    # 요구조건 상한을 낮춰 검증 실패를 유도
    rs = service.get_requirements(build.requirement_set_id)
    rs.inputs[0].value_condition.max = 1.0
    service.repo.save("requirements", rs.requirement_set_id, rs)
    service.apply_decisions(build.build_id, DecisionRequest(decisions=[
        UserDecision(input_id="in_01", decision="accept_recommendation"),
        UserDecision(input_id="in_02", decision="accept_recommendation"),
        UserDecision(input_id="in_03", decision="accept_recommendation"),
        UserDecision(input_id="in_04", decision="leave_unmapped")]))
    service.confirm(build.build_id)
    ds, report = service.generate(build.build_id, GenerateRequest())
    assert ds is None and not report.passed
    assert any(i.code == "VALUE_CONDITION" and i.input_id == "in_01" for i in report.issues)
    assert service.get_build(build.build_id).current_step.value == "validation_failed"


def test_reuse_detects_schema_change(client, aas_env, legacy_bytes, legacy_meta):
    import io, json
    import pandas as pd

    rid, lid, bid = _setup(client, aas_env, legacy_bytes, legacy_meta)
    client.post(f"/api/v1/mapping/builds/{bid}/decisions", json={"decisions": [
        {"input_id": "in_01", "decision": "accept_recommendation"},
        {"input_id": "in_02", "decision": "accept_recommendation"},
        {"input_id": "in_03", "decision": "accept_recommendation"},
        {"input_id": "in_04", "decision": "leave_unmapped"}]})
    spec = client.post(f"/api/v1/mapping/builds/{bid}/confirm", json={}).json()

    # 새 데이터: Vib_DE_RMS 단위가 mm/s 로 바뀜, Motor_RPM 컬럼 제거
    df = pd.read_csv(io.BytesIO(legacy_bytes)).drop(columns=["Motor_RPM"])
    meta = json.loads(legacy_meta)
    meta["columns"]["Vib_DE_RMS"]["unit"] = "mm/s"
    lid2 = client.post("/api/v1/mapping/legacy-datasets",
                       files={"file": ("new.csv", df.to_csv(index=False).encode(), "text/csv")},
                       data={"metadata": json.dumps(meta)}).json()["legacy_dataset_id"]
    r = client.post(f"/api/v1/mapping/specs/{spec['spec_id']}/reuse", json={"legacy_dataset_id": lid2}).json()
    affected = {i["input_id"]: i["reasons"] for i in r["needs_review"]}
    assert "in_01" in affected and any("단위 변경" in x for x in affected["in_01"])
    assert "in_03" in affected and any("없음" in x for x in affected["in_03"])
    assert "in_02" not in affected
