# Lakshya AI — Security Runbook: Credential Rotation & History Scrubbing

**Document ID:** RUNBOOK-SEC-01  
**Classification:** Restricted / DevOps & Security Operations  
**Date:** 2026-10-18  
**Status:** Action Required (Operator Execution)  

---

## 1. Executive Summary & Scope

An audit of the git commit history confirmed that configuration secrets were committed in early repository revisions:
- Historical commit `1fcef6ff27f8c856d454547d23645d433df76144` (Initial commit)
- Historical commit `58d7914c621a9bb449c9c0b2fcdd4225be85cd77` (Fix CORS final)
- Historical commit `704c767a71fea16fdb16f486d8e582e3212a2e85` (Platform finalization)

Under industry security standards (OWASP, NIST SP 800-57, SOC 2), committed secrets MUST be considered fully compromised even if deleted in subsequent commits. Simply deleting the file or rewriting `.gitignore` does not revoke the validity of existing API tokens, passwords, and signing keys.

This runbook defines the exact, non-automated manual rotation procedure for each exposed service and the coordinated procedure for scrubbing repository history.

> [!CAUTION]
> **Zero Automated Invalidation Policy:**  
> The agent and automated scripts must NEVER automatically rotate or print production credentials. All rotations must be executed by authorized human administrators through vendor control consoles.

---

## 2. Inventory of Exposed Credentials Requiring Rotation

