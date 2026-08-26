# ezAAS AI Capability Registry

AAS(Asset Administration Shell)를 기반으로 AI 모델과 데이터셋을 등록하고,
각 자산의 메타데이터와 연결 관계를 탐색하는 AI Capability Registry UI입니다.

현재 저장소는 UI 프로토타입 단계이며, 별도의 백엔드나 환경변수 없이
프로젝트에 포함된 샘플 데이터로 실행할 수 있습니다.

## 주요 화면

- **Home**: 주요 AI Asset Pair와 Registry 현황 확인
- **AI Asset Pairs**: AAS로 매핑된 모델과 데이터셋의 연관 관계 탐색
- **Datasets**: 데이터셋 목록, 상세 정보, 버전 및 AAS 메타데이터 확인
- **Models**: AI 모델 목록, 상세 정보, 버전 및 AAS 메타데이터 확인
- **Register**: AAS 파일 기반 자산 등록 및 ezModel Hub 모델 불러오기
- **Admin**: 등록 자산과 상태 관리

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- pnpm

## 실행 환경

다음 도구가 필요합니다.

- Node.js 20.9 이상
- pnpm
- Git

Node.js 설치 여부는 Git Bash에서 다음 명령으로 확인할 수 있습니다.

```bash
node -v
npm -v
```

pnpm이 없다면 다음 명령으로 활성화합니다.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

## 프로젝트 내려받기

Git Bash를 열고 원하는 폴더에서 다음 명령을 실행합니다.

```bash
git clone https://github.com/KETI-AAS/ezAAS-AICapabilityRegistry.git
cd ezAAS-AICapabilityRegistry
```

이미 프로젝트를 내려받았다면 해당 프로젝트 폴더로 이동하면 됩니다.

```bash
cd "/c/path/to/ezAAS-AICapabilityRegistry"
```

## 로컬 개발 서버 실행

의존성을 설치합니다.

```bash
pnpm install
```

개발 서버를 실행합니다.

```bash
pnpm dev
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:3000
```

개발 서버를 종료하려면 Git Bash에서 `Ctrl + C`를 누릅니다.

## 프로덕션 빌드

배포용 빌드가 정상적으로 생성되는지 확인합니다.

```bash
pnpm build
```

빌드 결과를 로컬에서 실행합니다.

```bash
pnpm start
```

## 기타 명령어

```bash
# 코드 검사
pnpm lint

# 3000번 포트가 사용 중일 때 다른 포트로 실행
pnpm dev -- -p 3001
```

다른 포트를 사용한 경우 `http://localhost:3001`로 접속합니다.

## 현재 데이터 구성

현재 화면에 표시되는 모델, 데이터셋, Asset Pair 및 AAS 정보는
`lib/registry-data.ts`와 `lib/aas` 아래의 샘플 데이터로 구성되어 있습니다.
따라서 로컬 실행을 위해 `.env` 파일이나 외부 서비스 연결은 필요하지 않습니다.

실제 운영 환경에서는 Registry API, AAS 저장소 및 ezModel Hub 연동 계층으로
샘플 데이터 부분을 교체해야 합니다.
