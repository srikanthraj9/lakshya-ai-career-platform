# Phase 4 — Staging Provisioning Plan & Release Gate
## Operational Checklist, Responsibility Boundaries, Migration Verification, and QA Test Suite

**Project:** Lakshya AI Career Platform  
**Working Directory:** `C:\Users\91807\Desktop\MY projects\lakshya-ai-career-platform`  
**Execution Timestamp:** 2026-10-27  
**Role:** Senior QA Engineer, Full-Stack Auditor, Security Engineer, and Release Readiness Reviewer  
**Status:** **NOT READY FOR LIVE STAGING RELEASE (Awaiting Cloud-Provider Database Provisioning)**  
**Final Production Verdict:** **ACCEPTED WITH CONDITIONS** (Pending Staging Infrastructure Provisioning)

---

### Executive Summary

This staging provisioning plan defines the exact technical blueprint and operational boundaries required to bring up a genuine, isolated staging environment for Phase 4 release verification. 

In strict adherence to database safety rules:
- **Zero Live Supabase Interaction:** The production Supabase instance (`aws-0-ap-northeast-2.pooler.supabase.com:6543`) is strictly isolated and protected. It will **never** be used as a staging or testing target.
- **Credential Protection:** No passwords, JWT secrets, database connection strings, or cloud tokens are printed or logged in cleartext.
- **Safe Boundary Hold:** No paid cloud resources, infrastructure changes, DNS alterations, or migrations have been executed.
- **Current Completion:** All local code changes, unit tests (306 backend, 210 frontend), production bundling (`npm run build`), and static migration SQL generation are 100% complete and verified.

---

### 1. Local vs. Cloud-Provider Responsibility Matrix

To maintain clear operational boundaries and prevent unauthorized cloud spend or configuration drift, tasks are strictly categorized below:

| Responsibility Domain | Task Description | Execution Ownership | Current Status |
| :--- | :--- | :---: | :---: |
| **Local / Engineering** | Code implementation for Milestones 4.1 – 4.4 | Antigravity AI | **COMPLETED** |
| **Local / Engineering** | Backend unittest test suite execution (306 tests) | Antigravity AI | **COMPLETED** (305 passed, 1 skipped) |
| **Local / Engineering** | Frontend Vitest test suite execution (210 tests / 44 files) | Antigravity AI | **COMPLETED** (210 passed) |
| **Local / Engineering** | Production asset bundle verification (`npm run build`) | Antigravity AI | **COMPLETED** (Clean in 10.79s) |
| **Local / Engineering** | Static SQL migration generation & validation (`d9e0f1a2b3c4`) | Antigravity AI | **COMPLETED** (Verified transactional DDL) |
| **Local / Engineering** | Pre-flight environment validation script | Antigravity AI | **COMPLETED** (`validate_environment.py`) |
| **Cloud Provider / User** | Provision dedicated isolated staging PostgreSQL database | **USER ACTION** | **PREREQUISITE (PENDING)** |
| **Cloud Provider / User** | Supply staging database connection string (`DATABASE_URL`) | **USER ACTION** | **PREREQUISITE (PENDING)** |
| **Cloud Provider / User** | Configure staging web service environment variables on Render | **USER ACTION** | **PREREQUISITE (PENDING)** |
| **Cloud Provider / User** | Supply staging test admin credentials for Chrome/Firefox QA | **USER ACTION** | **PREREQUISITE (PENDING)** |
| **Shared / Staging Gate** | Verify staging database target & apply migration `d9e0f1a2b3c4` | Antigravity AI + User | **AWAITING STAGING DB** |
| **Shared / Staging Gate** | 10-Module manual browser QA walkthrough in Chrome/Firefox | QA / Antigravity AI | **AWAITING STAGING DEPLOYMENT** |

---

### 2. Precise Staging Provisioning Checklist

#### A. Isolated Staging Database (PostgreSQL 15+)
- [ ] **Provisioning Target:**
  - Create a dedicated, isolated project on Supabase (Free tier) or any managed PostgreSQL provider (e.g., Neon, Render PostgreSQL, AWS RDS).
  - **Constraint:** Must **not** share any schema, tables, or database cluster with the production Supabase database.
- [ ] **Extensions Required:**
  - `uuid-ossp` or native PostgreSQL 13+ `gen_random_uuid()` (required for UUID primary keys).
  - `pgvector` (required for skill & role vector embeddings).
