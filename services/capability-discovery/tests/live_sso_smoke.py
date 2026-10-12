"""Two-server local SSO smoke test; uses only a synthetic user."""
import base64
import hashlib
import hmac
import json
import os
import sys
import time

import httpx


def encode(value):
    raw = json.dumps(value, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def demo_jwt(key):
    now = int(time.time())
    content = encode({"alg": "HS256", "typ": "JWT"}) + "." + encode({
        "iss": "local-hub-sso-demo", "iat": now, "exp": now + 600,
        "profile": {"user_seq": 42}})
    signature = hmac.new(key.encode(), content.encode(), hashlib.sha256).digest()
    return content + "." + base64.urlsafe_b64encode(signature).rstrip(b"=").decode()


def main():
    key = os.getenv("HUB_SSO_DEMO_SIGNING_KEY", "")
    if len(key) < 32:
        sys.exit("Set HUB_SSO_DEMO_SIGNING_KEY in this terminal")
    with httpx.Client(trust_env=False, follow_redirects=False, timeout=10) as browser:
        hub = browser.get("http://localhost:8000/demo/health")
        capa = browser.get("http://localhost:8001/health")
        assert (hub.status_code, capa.status_code) == (200, 200)
        start = browser.get("http://localhost:8001/auth/hub/start")
        assert start.status_code == 200, ("start", start.status_code)
        info = start.json()
        issue = browser.post(info["hub_code_endpoint"], json=info["authorization_request"],
                             headers={"Authorization": "Bearer " + demo_jwt(key)})
        assert issue.status_code == 200, ("issue", issue.status_code, issue.json().get("detail"))
        callback = browser.get(issue.json()["redirect_url"])
        assert callback.status_code == 200, ("callback", callback.status_code)
        current = browser.get("http://localhost:8001/auth/me")
        assert current.status_code == 200 and current.json()["hub_user_id"] == "42"
        replay = browser.get(issue.json()["redirect_url"])
        assert replay.status_code == 400
        print("PASS: both servers, code issue, callback, /auth/me, replay blocked")


if __name__ == "__main__":
    main()
