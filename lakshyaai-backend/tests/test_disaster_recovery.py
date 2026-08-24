import os
import unittest
import tempfile
import shutil
from scripts.backup_database import backup_database, calculate_checksum
from scripts.restore_database import restore_database


class TestDisasterRecoveryValidation(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_backup_and_restore_manifest_lifecycle(self):
        manifest = backup_database(output_dir=self.test_dir)
        self.assertIn("backup_id", manifest)
        self.assertIn("checksum_sha256", manifest)
        self.assertEqual(manifest["release_version"], "1.0.0")

        backup_file = manifest["file_path"]
        self.assertTrue(os.path.exists(backup_file))

        # Checksum calculation matches
        computed_checksum = calculate_checksum(backup_file)
        self.assertEqual(computed_checksum, manifest["checksum_sha256"])

        # Restore validation with matching checksum
        success = restore_database(backup_file)
        self.assertTrue(success)


if __name__ == "__main__":
    unittest.main()
