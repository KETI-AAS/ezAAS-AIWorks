# ezAAS-AIWorks
ezAIWorks는 AAS 기반으로 제조 AI 모델과 데이터셋을 등록·검색하고, Legacy 제조데이터의 의미 매핑과 전처리, 모델 적합성 검증 및 AI 추론을 지원하는 제조 AI 활용 플랫폼입니다.

## Repository 목적 및 초기 구조

이 저장소는 통합 프론트엔드와 3개의 독립 FastAPI 백엔드(모델 등록/탐색, 데이터셋 오케스트레이션, AI 배포)를 포함하는 모노레포 형태의 초기 프로젝트 구조를 제공합니다.

루트에 있는 `frontend/`는 Next.js 기반 프론트엔드를 포함하고, `services/` 아래에 각 백엔드 서비스의 초기 템플릿이 위치합니다. 로컬 통합 실행은 `docker-compose.yml`을 사용합니다.

자세한 내용은 docs/ 및 각 서비스의 README를 확인하세요.
