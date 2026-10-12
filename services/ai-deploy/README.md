# AI Deploy

초기 템플릿 FastAPI 서비스입니다. 모델 배포/추론을 담당하며 Ray Serve를 실행환경으로 사용하도록 확장할 수 있습니다.

실행
```bash
cd services/ai-deploy
poetry install
uvicorn app.main:app --reload --port 8003
```

기본 엔드포인트
- `GET /health` - 서비스 상태 확인
