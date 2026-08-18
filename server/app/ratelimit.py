"""Simple in-memory sliding-window rate limiter (single instance)."""
from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException


class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.monotonic()
        window = [t for t in self._hits[key] if now - t < self.window_seconds]
        self._hits[key] = window
        if len(window) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests, please slow down.")
        self._hits[key].append(now)


limiter = RateLimiter(max_requests=60, window_seconds=60)
