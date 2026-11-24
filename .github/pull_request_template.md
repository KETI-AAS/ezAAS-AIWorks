작업 서비스:

변경 범위: Frontend / Backend / Infra / Docs

요약:

검증 방법:
- 로컬: docker-compose up 후 각 서비스의 `/health` 확인
- Frontend: pnpm install && pnpm build
- Backend: 각 서비스에서 poetry install && pytest

영향:

DB 마이그레이션:

환경변수 변경:

관련 이슈:
