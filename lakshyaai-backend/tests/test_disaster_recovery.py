import os
import sys
import json
import unittest
import tempfile
import shutil
import subprocess
from unittest.mock import patch

from scripts.backup_database import backup_database, calculate_checksum
from scripts.restore_database import restore_database


class TestDisasterRecoveryValidation(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_backup_and_restore_manifest_lifecycle(self):
        """Standard test-mode lifecycle creates simulated artifact and verifies it."""
        with patch.dict(os.environ, {"TESTING": "true"}):
            manifest = backup_database(output_dir=self.test_dir)
            self.assertIn("backup_id", manifest)
            self.assertIn("checksum_sha256", manifest)
            self.assertEqual(manifest["release_version"], "1.0.0")
            self.assertEqual(manifest["status"], "SIMULATED")
            self.assertTrue(manifest["is_simulated"])

            backup_file = manifest["file_path"]
            self.assertTrue(os.path.exists(backup_file))

            # Checksum calculation matches
            computed_checksum = calculate_checksum(backup_file)
            self.assertEqual(computed_checksum, manifest["checksum_sha256"])

            # Restore validation
            success = restore_database(backup_file)
            self.assertTrue(success)

    def test_1_successful_real_backup_produces_verified_manifest(self):
        """Case 1: Successful real pg_dump produces a verified manifest and non-simulated flag."""
        def fake_pg_dump(cmd, env=None, check=True):
            f_idx = cmd.index("-f")
            out_file = cmd[f_idx + 1]
            with open(out_file, "w", encoding="utf-8") as f:
                f.write("-- PostgreSQL database dump\nSELECT 1;\n")
            return subprocess.CompletedProcess(cmd, 0)

        with patch.dict(os.environ, {"TESTING": "false"}):
            with patch("subprocess.run", side_effect=fake_pg_dump):
                manifest = backup_database(output_dir=self.test_dir)
                self.assertEqual(manifest["status"], "VERIFIED")
                self.assertFalse(manifest["is_simulated"])
                self.assertTrue(os.path.exists(manifest["file_path"]))
                self.assertGreater(manifest["file_size_bytes"], 0)

                # Check manifest on disk
                candidate_manifest = manifest["file_path"].replace(".sql", "_manifest.json")
                self.assertTrue(os.path.exists(candidate_manifest))
                with open(candidate_manifest, "r", encoding="utf-8") as mf:
                    saved_manifest = json.load(mf)
                    self.assertEqual(saved_manifest["status"], "VERIFIED")
                    self.assertFalse(saved_manifest["is_simulated"])

    def test_2_failed_pg_dump_in_non_test_mode_fails(self):
        """Case 2: Failed pg_dump in non-test mode fails and cannot create a falsely verified backup."""
        with patch.dict(os.environ, {"TESTING": "false"}):
            with patch("subprocess.run", side_effect=subprocess.CalledProcessError(1, ["pg_dump"])):
                with self.assertRaises(subprocess.CalledProcessError):
                    backup_database(output_dir=self.test_dir)

                # Verify no files were marked verified or created
                files = os.listdir(self.test_dir)
                for f in files:
                    if f.endswith(".json"):
                        with open(os.path.join(self.test_dir, f), "r") as mf:
                            data = json.load(mf)
                            self.assertNotEqual(data.get("status"), "VERIFIED")

    def test_3_missing_pg_dump_in_non_test_mode_fails(self):
        """Case 3: Missing pg_dump in non-test mode fails and does not create a simulated backup."""
        with patch.dict(os.environ, {"TESTING": "false"}):
            with patch("subprocess.run", side_effect=FileNotFoundError("pg_dump not found")):
                with self.assertRaises(FileNotFoundError):
                    backup_database(output_dir=self.test_dir)

                self.assertEqual(len(os.listdir(self.test_dir)), 0)

    def test_4_failed_pg_dump_in_test_mode_produces_simulated_artifact(self):
        """Case 4: Failed pg_dump in test mode produces only a clearly labelled simulated artifact."""
        with patch.dict(os.environ, {"TESTING": "true"}):
            with patch("subprocess.run", side_effect=subprocess.CalledProcessError(1, ["pg_dump"])):
                manifest = backup_database(output_dir=self.test_dir)
                self.assertEqual(manifest["status"], "SIMULATED")
                self.assertTrue(manifest["is_simulated"])

                with open(manifest["file_path"], "r", encoding="utf-8") as f:
                    content = f.read()
                    self.assertIn("SIMULATED TEST MODE", content)

    def test_5_failed_psql_restore_in_non_test_mode_returns_failure(self):
        """Case 5: Failed psql restore in non-test mode returns failure and nonzero exit code."""
        dummy_sql = os.path.join(self.test_dir, "real_backup.sql")
        with open(dummy_sql, "w", encoding="utf-8") as f:
            f.write("-- Real PostgreSQL Dump\nCREATE TABLE test_tab (id int);\n")

        with patch.dict(os.environ, {"TESTING": "false"}):
            with patch("subprocess.run", side_effect=subprocess.CalledProcessError(1, ["psql"])):
                success = restore_database(dummy_sql)
                self.assertFalse(success)

        # CLI test for nonzero exit code
        env = os.environ.copy()
        env["TESTING"] = "false"
        env["PATH"] = ""  # Force psql missing or failing
        proc = subprocess.run(
            [sys.executable, "scripts/restore_database.py", dummy_sql],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            env=env,
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(proc.returncode, 0)

    def test_6_missing_psql_in_non_test_mode_fails(self):
        """Case 6: Missing psql in non-test mode fails."""
        dummy_sql = os.path.join(self.test_dir, "real_backup.sql")
        with open(dummy_sql, "w", encoding="utf-8") as f:
            f.write("-- Real PostgreSQL Dump\nCREATE TABLE test_tab (id int);\n")

        with patch.dict(os.environ, {"TESTING": "false"}):
            with patch("subprocess.run", side_effect=FileNotFoundError("psql not found")):
                success = restore_database(dummy_sql)
                self.assertFalse(success)

    def test_7_test_mode_simulated_restore_clearly_distinguished(self):
        """Case 7: Test-mode simulated restore is clearly distinguished from a real restore."""
        sim_sql = os.path.join(self.test_dir, "simulated.sql")
        with open(sim_sql, "w", encoding="utf-8") as f:
            f.write("-- Lakshya AI Automated Database Snapshot (SIMULATED TEST MODE): 20261025\n")

        sim_manifest = os.path.join(self.test_dir, "simulated_manifest.json")
        with open(sim_manifest, "w", encoding="utf-8") as f:
            json.dump({
                "backup_id": "test_sim",
                "checksum_sha256": calculate_checksum(sim_sql),
                "status": "SIMULATED",
                "is_simulated": True,
            }, f)

        # In non-test mode, restoring simulated backup must be rejected
        with patch.dict(os.environ, {"TESTING": "false"}):
            success = restore_database(sim_sql, sim_manifest)
            self.assertFalse(success)

        # In test mode, simulated restore succeeds under test lifecycle
        with patch.dict(os.environ, {"TESTING": "true"}):
            with patch("subprocess.run", side_effect=FileNotFoundError("psql not found")):
                success = restore_database(sim_sql, sim_manifest)
                self.assertTrue(success)

    def test_8_failed_backup_does_not_destroy_existing_valid_backup(self):
        """Case 8: A failed backup does not destroy an existing valid backup."""
        # Create an existing valid backup
        valid_backup = os.path.join(self.test_dir, "lakshyaai_backup_existing.sql")
        valid_content = "-- Existing valid backup from yesterday\nCREATE TABLE existing (id int);\n"
        with open(valid_backup, "w", encoding="utf-8") as f:
            f.write(valid_content)
        checksum_before = calculate_checksum(valid_backup)

        valid_manifest = os.path.join(self.test_dir, "lakshyaai_backup_existing_manifest.json")
        with open(valid_manifest, "w", encoding="utf-8") as f:
            json.dump({
                "backup_id": "backup_existing",
                "checksum_sha256": checksum_before,
                "status": "VERIFIED",
                "is_simulated": False,
            }, f)

        # Run a new backup in non-test mode that fails
        with patch.dict(os.environ, {"TESTING": "false"}):
            with patch("subprocess.run", side_effect=subprocess.CalledProcessError(1, ["pg_dump"])):
                with self.assertRaises(subprocess.CalledProcessError):
                    backup_database(output_dir=self.test_dir)

        # Verify existing backup and manifest are untouched
        self.assertTrue(os.path.exists(valid_backup))
        self.assertTrue(os.path.exists(valid_manifest))
        checksum_after = calculate_checksum(valid_backup)
        self.assertEqual(checksum_before, checksum_after)
        with open(valid_backup, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), valid_content)


if __name__ == "__main__":
    unittest.main()
