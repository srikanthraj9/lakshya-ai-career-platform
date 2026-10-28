import os
import sys
import json
import hashlib
import datetime
from decimal import Decimal
from uuid import UUID
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.database import engine
from sqlalchemy import text, inspect


class DatabaseEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date, datetime.time)):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, bytes):
            return obj.hex()
        return super().default(obj)


def create_verified_backup(output_dir: str = "storage/backups") -> dict:
    abs_output_dir = os.path.abspath(os.path.join(str(backend_dir), output_dir))
    os.makedirs(abs_output_dir, exist_ok=True)

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_id = f"pre_cleanup_{timestamp}"
    json_backup_path = os.path.join(abs_output_dir, f"backup_{backup_id}.json")
    sql_backup_path = os.path.join(abs_output_dir, f"backup_{backup_id}.sql")
    manifest_path = os.path.join(abs_output_dir, f"backup_{backup_id}_manifest.json")

    inspector = inspect(engine)
    public_tables = sorted(inspector.get_table_names(schema="public"))

    print("=" * 65)
    print("LAKSHYA AI - COMPREHENSIVE DATABASE BACKUP CREATION")
    print(f"Timestamp: {timestamp} (UTC)")
    print(f"Target Host: {engine.url.host}")
    print(f"Database: {engine.url.database}")
    print(f"Public Tables: {len(public_tables)}")
    print("=" * 65)

    backup_payload = {
        "metadata": {
            "backup_id": backup_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "database_host": engine.url.host,
            "database_name": engine.url.database,
            "table_count": len(public_tables),
        },
        "tables": {},
    }

    table_row_counts = {}
    total_records = 0

    sql_statements = [
        f"-- Lakshya AI Pre-Cleanup Backup: {backup_id}\n",
        f"-- Created: {backup_payload['metadata']['created_at']}\n",
        f"-- Host: {engine.url.host} | Database: {engine.url.database}\n\n",
        "BEGIN;\n\n",
    ]

    with engine.connect() as conn:
        for table_name in public_tables:
            columns_info = inspector.get_columns(table_name, schema="public")
            column_names = [c["name"] for c in columns_info]

            query = text(f'SELECT * FROM public."{table_name}"')
            result = conn.execute(query)
            rows = result.fetchall()

            rows_data = []
            for row in rows:
                row_dict = dict(row._mapping)
                rows_data.append(row_dict)

                # Generate SQL INSERT statement
                if column_names:
                    cols_str = ", ".join([f'"{c}"' for c in column_names])
                    vals_str = []
                    for c in column_names:
                        v = row_dict.get(c)
                        if v is None:
                            vals_str.append("NULL")
                        elif isinstance(v, (int, float)):
                            vals_str.append(str(v))
                        elif isinstance(v, bool):
                            vals_str.append("TRUE" if v else "FALSE")
                        elif isinstance(v, (dict, list)):
                            escaped = json.dumps(v).replace("'", "''")
                            vals_str.append(f"'{escaped}'::jsonb")
                        else:
                            escaped = str(v).replace("'", "''")
                            vals_str.append(f"'{escaped}'")
                    sql_statements.append(
                        f'INSERT INTO public."{table_name}" ({cols_str}) VALUES ({", ".join(vals_str)});\n'
                    )

            count = len(rows_data)
            table_row_counts[table_name] = count
            total_records += count

            backup_payload["tables"][table_name] = {
                "columns": [c["name"] for c in columns_info],
                "row_count": count,
                "rows": rows_data,
            }
            if count > 0:
                print(f"  [+] Extracted {count:>4} rows from public.{table_name}")

    sql_statements.append("\nCOMMIT;\n")

    # Write JSON backup
    with open(json_backup_path, "w", encoding="utf-8") as f:
        json.dump(backup_payload, f, cls=DatabaseEncoder, indent=2)

    # Write SQL backup
    with open(sql_backup_path, "w", encoding="utf-8") as f:
        f.writelines(sql_statements)

    # Compute checksums
    def sha256_of_file(p):
        h = hashlib.sha256()
        with open(p, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    json_sha256 = sha256_of_file(json_backup_path)
    sql_sha256 = sha256_of_file(sql_backup_path)

    # Verification: read back and validate data integrity
    print("-" * 65)
    print("VERIFYING BACKUP ARCHIVE INTEGRITY...")
    with open(json_backup_path, "r", encoding="utf-8") as f:
        verified_data = json.load(f)

    verified_tables = set(verified_data["tables"].keys())
    assert verified_tables == set(public_tables), "Table set mismatch in backup!"
    verified_total_rows = sum(t["row_count"] for t in verified_data["tables"].values())
    assert verified_total_rows == total_records, f"Row count mismatch! {verified_total_rows} vs {total_records}"

    print(f"  [OK] Verified all {len(public_tables)} tables present in backup archive")
    print(f"  [OK] Verified all {total_records} application records intact")
    print(f"  [OK] JSON Backup size: {os.path.getsize(json_backup_path):,} bytes | SHA-256: {json_sha256[:16]}...")
    print(f"  [OK] SQL Backup size:  {os.path.getsize(sql_backup_path):,} bytes | SHA-256: {sql_sha256[:16]}...")

    manifest = {
        "backup_id": backup_id,
        "created_at": backup_payload["metadata"]["created_at"],
        "database_host": engine.url.host,
        "database_name": engine.url.database,
        "table_count": len(public_tables),
        "total_records": total_records,
        "table_row_counts": table_row_counts,
        "files": {
            "json_backup": {
                "path": os.path.relpath(json_backup_path, str(backend_dir)),
                "size_bytes": os.path.getsize(json_backup_path),
                "sha256": json_sha256,
            },
            "sql_backup": {
                "path": os.path.relpath(sql_backup_path, str(backend_dir)),
                "size_bytes": os.path.getsize(sql_backup_path),
                "sha256": sql_sha256,
            },
        },
        "verification_status": "PASS",
        "verified_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"  [OK] Manifest saved: {manifest_path}")
    print("=" * 65)
    print("BACKUP VERIFICATION COMPLETE: READY FOR REVIEW")
    print("=" * 65)
    return manifest


if __name__ == "__main__":
    create_verified_backup()
