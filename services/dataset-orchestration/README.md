# Dataset Orchestration

레거시 제조데이터를 받아 **의미 매핑 → 공통·특화 전처리 → AI-Ready 데이터셋 생성**까지 수행하는 서비스입니다.

```bash
cd services/dataset-orchestration
poetry install            # 또는: pip install fastapi uvicorn pandas numpy python-multipart openpyxl httpx pytest
uvicorn app.main:app --reload --port 8002
pytest -q                 # 특허 실시예 재현 테스트 포함
```
Swagger: http://localhost:8002/docs

## 구조

```
app/
  main.py          # 앱 진입점, /health, 라우터 등록
  mapping/         # 의미 매핑 (AAS 입력 요구조건 ↔ 레거시 컬럼) → MappingSpec
  preprocessing/   # 공통·특화 전처리 (MappingSpec 기반)
tests/
  mapping/
examples/
  mapping/
```

`mapping` 과 `preprocessing` 사이의 경계는 `MappingSpec`(`app/mapping/schemas/mapping.py`) 입니다.
`preprocessing` 은 `mapping` 내부 모듈을 직접 import 하지 않고 `MappingSpec` 과 데이터셋만 입력으로 받습니다.

## Mapping (`app/mapping/`)

AI Model Nameplate 의 입력 파라미터(semanticId · Concept Description)로 모델 입력 요구조건을 구성하고,
레거시 제조데이터에서 대응 컬럼을 찾아 → 요구조건 기반으로 적합성을 판단·추천하고 →
사용자가 확정한 매핑 명세대로 추출·변환·검증하여 AI-Ready 데이터셋을 생성합니다.

### 특허 구성부 ↔ 코드

| 구성부 (특허 2절) | 모듈 | 핵심 동작 |
|---|---|---|
| AAS 입력정보 해석부 | `app/mapping/core/aas_parser.py` | Nameplate → `Inputs` 탐색, semanticId → Concept Description(IEC 61360) 조회, 요구조건 구조화, 필수 조건 정책 |
| 레거시 데이터 분석부 | `app/mapping/core/legacy_analyzer.py` | 원본 보존, 컬럼별 메타데이터·자료형·결측·범위 프로파일, 시간 컬럼/키/접두어 그룹 관계 |
| 의미정보 처리부 | `app/mapping/core/semantic/` | 의미사전(`dictionary.py`), 지식그래프(`knowledge_graph.py`), 약어/LLM 해석(`interpreter.py`), 의미 보완(`enricher.py`) |
| 후보 검색부 | `app/mapping/core/embedding.py`, `retriever.py` | 의미 표현 임베딩 → 코사인 유사도 Top-K (K: 사용자/기본/√N 자동) |
| 후보 적합성 판단부 | `app/mapping/core/evaluator.py`, `units.py` | 개념·물리량·단위·자료형·대상·위치·표현방식 비교 → 일치/변환 가능/불일치/정보 부족, 추천 등급·순위 |
| 사용자 확인부 | `app/mapping/services/pipeline.py` (`review`, `apply_decisions`) | 추천 근거·명시/추정 구분·미확인 항목·변환 미리보기 제공, 수락/선택/보완(재판단)/미매핑 |
| 매핑·변환 명세 구성부 | `pipeline.confirm` → `app/mapping/schemas/mapping.py:MappingSpec` | 대상·원천·대응·변환·확인 정보를 하나의 명세로, spec_hash |
| 데이터셋 생성·검증부 | `app/mapping/core/dataset_builder.py` | **명세만을 실행 기준으로** 추출·변환·정렬·결측처리, 최종 검증(필수 존재/순서/자료형/단위 적용/값 조건) |
| 저장·이력 관리부 | `app/mapping/storage/repository.py` | 요구조건·분석·빌드·명세·데이터셋·이벤트 저장, 명세 재사용 및 변경 영향 분석 |

### 정보 상태(근거) 모델 — `app/mapping/schemas/common.py`

모든 속성값은 `Fact{value, status, evidence[]}` 입니다.

| status | 의미 | 예 |
|---|---|---|
| `explicit` | 원천에 구조적으로 명시 | AAS `Unit`, CD `unit`, 레거시 메타데이터 `unit: m/s` |
| `derived` | 명시 정보로부터 결정론적으로 도출 | 명시 단위 → 물리량, AAS 정의/컬럼 설명문의 용어 매칭 |
| `user_supplied` | 사용자 보완 | 확인 단계에서 입력한 단위·위치 |
| `inferred` | 추정 | 컬럼명 약어(`Vib`, `DE`), LLM 해석 |
| `unknown` | 근거 없음 | — |

- 추정값은 명시값을 덮어쓰지 못합니다 (`merge_fact`).
- **필수 조건**은 AAS 근거(explicit/derived)로 확보된 속성에만 적용됩니다.
- 불일치가 **양측 모두 확인된 정보**에 근거하면 `excluded`(우선 추천 제외), 추정 정보에 근거하면 `suspected_mismatch`(확인 필요).
- 값의 범위·분포는 품질 hint 로만 제공하고 물리량·단위 판단에는 사용하지 않습니다.

### 판단 규칙 요약 — `evaluator.py`

| 검토 | 결과 |
|---|---|
| 개념 | 동일/하위개념 → 일치, 상위(일반)개념 → 정보 부족, 관련(related)·상반·무관 → 불일치 |
| 물리량 | 같으면 일치, 다르면 불일치, 없으면 정보 부족 |
| 단위 | `unit_match` / `convertible`(y = x·scale + offset) / `incompatible` / `unknown` |
| 자료형 | 일치 / 변환(int→float, 숫자문자열→float 등) / 불일치 |
| 대상·위치·표현방식 | 동일·하위 → 일치, 포괄 → 정보 부족, 상이 → 불일치 |

