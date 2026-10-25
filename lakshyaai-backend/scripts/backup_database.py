import os
import sys
import json
import hashlib
import datetime
import subprocess
from urllib.parse import urlparse


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/lakshyaai")


def is_test_environment() -> bool:
    return os.environ.get("TESTING", "").strip().lower() == "true"


def calculate_checksum(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()


def backup_database(output_dir: str = "./backups") -> dict:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_id = f"backup_{timestamp}"
    backup_file = os.path.join(output_dir, f"lakshyaai_{backup_id}.sql")
    manifest_file = os.path.join(output_dir, f"lakshyaai_{backup_id}_manifest.json")

    try:
        parsed = urlparse(DATABASE_URL)
        hostname = parsed.hostname or "localhost"
        try:
            port = str(parsed.port or 5432)
        except Exception:
            port = "5432"
        username = parsed.username or "postgres"
        dbname = parsed.path.lstrip("/") or "lakshyaai"
        password = parsed.password
    except Exception:
        hostname = "localhost"
        port = "5432"
        username = "postgres"
        dbname = "lakshyaai"
        password = None

    cmd = [
        "pg_dump",
        "-h", hostname,
        "-p", port,
        "-U", username,
        "-d", dbname,
        "-f", backup_file,
    ]

    env = os.environ.copy()
    if password:
        env["PGPASSWORD"] = password

    is_test = is_test_environment()
    is_simulated = False
    status_label = "VERIFIED"

    print(f"Creating database backup to {backup_file}...")
    try:
        subprocess.run(cmd, env=env, check=True)
    except FileNotFoundError as err:
        if not is_test:
            if os.path.exists(backup_file):
                try:
                    os.remove(backup_file)
                except OSError:
                    pass
            print(f"Error: pg_dump utility not found in PATH in non-test environment: {err}", file=sys.stderr)
            raise
        print(f"Note [TEST MODE ONLY]: pg_dump utility not in PATH. Generating simulated test snapshot at {backup_file}")
        is_simulated = True
        status_label = "SIMULATED"
        with open(backup_file, "w", encoding="utf-8") as f:
            f.write(f"-- Lakshya AI Automated Database Snapshot (SIMULATED TEST MODE): {timestamp}\n")
            f.write("CREATE TABLE IF NOT EXISTS _backup_health (id serial primary key);\n")
    except subprocess.CalledProcessError as err:
        if not is_test:
            if os.path.exists(backup_file):
                try:
                    os.remove(backup_file)
                except OSError:
                    pass
            print(f"Error: pg_dump failed in non-test environment (exit code {err.returncode}): {err}", file=sys.stderr)
            raise
        print(f"Note [TEST MODE ONLY]: pg_dump execution failed ({err}). Generating simulated test snapshot at {backup_file}")
        is_simulated = True
        status_label = "SIMULATED"
        with open(backup_file, "w", encoding="utf-8") as f:
            f.write(f"-- Lakshya AI Automated Database Snapshot (SIMULATED TEST MODE): {timestamp}\n")
            f.write("CREATE TABLE IF NOT EXISTS _backup_health (id serial primary key);\n")

    if not os.path.exists(backup_file) or os.path.getsize(backup_file) == 0:
        raise RuntimeError(f"Backup file is empty or was not created: {backup_file}")

    checksum = calculate_checksum(backup_file)
    manifest = {
        "backup_id": backup_id,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database_url_host": parsed.hostname or "localhost",
        "release_version": "1.0.0",
        "file_path": backup_file,
        "file_size_bytes": os.path.getsize(backup_file),
        "checksum_sha256": checksum,
        "status": status_label,
        "is_simulated": is_simulated,
    }

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Backup and manifest created: {manifest_file} (Status: {status_label}, Checksum: {checksum[:12]}...)")
    return manifest


if __name__ == "__main__":
    try:
        backup_database()
    except Exception as e:
        print(f"Backup execution failed: {e}", file=sys.stderr)
        sys.exit(1)
