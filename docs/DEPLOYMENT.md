# 🚀 Lakshya AI — Production Deployment & Operations Guide

This document provides complete instructions for containerized production deployment, environment configuration, pre-release certification gates, Service Level Objectives (SLOs), and disaster recovery.

---

## 1. Environment Configuration

### Root `.env` (Frontend Build)
```env
VITE_API_URL=http://127.0.0.1:10000/api
VITE_APP_ENV=production
```

### Backend `lakshyaai-backend/.env`
```env
DATABASE_URL=postgresql://lakshyaai_user:strong_password@postgres:5432/lakshyaai_prod
SECRET_KEY=production_random_64_byte_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=60
APP_ENV=production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE_AUTH=15
RATE_LIMIT_PER_MINUTE_AI=30
```

---

## 2. Docker Compose Production Stack

The platform runs as a multi-container stack orchestrated via `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      POSTGRES_DB: lakshyaai_prod
      POSTGRES_USER: lakshyaai_user
      POSTGRES_PASSWORD: strong_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lakshyaai_user -d lakshyaai_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./lakshyaai-backend
      dockerfile: Dockerfile
    restart: always
    environment:
      DATABASE_URL: postgresql://lakshyaai_user:strong_password@postgres:5432/lakshyaai_prod
      APP_ENV: production
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Launch Production Stack
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 3. Production Release Quality Gates

Before any build is promoted to production, it must pass all 5 verification gates:

| Verification Gate | Command | Standard / Pass Criteria |
| :--- | :--- | :--- |
| **1. TypeScript Compilation** | `npx tsc --noEmit` | **0 errors**, strict type checking |
| **2. Frontend Unit Tests** | `npm run test` | **40 / 40 tests passing** in Vitest |
| **3. Backend Security & Unit** | `python -m unittest discover -s tests` | **88 / 88 tests passing** (0 failures) |
| **4. Frontend Production Build**| `npm run build` | Bundle builds cleanly in **under 15s** |
| **5. Health & Liveness Probe** | `curl -f http://localhost:10000/api/health` | Returns `status: ok` in **< 50ms** |

---

## 4. Service Level Objectives (SLOs) & Targets

### Latency Targets
| Operation Category | P50 Median | P95 Target | Max Allowed (P99) |
| :--- | :--- | :--- | :--- |
| **Liveness / Health Probes** | < 20 ms | < 50 ms | < 100 ms |
| **Authentication & Profiles**| < 150 ms | < 500 ms | < 1,000 ms |
| **Application & Roadmap State** | < 200 ms | < 600 ms | < 1,200 ms |
| **Analytics & Telemetry** | < 350 ms | < 800 ms | < 1,500 ms |
| **AI Inference Pipelines** | < 3,000 ms | < 7,000 ms | < 10,000 ms |

### Availability & Reliability
- **Platform Availability**: ≥ 99.9% Uptime (< 43.8 min monthly downtime)
- **API Error Rate**: < 1.0% (Excluding client 4xx errors)
- **Failed Database Migrations**: 0 Tolerance (100% idempotent)
- **Cross-Tenant Data Leakage**: 0 Tolerance (User-scoped queries + cache isolation)

---

## 5. Operational Probes & Disaster Recovery

- **Liveness Probe**: `GET /api/health` — Confirms FastAPI process is healthy.
- **Readiness Probe**: `GET /api/health/ready` — Validates PostgreSQL connection, PgVector availability, and rate limiter.
- **Recovery Point Objective (RPO)**: < 1 hour (Automated snapshot intervals).
- **Recovery Time Objective (RTO)**: < 15 minutes (Automated database restore with SHA-256 checksum manifest verification).
