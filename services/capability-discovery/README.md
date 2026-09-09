# Capability Discovery

초기 템플릿 FastAPI 서비스입니다. 이 서비스는 모델/데이터셋 등록 및 검색을 담당하도록 확장됩니다.

실행
```bash
cd services/capability-discovery
poetry install
uvicorn app.main:app --reload --port 8001
```

기본 엔드포인트
- `GET /health` - 서비스 상태 확인
