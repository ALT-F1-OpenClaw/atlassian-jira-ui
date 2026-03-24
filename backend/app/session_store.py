"""Session store abstraction — Redis (preferred) or file-based (fallback).

Auto-detects: if REDIS_URL is set, uses Redis. Otherwise falls back to
JSON file storage (backward compatible with pre-v1.61 deployments).

ADR-022: Redis Session Store.
"""

import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path

logger = logging.getLogger(__name__)

SESSION_TTL = 7 * 24 * 3600  # 7 days in seconds
STATE_TTL = 600  # 10 minutes for OAuth CSRF states


class SessionStore(ABC):
    """Abstract session store interface."""

    @abstractmethod
    async def get(self, session_id: str) -> dict | None:
        """Get a session by ID. Returns None if not found or expired."""
        ...

    @abstractmethod
    async def set(self, session_id: str, data: dict, ttl: int = SESSION_TTL) -> None:
        """Store a session with TTL."""
        ...

    @abstractmethod
    async def delete(self, session_id: str) -> None:
        """Delete a session."""
        ...

    @abstractmethod
    async def update(self, session_id: str, updates: dict) -> None:
        """Partially update a session (merge updates into existing data)."""
        ...

    # OAuth CSRF state tokens
    @abstractmethod
    async def set_state(self, state: str) -> None:
        """Store an OAuth CSRF state token."""
        ...

    @abstractmethod
    async def consume_state(self, state: str) -> bool:
        """Check and consume a CSRF state token. Returns True if valid."""
        ...


class FileSessionStore(SessionStore):
    """File-based session store (backward compatible fallback).

    Stores sessions in a JSON file on disk. Not suitable for
    horizontal scaling but works for single-instance deployments.
    """

    def __init__(self, session_file: str = "/app/sessions.json", states_file: str = "/app/oauth_states.json"):
        self._session_file = Path(session_file)
        self._states_file = Path(states_file)
        self._sessions: dict[str, dict] = self._load(self._session_file)
        self._states: dict[str, float] = self._load(self._states_file)

    def _load(self, path: Path) -> dict:
        if path.exists():
            try:
                return json.loads(path.read_text())
            except Exception:
                return {}
        return {}

    def _save_sessions(self) -> None:
        try:
            self._session_file.write_text(json.dumps(self._sessions, default=str))
        except Exception as e:
            logger.warning("Failed to save sessions: %s", e)

    def _save_states(self) -> None:
        try:
            self._states_file.write_text(json.dumps(self._states))
        except Exception as e:
            logger.warning("Failed to save states: %s", e)

    async def get(self, session_id: str) -> dict | None:
        return self._sessions.get(session_id)

    async def set(self, session_id: str, data: dict, ttl: int = SESSION_TTL) -> None:
        self._sessions[session_id] = data
        self._save_sessions()

    async def delete(self, session_id: str) -> None:
        if session_id in self._sessions:
            del self._sessions[session_id]
            self._save_sessions()

    async def update(self, session_id: str, updates: dict) -> None:
        if session_id in self._sessions:
            self._sessions[session_id].update(updates)
            self._save_sessions()

    async def set_state(self, state: str) -> None:
        import time
        # Clean expired states
        now = time.time()
        expired = [k for k, v in self._states.items() if now - v > STATE_TTL]
        for k in expired:
            del self._states[k]
        self._states[state] = now
        self._save_states()

    async def consume_state(self, state: str) -> bool:
        if state in self._states:
            del self._states[state]
            self._save_states()
            return True
        return False


class RedisSessionStore(SessionStore):
    """Redis-backed session store.

    Sessions stored as JSON with automatic TTL expiry.
    Supports multiple workers/containers sharing sessions.
    """

    def __init__(self, redis_url: str):
        import redis.asyncio as aioredis
        self._redis = aioredis.from_url(
            redis_url,
            decode_responses=True,
            retry_on_timeout=True,
        )
        self._prefix = "jira_ui:session:"
        self._state_prefix = "jira_ui:oauth_state:"

    async def get(self, session_id: str) -> dict | None:
        data = await self._redis.get(f"{self._prefix}{session_id}")
        if data is None:
            return None
        try:
            return json.loads(data)
        except (json.JSONDecodeError, Exception):
            return None

    async def set(self, session_id: str, data: dict, ttl: int = SESSION_TTL) -> None:
        await self._redis.setex(
            f"{self._prefix}{session_id}",
            ttl,
            json.dumps(data, default=str),
        )

    async def delete(self, session_id: str) -> None:
        await self._redis.delete(f"{self._prefix}{session_id}")

    async def update(self, session_id: str, updates: dict) -> None:
        key = f"{self._prefix}{session_id}"
        data = await self._redis.get(key)
        if data is None:
            return
        try:
            session = json.loads(data)
            session.update(updates)
            # Preserve remaining TTL
            ttl = await self._redis.ttl(key)
            if ttl < 0:
                ttl = SESSION_TTL
            await self._redis.setex(key, ttl, json.dumps(session, default=str))
        except Exception as e:
            logger.warning("Redis session update failed: %s", e)

    async def set_state(self, state: str) -> None:
        await self._redis.setex(f"{self._state_prefix}{state}", STATE_TTL, "1")

    async def consume_state(self, state: str) -> bool:
        key = f"{self._state_prefix}{state}"
        result = await self._redis.get(key)
        if result:
            await self._redis.delete(key)
            return True
        return False


# ── Store factory ────────────────────────────────────────────────────

_store: SessionStore | None = None


def get_session_store() -> SessionStore:
    """Get or create the session store (singleton).

    Uses Redis if REDIS_URL is set, otherwise falls back to file storage.
    """
    global _store
    if _store is not None:
        return _store

    import os
    redis_url = os.environ.get("REDIS_URL", "")

    if redis_url:
        try:
            _store = RedisSessionStore(redis_url)
            logger.info("Session store: Redis (%s)", redis_url.split("@")[-1])  # Log host only, not password
        except Exception as e:
            logger.warning("Redis connection failed (%s) — falling back to file store", e)
            _store = FileSessionStore()
    else:
        _store = FileSessionStore()
        logger.info("Session store: file-based (set REDIS_URL for Redis)")

    return _store
