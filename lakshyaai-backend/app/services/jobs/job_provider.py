from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import unescape
import re
from typing import Any

import requests


logger = logging.getLogger("lakshyaai.jobs.provider")

REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
CACHE_TTL = timedelta(minutes=10)


@dataclass
class CacheEntry:
    fetched_at: datetime
    jobs: list[dict[str, Any]]


_cache_entry: CacheEntry | None = None


class JobProvider:
    @staticmethod
    def fetch_remote_jobs(*, force_refresh: bool = False) -> list[dict[str, Any]]:
        global _cache_entry

        now = datetime.now(timezone.utc)
        if (
            not force_refresh
            and _cache_entry is not None
            and now - _cache_entry.fetched_at < CACHE_TTL
        ):
            logger.info(
                "Returning cached Remotive jobs count=%s age_seconds=%s",
                len(_cache_entry.jobs),
                int((now - _cache_entry.fetched_at).total_seconds()),
            )
            return _cache_entry.jobs

        logger.info("Fetching live jobs from Remotive API url=%s", REMOTIVE_API_URL)
        response = requests.get(
            REMOTIVE_API_URL,
            timeout=20,
            headers={"User-Agent": "LakshyaAI/1.0"},
        )
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs") or []
        logger.info("Fetched live jobs from Remotive count=%s", len(jobs))
        _cache_entry = CacheEntry(fetched_at=now, jobs=jobs)
        return jobs

    @staticmethod
    def strip_html(value: str) -> str:
        cleaned = re.sub(r"<[^>]+>", " ", value or "")
        cleaned = unescape(cleaned)
        return re.sub(r"\s+", " ", cleaned).strip()
