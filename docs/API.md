# 📡 Lakshya AI — REST API Reference & Integration Guide

This document provides an overview of the Lakshya AI REST API architecture, authentication headers, core endpoint groups, and interactive Swagger documentation links.

---

## 1. API Architecture & Interactive Documentation

- **Base URL**: `http://127.0.0.1:10000/api` (Development) or `/api` (Production)
- **Interactive Swagger UI**: [`http://127.0.0.1:10000/docs`](http://127.0.0.1:10000/docs)
- **ReDoc Technical Reference**: [`http://127.0.0.1:10000/redoc`](http://127.0.0.1:10000/redoc)
- **Data Serialization**: Pydantic v2 schemas with strict validation

---

## 2. Authentication & Headers

All protected endpoints require a valid JWT Bearer token:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

When a Super Admin is running in View-As simulation mode, the frontend also attaches:
```http
X-Simulation-Token: sim_<random32>
```
*(All mutating HTTP verbs `POST/PUT/PATCH/DELETE` containing this header are rejected with `403 Forbidden` across the entire application except for ending the simulation).*

---

## 3. Core API Endpoint Groups

### 3.1 Authentication & Account Management (`/api/auth`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Public | Register new candidate account (Bcrypt password hashing) |
| `POST` | `/api/auth/login` | Public | Login with email/password to receive 60-min JWT access token |
| `GET` | `/api/auth/me` | `user` | Fetch current authenticated user profile and target role |
| `POST` | `/api/auth/verify-email` | Public | Verify account with 6-digit email OTP |

### 3.2 Resume Studio & ATS Engine (`/api/resumes`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/resumes/upload` | `user` | Upload PDF resume; extracts text and evaluates ATS score |
| `GET` | `/api/resumes/` | `user` | List all uploaded resumes for the authenticated user |
| `GET` | `/api/resumes/{id}` | `user` | Retrieve detailed parsed sections and missing skill gaps |
| `POST` | `/api/resumes/rewrite` | `user` | AI STAR bullet point rewriter for experience optimization |

### 3.3 Mock Interviews & Voice Simulation (`/api/interview`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/interview/session` | `user` | Create new mock interview session with role and difficulty |
| `POST` | `/api/interview/session/{id}/turn` | `user` | Submit candidate answer turn and receive next question |
| `GET` | `/api/interview/session/{id}/feedback`| `user` | Fetch comprehensive STAR rubric feedback report |

### 3.4 Job Applications Pipeline (`/api/applications`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/applications/` | `user` | Fetch candidate applications across Kanban stages |
| `POST` | `/api/applications/` | `user` | Create new tracked job application |
| `PATCH` | `/api/applications/{id}` | `user` | Update application stage (e.g. `interviewing` → `offer`) |
| `POST` | `/api/applications/{id}/debrief`| `user` | Log post-interview reflection notes and difficulty |

### 3.5 Career Copilot Mentorship (`/api/copilot`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/copilot/chat` | `user` | Send message to AI career mentor with profile context |
| `GET` | `/api/copilot/conversations` | `user` | List past conversation threads |

### 3.6 Admin & Super Admin Governance (`/api/admin`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/admin/dashboard` | `admin` | 100% genuine SQL platform telemetry and skill trends |
| `GET` | `/api/admin/users` | `admin` | Paginated candidate directory search and status filter |
| `GET` | `/api/admin/users/{id}/360` | `admin` | Modular User 360° overview and readiness diagnostic |
| `PATCH` | `/api/admin/users/{id}` | `admin` | Suspend or activate candidate account |
| `POST` | `/api/admin/simulation/start` | `super_admin` | Launch View-As simulation mode for target user |
| `POST` | `/api/admin/simulation/end` | `super_admin` | End View-As simulation session |
| `GET` | `/api/admin/database/tables` | `super_admin` | List all 37 database tables with field policies |
| `GET` | `/api/admin/database/tables/{name}`| `super_admin` | Query table records with masked security columns |
| `PATCH` | `/api/admin/database/tables/{name}/{id}`| `super_admin`| Atomic field mutation with before/after diff logging |
| `DELETE`| `/api/admin/database/tables/{name}/{id}`| `super_admin`| Safe record deletion with typed confirmation |

### 3.7 Operational Health & Release Metadata
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Public | Liveness probe returning `status: ok` |
| `GET` | `/api/health/ready` | Public | Readiness probe validating PostgreSQL, vector DB & cache |
| `GET` | `/api/release` | Public | Semantic version `1.0.0` and build commit metadata |
