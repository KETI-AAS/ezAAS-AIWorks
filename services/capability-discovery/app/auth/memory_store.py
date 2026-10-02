"""Single-process prototype. Raw session identifiers are never stored."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from threading import Lock
from uuid import uuid4


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


class MemoryStore:
    def __init__(self, clock=None, capacity=10000):
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.capacity = capacity
        self.transactions = {}
        self.sessions = {}
        self.users = {}
        self.lock = Lock()

    def cleanup(self):
        now = self.clock()
        self.transactions = {k: v for k, v in self.transactions.items() if v["expires_at"] > now}
        self.sessions = {k: v for k, v in self.sessions.items() if v["expires_at"] > now}

    def begin(self):
        with self.lock:
            self.cleanup()
            if len(self.transactions) >= self.capacity:
                raise OverflowError()
            browser_id, state, verifier = (secrets.token_urlsafe(32) for _ in range(3))
            self.transactions[digest(browser_id)] = {"state_hash": digest(state), "verifier": verifier,
                                                    "expires_at": self.clock() + timedelta(minutes=5)}
            return browser_id, state, verifier

    def take_transaction(self, browser_id, state):
        with self.lock:
            self.cleanup()
            key = digest(browser_id)
            item = self.transactions.get(key)
            if item is None or not secrets.compare_digest(item["state_hash"], digest(state)):
                return None
            return self.transactions.pop(key)

    def create_session(self, identity, ttl, previous=""):
        with self.lock:
            self.cleanup()
            expiry = min(identity.expires_at, self.clock() + timedelta(seconds=ttl))
            if expiry <= self.clock():
                raise ValueError()
            user = identity.hub_user_id
            if len(self.sessions) >= self.capacity or (user not in self.users and len(self.users) >= self.capacity):
                raise OverflowError()
            if user not in self.users:
                self.users[user] = str(uuid4())
            raw = secrets.token_urlsafe(32)
            record = {"capability_user_id": self.users[user], "hub_user_id": user,
                      "hub_session_id": str(identity.hub_session_id), "expires_at": expiry}
            self.sessions[digest(raw)] = record
            if previous:
                self.sessions.pop(digest(previous), None)
            return raw, dict(record)

    def get_session(self, raw):
        with self.lock:
            self.cleanup()
            value = self.sessions.get(digest(raw))
            return dict(value) if value else None


store = MemoryStore()


def get_store():
    return store