- [ ] **Connection Pooling vs. Direct Connection:**
  - `DATABASE_URL`: Transaction pooler port (typically 6543 on Supabase) for general application traffic.
  - `DIRECT_URL`: Session/direct port (typically 5432) for running Alembic schema migrations and DDL statements.

#### B. Staging Environment Variables (`.env.staging`)
Create `.env.staging` in the project root and `lakshyaai-backend/.env.staging` with the following parameters (secrets masked):

```bash
# ==============================================================================
# LAKSHYA AI - STAGING ENVIRONMENT CONFIGURATION
# ==============================================================================
ENVIRONMENT=staging
DEBUG=false
APP_NAME=LakshyaAI-Staging

# Database Connectivity (Isolated Staging Database Only)
DATABASE_URL=postgresql://[staging_user]:[staging_password]@[staging_host]:6543/lakshyaai_staging?sslmode=require
DIRECT_URL=postgresql://[staging_user]:[staging_password]@[staging_host]:5432/lakshyaai_staging?sslmode=require
TEST_DATABASE_URL=sqlite:///./test_isolated.db

# Authentication & Security
SECRET_KEY=[generate_32_byte_cryptographic_hex_key]
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Allowed CORS Origins (Restricted to staging domains)
CORS_ORIGINS=https://lakshya-ai-staging.onrender.com,http://127.0.0.1:5173,http://localhost:5173
FRONTEND_URL=https://lakshya-ai-staging.onrender.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE_AUTH=15
RATE_LIMIT_PER_MINUTE_AI=30

# Staging Super Admin Bootstrap
ADMIN_EMAILS=staging-superadmin@lakshya.ai

# AI Inference Provider (Staging Groq / Gemini API key)
AI_PROVIDER=groq
GROQ_API_KEY=[staging_groq_api_key]
GROQ_MODEL=llama-3.3-70b-versatile

# Migration Execution Authorization
CONFIRM_STAGING_MIGRATION=true
```

#### C. Access Controls & Network Isolation
- [ ] Ensure `CORS_ORIGINS` strictly specifies the staging frontend URL without wildcard (`*`).
- [ ] Verify that `ADMIN_EMAILS` includes only designated QA test accounts.
- [ ] Verify that rate limiting is enabled (`RATE_LIMIT_ENABLED=true`).

#### D. Backup & Point-in-Time Recovery (PITR) Plan
Before applying any migration or executing QA load against staging:
1. **Pre-Migration Snapshot:**
   - On Supabase: Trigger manual snapshot via Dashboard -> Database -> Backups.
   - On Standard PostgreSQL: Run pg_dump export:
     ```bash
     pg_dump -h [staging_host] -U [staging_user] -d lakshyaai_staging -Fc -f staging_pre_migration_backup.dump
     ```
2. **Rollback Verification:**
   - Verify that the snapshot file exists and has non-zero bytes.
   - In the event of migration failure, restore via `pg_restore`:
     ```bash
     pg_restore -h [staging_host] -U [staging_user] -d lakshyaai_staging --clean staging_pre_migration_backup.dump
     ```

---

### 3. Database Migration Target Verification & Execution Sequence

#### Target Safety Guard Verification
The backend includes a dedicated guard in `lakshyaai-backend/alembic/env.py` (`_assert_migration_safety`):
```python
def _assert_migration_safety(url: str) -> None:
    lower_url = url.lower()
    is_local = "localhost" in lower_url or "127.0.0.1" in lower_url or "sqlite" in lower_url or "staging-db" in lower_url
    if is_local:
        return
    sanitized = _sanitize_url(url)
    is_staging_confirmed = (
        os.environ.get("CONFIRM_STAGING_MIGRATION") == "true"
        or ("staging" in lower_url and os.environ.get("ENVIRONMENT", "").lower() == "staging")
    )
    is_prod_confirmed = os.environ.get("CONFIRM_PROD_MIGRATION") == "true"
    if not is_staging_confirmed and not is_prod_confirmed:
        raise RuntimeError(f"SAFETY GUARD: Migration targets a remote database without verified staging or production confirmation.")
    if ("supabase.com" in lower_url or os.environ.get("ENVIRONMENT", "").lower() == "production") and not is_prod_confirmed:
        raise RuntimeError(f"SAFETY GUARD: Detected remote production database. Execution strictly prohibited.")
```

#### Execution Sequence (Once Staging Database is Available)