| Service | Setting Key | Location | Rotation Mechanism | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Google Cloud / OAuth 2.0** | `GOOGLE_CLIENT_SECRET` | GCP Console | Google Cloud Console > APIs & Services > Credentials | P0 - Immediate |
| **Supabase PostgreSQL** | `DATABASE_URL` / `DIRECT_URL` (DB Password) | Supabase Dashboard | Supabase Dashboard > Project Settings > Database | P0 - Immediate |
| **Supabase API Keys** | `SUPABASE_SERVICE_ROLE_KEY` / `ANON_KEY` | Supabase Dashboard | Supabase Dashboard > Project Settings > API | P0 - Immediate |
| **Application JWT Signing** | `SECRET_KEY` | Environment Config | Generate new 256-bit entropy secret via `openssl rand -hex 32` | P0 - Immediate |
| **Simulation Token Signing** | `SIMULATION_SECRET_KEY` | Environment Config | Generate new 256-bit entropy secret via `openssl rand -hex 32` | P0 - Immediate |
| **Gmail SMTP** | `SMTP_PASSWORD` (App Password) | Google Account Security | Google Account > Security > 2-Step Verification > App Passwords | P1 - Urgent |
| **Groq AI Provider (Primary LLM)** | `GROQ_API_KEY` | Groq Console | Groq Console > API Keys ([console.groq.com/keys](https://console.groq.com/keys)) | P1 - Urgent |
| **Secondary AI LLM Providers** | `OPENROUTER_API_KEY` / `OPENAI_API_KEY` | Provider Consoles | OpenRouter / OpenAI Platform API Keys | P2 - Normal |

---

## 3. Step-by-Step Vendor Console Rotation Procedures

### 3.1. Google Cloud OAuth 2.0 Client Secret
1. Log in to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select the target project for Lakshya AI.
3. Navigate to **APIs & Services** > **Credentials**.
4. Under **OAuth 2.0 Client IDs**, select the web client ID used by Lakshya AI.
5. Click **Reset Secret** to generate a new secret.
6. Verify authorized redirect URIs match production and development domains:
   - `http://localhost:5173/auth/callback`
   - `https://your-domain.com/auth/callback`
7. Delete the old client secret after updating the production environment.
8. Update `GOOGLE_CLIENT_SECRET` in secret managers (e.g., Render, Doppler, AWS SSM).

### 3.2. Supabase PostgreSQL Database Password & API Keys
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your Lakshya AI project.
3. Navigate to **Project Settings** > **Database**.
4. Scroll to **Database password** and click **Reset Database Password**.
5. Generate a cryptographically strong password (at least 24 characters).
6. Update connection strings in application configuration:
   - Transaction Pooler (Port 6543): `postgresql://postgres.[ref]:[NEW_PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`
   - Session Pooler (Port 5432): `postgresql://postgres.[ref]:[NEW_PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require`
7. Navigate to **Project Settings** > **API**.
8. Under **Project API keys**, click **Generate new secret** for the `service_role` and `anon` keys if they were historically tracked.
9. Verify database connectivity using connection test probes.

### 3.3. Application JWT Secret Key (`SECRET_KEY`)
1. Generate a new high-entropy secret key locally:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
2. Update the `SECRET_KEY` variable in the backend environment.
3. **Operational Impact:** Rotating this key immediately invalidates all issued JWT access tokens, cleanly terminating active candidate and administrator sessions. Users will be required to re-authenticate.

### 3.4. Simulation Token Signing Key (`SIMULATION_SECRET_KEY`)
1. Generate a new high-entropy secret key locally:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. Update `SIMULATION_SECRET_KEY` in the backend environment.
3. **Operational Impact:** Invalidates all issued `X-Simulation-Token` headers. Any active "View As" session immediately fails closed and requires the super-admin to re-initiate the session from the Admin Portal.

### 3.5. Gmail SMTP Application Password
1. Log in to the Google account associated with the platform's email service.
2. Go to **Manage your Google Account** > **Security**.
3. Under **How you sign in to Google**, select **2-Step Verification**.
4. Scroll to the bottom and select **App passwords**.
5. Revoke the existing `LakshyaAI-SMTP` password.
6. Create a new App password named `LakshyaAI-Backend-2026`.
7. Update `SMTP_PASSWORD` in the backend environment.

### 3.6. AI Provider Keys (Groq / OpenRouter / OpenAI)
1. For Groq (Primary Text-Generation Engine):
   - Navigate to [Groq Console API Keys](https://console.groq.com/keys).
   - Generate a new API key (`gsk_...`).
   - Update `GROQ_API_KEY` in staging/production environment settings.
   - Delete/revoke the previous API key once services have reloaded.
2. For Secondary Providers (OpenRouter / OpenAI):
   - Navigate to [OpenRouter Keys](https://openrouter.ai/keys) / [OpenAI API Keys](https://platform.openai.com/api-keys).
   - Generate new API keys with appropriate monthly spend limits.
   - Update `OPENROUTER_API_KEY` / `OPENAI_API_KEY` in backend environment settings.
   - Delete previous keys.

### 3.7. Verification of Invalidation (Fail-Closed Validation)
- **Google OAuth:** Attempting to exchange an authorization code using the old `GOOGLE_CLIENT_SECRET` must return HTTP `401 Unauthorized` / `invalid_client`.
- **Database Connection:** Connecting using the old Supabase password via `psql` or SQLAlchemy must return `FATAL: password authentication failed for user "postgres"`.
- **JWT / Simulation Tokens:** Tokens signed with the old `SECRET_KEY` or `SIMULATION_SECRET_KEY` must be rejected with HTTP `401 Unauthorized` (`Signature verification failed`).
- **Gmail SMTP:** Attempting to authenticate with the old App Password must return `535 5.7.8 Username and Password not accepted`.

---

## 4. Coordinated Git History Scrubbing Procedure

Scrubbing credentials from git history rewrites commit SHAs across the entire repository graph. It must be coordinated and executed only after full credential rotation.

> [!WARNING]
> Do NOT execute history rewriting without a verified mirror backup, full push freeze, and team sign-off. Remember: git history cleaning DOES NOT replace credential rotation.

### 4.1. Preparation & Push Freeze
- [ ] Announce a push freeze across all engineering channels.
- [ ] Ensure all active branches and uncommitted work are pushed or stashed.
- [ ] Create a complete mirror backup of the repository and all refs:
  ```bash
  git clone --mirror <repo-url> lakshya-ai-backup.git
  ```
- [ ] Verify the backup integrity with `git fsck` inside `lakshya-ai-backup.git`.

### 4.2. Sensitive Paths for Purge
The history scrub must purge all occurrences of:
- `.env`
- `lakshyaai-backend/.env`
- `lakshyaai-backend/.venv/` (committed in early revisions)
- `lakshyaai-backend/venv/`

### 4.3. Execution with `git-filter-repo`
1. Install `git-filter-repo` in an isolated environment:
   ```bash
   pip install git-filter-repo
   ```
2. In a clean, dedicated clone:
   ```bash
   git filter-repo --invert-paths \
     --path .env \
     --path lakshyaai-backend/.env \
     --path lakshyaai-backend/.venv \
     --path lakshyaai-backend/venv
   ```
3. Inspect rewritten history **without displaying secret values**:
   ```bash
   git log --all --full-history --name-only -- ".env" "lakshyaai-backend/.env"
   ```
   *(Expected output: empty / zero commits returned)*
4. Validate repository integrity:
   ```bash
   git fsck --full
   ```
5. Force-push rewritten refs to remote:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

### 4.4. Post-Rewrite Reconciliation for Collaborators
- Collaborators must **NOT** pull or merge their old local branches into the rewritten repository (which would resurrect scrubbed commits).
- All team members must delete old clones and perform a fresh `git clone`.
- Any uncommitted local work should be applied as `git format-patch` or clean diffs against fresh branch checkouts.

### 4.5. External Artifacts & Surface Handling
- **Forks:** Contact repository fork owners to rebase or delete forks.
- **Pull Requests:** Any historical PR comments or cached diff views on GitHub/GitLab must be cleared or the PRs closed.
- **CI/CD Logs:** Inspect past CI build logs in GitHub Actions, Render, or Supabase for echoed secrets; purge log history if retention policies permit.

---

## 5. Verification & Audit Trail

Following rotation and history sanitization:
1. Trigger backend readiness check:
   ```bash
   curl -s http://localhost:10000/api/health/ready
   ```
2. Confirm user authentication flow (login, token refresh) succeeds with the new `SECRET_KEY`.
3. Confirm database queries succeed against Supabase with the new connection credentials.
4. Record completion date, rotating engineer identity, and updated key identifiers in internal compliance registers.

---

## 6. Action Tracking & Release Gate Status

| Action Item | Scope | Remediation / Verification Evidence | Status |
| :--- | :--- | :--- | :--- |
| **Code Remediation: .gitignore & Index** | Local codebase | `.env` untracked, `.gitignore` enforced, automated printing guardrails | **PASS** |
| **Code Remediation: Dynamic Secret Loading** | Backend runtime | Configuration loads from environment via Pydantic `Settings`; no hardcoded secrets | **PASS** |
| **Code Remediation: Token Safety Verification** | Auth & Simulation | JWT signing, expiration, and simulation token SHA-256 hashing covered by tests | **PASS** |
| **Manual Vendor Rotation: Supabase Database** | Remote Provider | Supabase Console password & service role key reset | **BLOCKED** (Awaiting Operator Execution) |
| **Manual Vendor Rotation: Google OAuth** | Remote Provider | GCP Console `GOOGLE_CLIENT_SECRET` reset | **BLOCKED** (Awaiting Operator Execution) |
| **Manual Vendor Rotation: Gmail SMTP** | Remote Provider | Google Account App Password reset | **BLOCKED** (Awaiting Operator Execution) |
| **Manual Vendor Rotation: Groq AI Provider** | Remote Provider | Groq Console `GROQ_API_KEY` rotation & configuration | **BLOCKED** (Awaiting Operator Execution) |
| **Manual Vendor Rotation: Secondary AI Providers** | Remote Provider | OpenRouter / OpenAI API key rotation | **BLOCKED** (Awaiting Operator Execution) |
| **Git History Scrubbing & Force Push** | Git Repository | Push freeze, `git clone --mirror`, `git-filter-repo`, team re-clone | **BLOCKED** (Requires Push Freeze & Human Auth) |
