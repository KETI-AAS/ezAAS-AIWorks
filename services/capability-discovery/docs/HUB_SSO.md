# 로컬 SSO 왕복 테스트

이 절차는 DB 없이 **가상 허브 사용자 42번**의 코드 발급, 교환, Capability 세션을 검사합니다. 실제 허브 계정 로그인은 검사하지 않습니다. 기존 허브 `main.py`는 BaSyx JVM과 기존 실행 환경이 필요하므로, 테스트에서는 별도 `sso_demo.py`를 사용합니다.

두 서버의 의존성을 설치합니다. 허브의 `aas_repo_back`에서는 `python -m pip install fastapi uvicorn PyJWT PyYAML`, Capability의 `services/capability-discovery`에서는 `python -m pip install -e .`를 실행합니다. 가능하면 각각 가상환경을 사용하세요. 허브 터미널에서 `python -c "import jwt"`가 실패하면 `python -m pip install PyJWT==2.10.1`을 실행한 뒤 허브 서버를 다시 시작하세요.

터미널 1을 **허브 `ezAAS-modelHub/aas_repo_back`**에서 실행합니다.

```powershell
$env:HUB_SSO_DEMO_SIGNING_KEY = 'LOCAL-TEST-ONLY-hub-signing-key-0123456789abcdef'
$env:CAPABILITY_SSO_CLIENT_SECRET = 'LOCAL-TEST-ONLY-shared-client-secret-0123456789abcdef'
python -m uvicorn sso_demo:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

터미널 2를 **Capability `AIWORKS/services/capability-discovery`**에서 실행합니다.

```powershell
$env:CAPABILITY_SSO_ENABLED = 'true'
$env:HUB_SSO_BASE_URL = 'http://localhost:8000'
$env:CAPABILITY_SSO_CALLBACK_URL = 'http://localhost:8001/auth/hub/callback'
$env:CAPABILITY_SSO_CLIENT_ID = 'capability'
$env:CAPABILITY_SSO_CLIENT_SECRET = 'LOCAL-TEST-ONLY-shared-client-secret-0123456789abcdef'
$env:CAPABILITY_SSO_ALLOW_LOCAL_HTTP = 'true'
$env:CAPABILITY_SSO_COOKIE_SECURE = 'false'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1 --no-access-log
```

터미널 3을 같은 **Capability 폴더**에서 실행합니다.

```powershell
$env:HUB_SSO_DEMO_SIGNING_KEY = 'LOCAL-TEST-ONLY-hub-signing-key-0123456789abcdef'
python tests/live_sso_smoke.py
```

`PASS`는 양쪽 서버 확인, 코드 발급, 콜백, `/auth/me`, 코드 재사용 거절까지 성공했다는 뜻입니다. 끝나면 서버 터미널 각각에서 Ctrl+C를 누릅니다. 세 요청은 같은 브라우저 세션에서 진행되어야 하며, 테스트 스크립트는 그 세션의 쿠키를 유지합니다. 재시작하면 메모리의 코드·세션이 사라집니다.

위 고정 키는 **localhost 전용 가상 사용자 테스트 값**입니다. 운영 설정이나 실제 사용자 인증에는 사용하지 마세요. 현재 허브에는 Capability 요청을 받아 자동으로 왕복시키는 화면이 없습니다. 따라서 기존 로그인 버튼만으로 이 흐름이 실행되지는 않습니다.