1. **Verify Target Database Identity (Safe Pre-Flight Check):**
   Execute without displaying credentials:
   ```powershell
   .\lakshyaai-backend\.venv\Scripts\python.exe -c "import os; from dotenv import load_dotenv; load_dotenv('lakshyaai-backend/.env.staging'); url = os.getenv('DATABASE_URL', ''); host = url.split('@')[-1].split('/')[0] if '@' in url else 'local'; print('STAGING TARGET HOST:', host); print('IS_NOT_PRODUCTION:', 'aws-0-ap-northeast-2.pooler.supabase.com' not in host)"
   ```
2. **Inspect Current Alembic Revision on Staging:**
   ```powershell
   cd "C:\Users\91807\Desktop\MY projects\lakshya-ai-career-platform\lakshyaai-backend"
   .\.venv\Scripts\python.exe -m alembic current
   # Expected output: c8b9d0e1f2a3 (head)
   ```
3. **Execute Transactional Staging Migration:**
   ```powershell
   .\.venv\Scripts\python.exe -m alembic upgrade d9e0f1a2b3c4
   # Expected output:
   # INFO  [alembic.runtime.migration] Running upgrade c8b9d0e1f2a3 -> d9e0f1a2b3c4, add_ai_request_telemetry
   ```
4. **Verify Schema Creation & Row-Level Security:**
   ```powershell
   .\.venv\Scripts\python.exe -c "from app.db.database import engine; from sqlalchemy import inspect, text; insp = inspect(engine); print('ai_request_telemetry table present:', 'ai_request_telemetry' in insp.get_table_names()); print('Indexes:', [i['name'] for i in insp.get_indexes('ai_request_telemetry')]);"
   ```
5. **Verify Downgrade (Rollback) Capability:**
   ```powershell
   .\.venv\Scripts\python.exe -m alembic downgrade c8b9d0e1f2a3
   .\.venv\Scripts\python.exe -m alembic upgrade d9e0f1a2b3c4
   ```

---

### 4. Manual Chrome/Firefox QA Checklist (All 10 Super Admin Modules)

Once the application is deployed to staging, open **Google Chrome** (v155.0.8059.85) and **Mozilla Firefox** and execute this manual verification suite using the test account `staging-superadmin@lakshya.ai`:

```mermaid
graph LR
    A["1. Overview KPI Links"] --> B["2. User Mgmt Sort/Search"]
    B --> C["3. Candidate 360 Actions"]
    C --> D["4. Platform Analytics"]
    D --> E["5. AI Usage Telemetry"]
    E --> F["6. Feature Flags Toggle/Del"]
    F --> G["7. Announcement Lifecycle"]
    G --> H["8. System Health Diagnostics"]
    H --> I["9. Audit Search/Export"]
    I --> J["10. DB Explorer Relational"]
```

#### Detailed Test Specification Table