추천 등급: `recommended` > `needs_review` > `suspected_mismatch` > `excluded` → 같은 등급은 `0.4·유사도 + 0.6·조건점수`.
`recommended` 후보가 없으면 **강제 매핑하지 않고** `needs_user_input` 으로 둡니다.

### API (prefix `/api/v1/mapping`)

| 단계 | Method & Path |
|---|---|
| 요구조건 구성 | `POST /requirements/parse` (AAS env JSON / Submodel / `{inputs:[...]}`), `POST /requirements/parse-file` |
| 레거시 등록·분석 | `POST /legacy-datasets` (multipart: `file`, `metadata` JSON) · `PATCH /legacy-datasets/{id}/columns/{col}` |
| 후보 검색·판단 | `POST /builds` `{requirement_set_id, legacy_dataset_id, top_k}` |
| 사용자 확인 | `GET /builds/{id}/review` · `POST /builds/{id}/decisions` |
| 매핑 명세 | `POST /builds/{id}/confirm` → `MappingSpec` (미해결 시 409 + blocking_issues) |
| 생성·검증 | `POST /builds/{id}/generate` `{output_format, processing}` (검증 실패 시 422 + 원인) |
| 결과 | `GET /datasets/{id}` · `GET /datasets/{id}/download` |
| 재사용·이력 | `POST /specs/{id}/reuse` (변경 영향 항목 반환) · `GET /specs?requirement_set_id&legacy_dataset_id` · `GET /history` |

`decisions` 예:
```json
{"decided_by": "euna", "decisions": [
  {"input_id": "in_01", "decision": "accept_recommendation"},
  {"input_id": "in_02", "decision": "select_candidate", "column_name": "Temp_Brg_F"},
  {"input_id": "in_03", "decision": "supplement", "column_name": "Motor_RPM", "supplement": {"unit": "rpm"}},
  {"input_id": "in_04", "decision": "leave_unmapped"}
]}
```
- 불일치 후보 선택: `acknowledge_mismatch: true` 필요 (불일치 정보는 명세에 그대로 기록)
- 단위 미확인 후보: `supplement.unit` 으로 보완하거나 `assume_target_unit: true` 로 승인해야 확정 가능
- 필수 입력은 `leave_unmapped` 불가

### 실시예 (특허 12절) — `examples/mapping/`, `tests/mapping/test_embodiment.py`

모델 입력 `DE_Bearing_VibVelocity_RMS` (구동측 · 모터 베어링 · 진동속도 · RMS · mm/s · 실수)

| 원천 컬럼 | 판단 |
|---|---|
| `Vib_DE_RMS` (구동측 진동속도 RMS, m/s) | **우선 추천**, 변환 `y = x * 1000` |
| `Acc_DE_RMS` (구동측 진동가속도 RMS, m/s²) | 개념·물리량·단위 불일치 → 제외 |
| `Vib_NDE_RMS` (반대측 진동속도 RMS, mm/s) | 측정 위치 불일치(상반 개념) → 제외 |
| `Vib_01` (설명·단위 없음) | 정보 부족 → 개념·물리량·단위·위치·표현방식 보완 요청 |

추가 입력으로 °F→°C 오프셋 변환(`Temp_Brg_F`), 정수→실수 변환(`Motor_RPM`), 선택 입력 미매핑(`Ambient_Temperature`)도 포함되어 있습니다.

```bash
# 예제 실행
curl -X POST localhost:8002/api/v1/mapping/requirements/parse -H 'Content-Type: application/json' -d @examples/mapping/motor_model_aas.json
curl -X POST localhost:8002/api/v1/mapping/legacy-datasets -F file=@examples/mapping/legacy_motor_data.csv --form-string metadata="$(cat examples/mapping/legacy_motor_metadata.json)"
```

### 확장 포인트

| 항목 | 기본값 | 교체 |
|---|---|---|
| 임베딩 | `hashing` (오프라인 n-gram) | `EMBEDDING_BACKEND=sentence_transformers` / `openai` |
| 약어·설명 해석 | `rule_based` | `INTERPRETER_BACKEND=openai` (Graph RAG 컨텍스트 제공, 결과는 항상 `inferred`) |
| 지식그래프 | 인메모리 (`app/mapping/resources/semantic_dictionary.json`) | `KG_BACKEND=neo4j` |
| 의미사전 | 시드 37개 개념 | `SEMANTIC_DICTIONARY_PATH` 로 ECLASS/IEC CDD 기반 사전 병합 (`external_ids` 에 IRDI 등록 시 semanticId 로 직접 해석) |
| 저장소 | 로컬 JSON (`SEMANTIC_MAPPING_DATA_DIR`) | `FileRepository` 인터페이스를 Postgres/MinIO 로 구현 |

시드 사전의 `external_ids`(`urn:example:cd:...`)는 예시 식별자입니다. 실제 ECLASS IRDI·IEC CDD 코드로 교체해 사용하세요.

### DB(ERD) 대응

| 서비스 객체 | 테이블 |
|---|---|
| `RequirementSet.inputs` | `model_version.inputs` (+ `serving_feature`) |
| `LegacyDataset` | `legacy_dataset` (`column_schema` ← `columns`) |
| `DatasetBuild` (`candidates`, `states`, `last_validation`) | `dataset_build` (`mapping_result`, `preprocessing_result`, `preview_result`, `current_step`) |
| `MappingSpec` | `dataset_build.mapping_result.spec` 또는 별도 `mapping_spec` 테이블 |
| `AIReadyDataset` | `ai_ready_dataset` (+ `storage_object`) |
| `history/events.jsonl` | `audit_log` |
