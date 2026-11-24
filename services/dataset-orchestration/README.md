# Dataset Orchestration

초기 템플릿 FastAPI 서비스입니다. 이 서비스는 제조데이터 연결 및 전처리 파이프라인을 담당하도록 확장됩니다.

실행
```bash
cd services/dataset-orchestration
poetry install
uvicorn app.main:app --reload --port 8002
```

기본 엔드포인트
- `GET /health` - 서비스 상태 확인
