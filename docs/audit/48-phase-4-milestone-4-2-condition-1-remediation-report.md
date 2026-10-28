# Phase 4 — Milestone 4.2 Remediation Report: Condition 1 (ISSUE-M42-1)

**Project:** Lakshya AI Career Platform  
**Target Issue:** ISSUE-M42-1 (Frontend/backend response-shape mismatch for `breakdown_by_model` and `pricing_assumptions` in `AdminAIPage.tsx`)  
**Authorization:** Approved to remediate ISSUE-M42-1 only.  
**Date:** October 27, 2026  
**Status:** **Remediated & Verified**  

---

## 1. Root Cause & Verified API Response Shapes

### 1.1 Root Cause Analysis
During the independent acceptance audit of Milestone 4.2 ([47-phase-4-milestone-4-2-independent-acceptance-audit.md](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/docs/audit/47-phase-4-milestone-4-2-independent-acceptance-audit.md)), inspection revealed that the backend implementation of `AITelemetryService.get_ai_metrics()` produces dictionary structures for `breakdown_by_model` and `pricing_assumptions`:
- `breakdown_by_model`: A dictionary (`dict[str, dict[str, Any]]`) keyed by foundation model names (e.g., `"llama-3.3-70b-versatile"`, `"gpt-4o-mini"`).
- `pricing_assumptions`: A structured dictionary (`dict[str, Any]`) containing metadata keys `currency`, `calculation_basis`, `rates`, and `disclaimer`.

In contrast, [AdminAIPage.tsx](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/pages/admin/AdminAIPage.tsx) initially assumed arrays and directly invoked `.map()` on `ai.breakdown_by_model` and `ai.pricing_assumptions`. This discrepancy was masked in early tests because mock fixtures provided array payloads rather than the live backend response shape. At runtime with the real API, calling `.map()` on an object caused a TypeError runtime exception.

