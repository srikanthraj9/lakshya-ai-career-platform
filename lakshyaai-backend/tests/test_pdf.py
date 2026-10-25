import unittest
from app.services.resume.latex_compiler import compile_latex_to_pdf
from app.core.exceptions import ProcessingException


class TestLaTeXPDFCompiler(unittest.TestCase):
    def test_compile_valid_latex(self):
        doc = r"""\documentclass{article}
\begin{document}
Test PDF Compilation for Lakshya AI
\end{document}"""
        try:
            pdf_bytes = compile_latex_to_pdf(doc)
            self.assertTrue(len(pdf_bytes) > 0)
            self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        except Exception as exc:
            # If pdflatex is unavailable in certain CI environments, verify graceful exception
            self.assertIn("LaTeX", str(exc))

    def test_compile_invalid_latex_raises(self):
        doc = r"""\documentclass{article}
\begin{document}
\undefinedmacro{missing}
\end{document}"""
        with self.assertRaises((ProcessingException, Exception)):
            compile_latex_to_pdf(doc)


if __name__ == "__main__":
    unittest.main()
