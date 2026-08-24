import unittest
import os


class TestFileUploadSecurityValidation(unittest.TestCase):
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    def test_extension_filtering(self):
        valid_files = ["resume.pdf", "cv.docx", "portfolio.txt"]
        invalid_files = ["script.exe", "exploit.sh", "malware.py", "eval.js"]

        for f in valid_files:
            _, ext = os.path.splitext(f)
            self.assertIn(ext.lower(), self.ALLOWED_EXTENSIONS)

        for f in invalid_files:
            _, ext = os.path.splitext(f)
            self.assertNotIn(ext.lower(), self.ALLOWED_EXTENSIONS)

    def test_path_traversal_sanitization(self):
        malicious_filename = "../../../etc/passwd"
        sanitized = os.path.basename(malicious_filename)
        self.assertEqual(sanitized, "passwd")
        self.assertNotIn("..", sanitized)


if __name__ == "__main__":
    unittest.main()