| # | Super Admin Module | Route | Verification Steps & Actions | Expected Result & Pass Criteria | Test Outcome |
| :-: | :--- | :--- | :--- | :--- | :---: |
| **1** | **Overview** | `/admin/dashboard` | 1. Navigate to `/admin/dashboard`.<br>2. Inspect Total Candidates, Suspended Accounts, Active Subscriptions.<br>3. Click "Total Candidates" card.<br>4. Return and click "Suspended Accounts" card. | - KPI counts reflect real staging database counts.<br>- "Total Candidates" deep-links to `/admin/users?role=user`.<br>- "Suspended Accounts" deep-links to `/admin/users?status=suspended`. | `[ ] PENDING QA` |
| **2** | **User Management** | `/admin/users` | 1. Inspect table headers: Name, Email, Role, Status, Created.<br>2. Click "Name" to sort Ascending, then Descending.<br>3. Enter search term into search box.<br>4. Click pagination Next/Previous buttons. | - Arrow indicators toggle on sortable headers.<br>- URL parameters update (`sort_by=name&sort_order=asc`).<br>- Search filters without full page reload.<br>- Candidate readiness scores display unified format or `--` for unassessed candidates. | `[ ] PENDING QA` |
| **3** | **Candidate 360° Workspace** | `/admin/users/:userId` | 1. Open a candidate workspace.<br>2. Click "Suspend Account". Enter suspension reason. Submit.<br>3. Click "Change Role" -> select "admin". Submit.<br>4. Click "Mark Unverified". Confirm.<br>5. Attempt self-targeting action on own account. | - Suspension modal requires reason; badge updates to `Suspended`.<br>- Role updates to `admin`.<br>- Self-targeting action is disabled/rejected with error toast.<br>- Actions are logged in audit trail. | `[ ] PENDING QA` |
| **4** | **Platform Analytics** | `/admin/analytics` | 1. Inspect platform activity metrics.<br>2. Verify user growth chart, feature distribution, and conversion charts.<br>3. Toggle time filter (7d, 30d, 90d). | - Charts render cleanly with dark glassmorphism styling.<br>- Hover tooltips display accurate numbers.<br>- Zero JavaScript console errors. | `[ ] PENDING QA` |
| **5** | **AI Usage & Telemetry** | `/admin/ai` | 1. Inspect Token Totals card.<br>2. Verify "Breakdown by Model" table.<br>3. Inspect "Pricing Assumptions" table.<br>4. Switch date range filter. | - Token count and estimated costs ($) display correctly.<br>- Unknown models use fallback pricing with explanatory note.<br>- No blank cards, NaN values, or uncaught TypeError. | `[ ] PENDING QA` |
| **6** | **Feature Flags** | `/admin/features` | 1. Verify badges for System Flags vs Custom Flags.<br>2. Toggle a custom flag switch.<br>3. Click "New Feature Flag" -> create `beta_search`.<br>4. Click trash icon on `beta_search` -> confirm deletion.<br>5. Confirm system flags (`voice_interview`, etc.) have NO delete button. | - System flags display indigo `System Flag` badge.<br>- Custom flags display amber `Custom Flag` badge.<br>- Protected flags cannot be deleted.<br>- Deletion dialog prompts for confirmation and dispatches delete. | `[ ] PENDING QA` |
| **7** | **Announcements** | `/admin/announcements` | 1. Inspect announcements table.<br>2. Click "New Announcement" -> fill form and submit.<br>3. Click "Edit" icon on existing announcement -> modify message -> save.<br>4. Toggle "Active" switch.<br>5. Verify expired announcement displays `Expired` badge. | - Modal opens with populated fields on edit.<br>- Status toggles between Active and Draft.<br>- Notification endpoint filters out expired/inactive announcements. | `[ ] PENDING QA` |
| **8** | **System Health** | `/admin/system` | 1. Navigate to `/admin/system`.<br>2. Check Database Connectivity card and latency (ms).<br>3. Check AI Provider status badges.<br>4. Click "Refresh Diagnostics". | - Roundtrip latency displayed (e.g., `4.8 ms`).<br>- Status displays `healthy` or `degraded` gracefully if a service is down.<br>- Probes do not hang or block HTTP thread. | `[ ] PENDING QA` |
| **9** | **Governance & Audit** | `/admin/audit` | 1. Inspect audit log entries.<br>2. Enter action in search filter.<br>3. Select Start Date and End Date.<br>4. Invert dates (Start > End) to test error handling.<br>5. Click "Export CSV". Open downloaded file in Excel. | - Search filters logs instantly.<br>- Inverted dates trigger validation error toast.<br>- CSV file downloads with header `Content-Disposition`.<br>- Cells starting with `=`, `+`, `-`, `@` are safely escaped with `'`. | `[ ] PENDING QA` |
| **10** | **Database Explorer** | `/admin/database` | 1. Select `users` table.<br>2. Click foreign-key navigation link (`user_career_profiles`).<br>3. Verify filtered table view displays active filter pill (`user_id = ...`).<br>4. Click "Clear Filter" button.<br>5. Attempt to edit or delete the last active super admin record. | - Foreign key link transitions to related table filtered by that ID.<br>- Filter pill displays active constraint with Clear button.<br>- Clear button resets to full table.<br>- Attempt to alter/delete last super admin returns error toast. | `[ ] PENDING QA` |

---

### 5. Next Immediate Actions & Approvals Required

To proceed with live staging deployment and final release review, the following actions are required from the user / cloud administrator:

1. **Step 1 — Cloud Infrastructure Provisioning:**
   - Provision an isolated PostgreSQL staging database (e.g., on a free Supabase project, Neon, or Render PostgreSQL).
   - Ensure `pgvector` extension is enabled.
2. **Step 2 — Provide Staging Database Connection Information:**
   - Provide the staging connection string (e.g. `postgresql://staging_user:password@staging-host:5432/lakshyaai_staging`).
   - Confirm that this database is completely separate from the production database (`aws-0-ap-northeast-2.pooler.supabase.com`).
3. **Step 3 — Approve Staging Migration Execution:**
   - With staging database credentials verified, Antigravity AI will execute `alembic upgrade d9e0f1a2b3c4` targeting staging only.
4. **Step 4 — Execute Browser QA Walkthrough:**
   - Deploy frontend and backend to staging URL and execute the 10-module Chrome/Firefox manual QA checklist.