### 1.2 Verified API Response Shapes
Inspection of [ai_telemetry_service.py:L171-183](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/ai_telemetry_service.py#L171-L183) and [ai_telemetry_service.py:L311-345](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/services/ai_telemetry_service.py#L311-L345) verified the exact server-side payload contract:

```json
{
  "total_requests": 120,
  "success_rate": 98.3,
  "average_response_time_ms": 1240.0,
  "failed_requests": 2,
  "sample_size": 120,
  "p50_latency_ms": 1100.0,
  "p95_latency_ms": 2200.0,
  "p99_latency_ms": 3100.0,
  "telemetry_source": "ai_request_telemetry",
  "breakdown_by_feature": {
    "resume_optimization": 70,
    "interview_coach": 50
  },
  "breakdown_by_provider": {
    "groq": 80,
    "openai": 40
  },
  "total_prompt_tokens": 150000,
  "total_completion_tokens": 50000,
  "total_tokens": 200000,
  "token_metered_requests": 100,
  "unmetered_requests": 20,
  "estimated_cost_usd": 0.1280,
  "breakdown_by_model": {
    "llama-3.3-70b-versatile": {
      "model_name": "llama-3.3-70b-versatile",
      "provider": "groq",
      "requests": 80,
      "prompt_tokens": 100000,
      "completion_tokens": 30000,
      "total_tokens": 130000,
      "estimated_cost_usd": 0.0827,
      "is_priced": true
    },
    "gpt-4o-mini": {
      "model_name": "gpt-4o-mini",
      "provider": "openai",
      "requests": 20,
      "prompt_tokens": 50000,
      "completion_tokens": 20000,
      "total_tokens": 70000,
      "estimated_cost_usd": 0.0195,
      "is_priced": true
    }
  },
  "pricing_assumptions": {
    "currency": "USD",
    "calculation_basis": "Published provider list rates per 1,000,000 input/output tokens",
    "rates": {
      "llama-3.3-70b-versatile": {
        "input_per_million": 0.59,
        "output_per_million": 0.79,
        "provider": "groq"
      },
      "gpt-4o-mini": {
        "input_per_million": 0.15,
        "output_per_million": 0.60,
        "provider": "openai"
      }
    },
    "disclaimer": "Cost estimations are mathematical approximations based on measured token usage and standard public rates. Actual provider invoices may vary based on caching, volume discounts, or batch processing."
  },
  "time_range": "all"
}
```

---

## 2. Files Changed & Purpose of Changes

Following the instruction to prefer the minimal frontend-only fix without mutating backend schemas:

### 2.1 [src/types/index.ts](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/types/index.ts)
- Enhanced `AIModelBreakdownItem` interface to support both live backend property names (`requests`, `is_priced`) and historical mock names (`request_count`, `pricing_available`).
- Defined `AIPricingAssumptions` interface modeling `{ currency?: string; calculation_basis?: string; rates?: Record<string, { input_per_million: number; output_per_million: number; provider?: string; }>; disclaimer?: string; }`.
- Updated `AIUsageStats` so that:
  - `breakdown_by_model?: Record<string, AIModelBreakdownItem> | AIModelBreakdownItem[];`
  - `pricing_assumptions?: AIPricingAssumptions | string[];`

### 2.2 [src/pages/admin/AdminAIPage.tsx](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/pages/admin/AdminAIPage.tsx)
- Implemented and exported reusable normalization helper `normalizeModelBreakdown(raw)`:
  - Safely handles `null`, `undefined`, and empty objects (`{}`) returning `[]`.
  - Converts dictionary objects via `Object.entries(raw)`, ensuring the dictionary key is preserved as `model_name` if omitted.
  - Passes arrays through safely while mapping fallback field names (`requests ?? request_count ?? 0`, `is_priced ?? pricing_available ?? false`).
- Implemented and exported reusable normalization helper `normalizePricingAssumptions(raw)`:
  - Safely extracts `calculation_basis`, per-model rates (`Catalog rate for <PROVIDER> (<model>): $<input>/1M input, $<output>/1M output`), and `disclaimer` into formatted note strings.
  - Accepts preformatted string arrays for backward compatibility.
  - Handles `null`, `undefined`, and empty objects returning `[]`.
- Updated table rendering to use `modelBreakdownList` and notes rendering to use `pricingNotes`, guaranteeing safe zero-state handling without runtime exceptions.

### 2.3 [src/test/adminAITelemetryTokens.test.tsx](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/src/test/adminAITelemetryTokens.test.tsx)
- Added dedicated unit tests for `normalizeModelBreakdown` and `normalizePricingAssumptions` covering dictionaries, arrays, empty objects, and `null`/`undefined`.
- Added end-to-end integration tests using the live backend dictionary response shape (`mockAIMetricsDictionary`).
- Retained tests using array payloads (`mockAIMetricsArray`) to ensure backward compatibility.
- Added tests asserting safe handling of `null`/`undefined` fields and zero-telemetry states.

---

## 3. Regression Tests & Verification Results

### 3.1 Focused AI Telemetry Vitest Tests
Command executed:
```powershell
npx vitest run src/test/adminAITelemetryTokens.test.tsx
```
Output:
```
 ✓ src/test/adminAITelemetryTokens.test.tsx (14 tests) 377ms
   ✓ Normalization Helpers Unit Tests > normalizeModelBreakdown handles null, undefined, and empty objects safely
   ✓ Normalization Helpers Unit Tests > normalizeModelBreakdown converts a dictionary to an array and infers key if model_name missing
   ✓ Normalization Helpers Unit Tests > normalizeModelBreakdown handles array input and preserves request_count / pricing_available fallbacks
   ✓ Normalization Helpers Unit Tests > normalizePricingAssumptions handles null, undefined, and empty structures safely
   ✓ Normalization Helpers Unit Tests > normalizePricingAssumptions formats structured backend dictionary into notes
   ✓ Normalization Helpers Unit Tests > normalizePricingAssumptions preserves preformatted string arrays
   ✓ Integration Tests with Actual Live Backend Dictionary Response Shape > safely renders live dictionary response without crashes or missing rows
   ✓ Integration Tests with Array Response Shape (Backward Compatibility) > 1. Renders token metrics (Prompt, Completion, Total) and Estimated Cost in USD
   ✓ Integration Tests with Array Response Shape (Backward Compatibility) > 2. Accurately reports telemetry token coverage distinguishing metered vs unmetered requests
   ✓ Integration Tests with Array Response Shape (Backward Compatibility) > 3. Renders Foundation Model breakdown table with itemized tokens and pricing statuses
   ✓ Integration Tests with Array Response Shape (Backward Compatibility) > 4. Displays defensible pricing assumptions and data transparency notes
   ✓ Integration Tests with Array Response Shape (Backward Compatibility) > 5. Triggers getAIMetrics query with selected time range filter
   ✓ Integration Tests with Array Response Shape (Backward Compatibility) > 6. Handles empty telemetry data gracefully without NaN or UI crashes
   ✓ Integration Tests with Array Response Shape (Backward Compatibility) > 7. Handles null / undefined breakdown_by_model and pricing_assumptions safely

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  2.78s
```

### 3.2 Combined Milestone 4.2 Focused Tests
Command executed:
```powershell
npx vitest run src/test/adminAITelemetryTokens.test.tsx src/test/adminUser360Actions.test.tsx
```
Output:
```
 ✓ src/test/adminAITelemetryTokens.test.tsx (14 tests) 421ms
 ✓ src/test/adminUser360Actions.test.tsx (7 tests) 389ms

 Test Files  2 passed (2)
      Tests  21 passed (21)
   Duration  2.31s
```

### 3.3 Backend Regression Test Suite
Command executed:
```powershell
powershell -Command "Set-Item -Path env:TESTING -Value 'true'; Set-Item -Path env:PYTHONPATH -Value '.'; .\.venv\Scripts\python.exe -m unittest tests/test_phase4_milestone4_2.py -v"
```
Output:
```
test_01_token_aggregation_and_metered_coverage ... ok
test_02_cost_estimation_accuracy_against_catalog ... ok
test_03_unrecognized_model_pricing_safety ... ok
test_04_time_range_filtering ... ok
test_05_admin_suspend_and_activate_candidate_lifecycle ... ok
test_06_admin_service_protects_bootstrap_account ... ok
test_07_readiness_score_semantics_preserved ... ok

----------------------------------------------------------------------
Ran 7 tests in 0.267s

OK
[SECURITY GUARD] Prevented live Supabase access from test runner. Using isolated test DB: sqlite:///./test_isolated.db
```

### 3.4 Full Frontend Test Suite
Command executed:
```powershell
npx vitest run
```
Output:
```
 Test Files  42 passed (42)
      Tests  203 passed (203)
   Duration  19.62s
```
Distinction of results:
- **Passed:** 203 tests across 42 test suites.
- **Failed:** 0.
- **Skipped / Not Run:** 0.

---

## 4. Production Build Result

Command executed:
```powershell
npm run build
```
Output:
```
vite v5.4.19 building for production...
transforming...
✓ 1904 modules transformed.
rendering chunks...
computing chunk sizes...
dist/assets/AdminAIPage-28oYiBhq.js              20.38 kB │ gzip:   4.52 kB
...
✓ built in 13.32s
```
Exit code: `0`. The build completed cleanly with no compilation or bundling errors.

---

## 5. Safety Boundaries & Environment Integrity Confirmation

| Guardrail / Constraint | Status | Details |
| :--- | :---: | :--- |
| **Database Modifications** | **0 Modified** | Live Supabase was not connected to or modified during testing or development. |
| **Test Database Isolation** | **Enforced** | Fail-closed guard in [database.py](file:///C:/Users/91807/Desktop/MY%20projects/lakshya-ai-career-platform/lakshyaai-backend/app/db/database.py) routed all test transactions to `sqlite:///./test_isolated.db`. |
| **Database Migrations** | **0 Executed** | No schema migrations were generated or run during this remediation. |
| **Deployments** | **0 Executed** | No services, containers, or functions were deployed. |
| **Dependencies Installed** | **0 Installed** | Zero packages or browser drivers installed. |
| **Milestone 4.3 Scope** | **Untouched** | Milestone 4.3 has not been started. |
| **Candidate Readiness Scoring** | **Preserved** | ISSUE-M42-2 remains documented and untouched for planned review in Milestone 4.3. |

---

## 6. Remaining Limitations & Closure Recommendation

1. **ISSUE-M42-2 (Readiness Scoring Formula):** Intentionally left unchanged in accordance with instructions. It is scheduled for unified alignment in Milestone 4.3.
2. **Catalog Rate Hardcoding:** Per-model token pricing uses standard catalog definitions. Dynamic per-tier billing will be introduced if custom tenant pricing is needed in later roadmap phases.
3. **Recommendation:** Condition 1 (`ISSUE-M42-1`) of Milestone 4.2 is fully satisfied, tested, and resolved. Milestone 4.2 is ready for full closure upon user review.
