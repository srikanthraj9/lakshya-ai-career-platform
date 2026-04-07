from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from app.core.config import settings
from app.core.exceptions import ExternalServiceException, ProcessingException


def compile_latex_to_pdf(latex_source: str) -> bytes:
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            workdir = Path(temp_dir)
            tex_file = workdir / "resume.tex"
            pdf_file = workdir / "resume.pdf"
            tex_file.write_text(latex_source, encoding="utf-8")

            result = subprocess.run(
                [
                    settings.latex_command,
                    "-interaction=nonstopmode",
                    "-halt-on-error",
                    tex_file.name,
                ],
                cwd=workdir,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0 or not pdf_file.exists():
                error_output = "\n".join(
                    line.strip()
                    for line in (result.stdout + "\n" + result.stderr).splitlines()
                    if line.strip()
                )
                raise ProcessingException(
                    "LaTeX compilation failed",
                    details={"compiler_output": error_output[-1000:]},
                )

            return pdf_file.read_bytes()
    except FileNotFoundError as exc:
        raise ExternalServiceException(
            "LaTeX compiler is not installed on the server",
            details={"command": settings.latex_command},
        ) from exc
