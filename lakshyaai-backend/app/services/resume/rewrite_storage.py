from __future__ import annotations

import json
from pathlib import Path
from uuid import UUID, uuid4

from app.core.config import settings
from app.core.exceptions import NotFoundException


class ResumeRewriteStorage:
    @staticmethod
    def _root() -> Path:
        root = Path(settings.resume_rewrite_output_dir)
        if not root.is_absolute():
            root = Path(__file__).resolve().parents[3] / root
        root.mkdir(parents=True, exist_ok=True)
        return root

    @classmethod
    def _document_dir(cls, document_id: str) -> Path:
        return cls._root() / document_id

    @classmethod
    def store(cls, *, user_id: UUID, latex: str, pdf_bytes: bytes, structured: dict, preview: str) -> str:
        document_id = str(uuid4())
        directory = cls._document_dir(document_id)
        directory.mkdir(parents=True, exist_ok=True)

        tex_path = directory / "resume.tex"
        pdf_path = directory / "resume.pdf"
        manifest_path = directory / "manifest.json"

        tex_path.write_text(latex, encoding="utf-8")
        pdf_path.write_bytes(pdf_bytes)
        manifest_path.write_text(
            json.dumps(
                {
                    "owner_id": str(user_id),
                    "structured": structured,
                    "preview": preview,
                    "tex_file": tex_path.name,
                    "pdf_file": pdf_path.name,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        return document_id

    @classmethod
    def get_manifest(cls, document_id: str) -> dict:
        manifest_path = cls._document_dir(document_id) / "manifest.json"
        if not manifest_path.exists():
            raise NotFoundException("Generated resume not found")
        return json.loads(manifest_path.read_text(encoding="utf-8"))

    @classmethod
    def get_pdf_path(cls, document_id: str) -> Path:
        pdf_path = cls._document_dir(document_id) / "resume.pdf"
        if not pdf_path.exists():
            raise NotFoundException("Generated PDF not found")
        return pdf_path

    @classmethod
    def get_tex_path(cls, document_id: str) -> Path:
        tex_path = cls._document_dir(document_id) / "resume.tex"
        if not tex_path.exists():
            raise NotFoundException("Generated LaTeX not found")
        return tex_path
