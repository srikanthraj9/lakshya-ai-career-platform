from __future__ import annotations

import logging
from pathlib import Path
from uuid import UUID

logger = logging.getLogger("lakshyaai.storage")


class FileStorageService:
    BASE_UPLOAD_DIR = Path("uploads")

    @classmethod
    def _get_upload_root(cls) -> Path:
        root = cls.BASE_UPLOAD_DIR
        if not root.is_absolute():
            root = Path(__file__).resolve().parents[3] / root
        root.mkdir(parents=True, exist_ok=True)
        return root

    @classmethod
    def save_resume_file(
        cls,
        *,
        user_id: UUID | str,
        resume_id: UUID | str,
        filename: str,
        file_bytes: bytes,
    ) -> tuple[str, int]:
        user_dir = cls._get_upload_root() / "resumes" / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        safe_name = f"{resume_id}_{Path(filename).name}"
        destination = user_dir / safe_name

        destination.write_bytes(file_bytes)
        logger.info(
            "Saved resume file to storage user_id=%s path=%s bytes=%s",
            user_id,
            destination,
            len(file_bytes),
        )
        return str(destination), len(file_bytes)

    @classmethod
    def get_resume_path(cls, file_path: str) -> Path | None:
        if not file_path:
            return None
        p = Path(file_path)
        if p.exists():
            return p
        return None
