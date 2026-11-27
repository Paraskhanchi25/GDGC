"""Bounded, process-local budget guard for the existing single FastAPI process.
Only digests and timing are retained; no questions, financial context or API keys.
"""
import threading
import time
from collections import deque

class RequestGuard:
    def __init__(self):
        self._lock = threading.Lock()
        self._users = {}

    def acquire(self, user_id: str, digest: str, per_minute: int, duplicate_seconds: int):
        now = time.monotonic()
        with self._lock:
            for uid in list(self._users):
                state = self._users[uid]
                if not state["active"] and now - state["last"] > 180:
                    del self._users[uid]
            if user_id not in self._users and len(self._users) >= 10000:
                return "busy"
            state = self._users.setdefault(user_id, {"calls": deque(), "recent": {}, "active": set(), "last": now})
            state["last"] = now
            while state["calls"] and now - state["calls"][0] >= 60:
                state["calls"].popleft()
            state["recent"] = {d: t for d, t in state["recent"].items() if now - t < duplicate_seconds}
            if state["active"] or digest in state["recent"]:
                return "duplicate" if digest in state["active"] or digest in state["recent"] else "busy"
            if len(state["calls"]) >= per_minute:
                return "rate_limit"
            state["calls"].append(now)
            state["active"].add(digest)
            return None

    def release(self, user_id: str, digest: str, succeeded: bool):
        with self._lock:
            state = self._users.get(user_id)
            if state:
                state["active"].discard(digest)
                if succeeded:
                    state["recent"][digest] = time.monotonic()

request_guard = RequestGuard()
