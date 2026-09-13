# CNC_LAB Backend

A Node.js + Express + PostgreSQL backend for **CNC_LAB — Practical Skill Verification Engine**.

This implements Phase 3 (Backend) and a first cut of Phase 4 (Real Assessment Engine) from
the project's roadmap: persistent candidates/employers, JWT auth, a real (if simplified)
CNC-turning scoring engine, skill-gap detection, targeted learning tracking, reassessment,
and an employer verification/shortlisting API — replacing the front-end prototype's
hardcoded 68 → 94 demo scores with data actually computed from submitted machining
parameters.

## Stack

- Node.js + Express
- PostgreSQL (via `pg`, plain SQL — no ORM)
- JWT auth (`jsonwebtoken`) + `bcryptjs` password hashing
- `joi` request validation
- `helmet`, `cors`, `express-rate-limit`, `morgan`

## Project structure

```text
cnc-lab-backend/
├── db/
│   ├── schema.sql        # table definitions
│   ├── seed.sql          # roles, tasks, learning modules
│   ├── migrate.js        # applies schema.sql
│   └── runSeed.js        # applies seed.sql + creates demo users (bcrypt-hashed)
├── src/
│   ├── config/db.js      # pg Pool
│   ├── controllers/      # request handlers
│   ├── middleware/       # auth, role guard, validation, error handler
│   ├── models/           # SQL queries per entity
│   ├── routes/           # Express routers
│   ├── services/
│   │   ├── scoringService.js   # the CNC assessment scoring engine
│   │   └── auditService.js
│   ├── utils/
│   ├── validation/schemas.js   # Joi schemas
│   └── app.js
├── server.js
├── package.json
└── .env.example
```

## Getting started

### 1. Prerequisites

- Node.js LTS
- A running PostgreSQL instance

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# edit .env — set DATABASE_URL and a strong JWT_SECRET
```

### 4. Create the database, then run migrations and seed data

```bash
createdb cnc_lab            # or create it however you prefer
npm run migrate             # applies db/schema.sql
npm run seed                # applies db/seed.sql + creates demo users
```

The seed script prints demo login credentials (candidate / employer / admin), all using
the password `Password123!`.

### 5. Run the server

```bash
npm run dev      # nodemon, auto-restart
# or
npm start
```

Server listens on `PORT` (default `4000`). Health check: `GET /health`.

## API overview

All endpoints are under `/api`. Authenticated endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Path             | Description                                  |
|--------|------------------|-----------------------------------------------|
| POST   | /auth/register   | Create a candidate or employer account        |
| POST   | /auth/login      | Log in, returns a JWT                         |
| GET    | /auth/me         | Current user info (auth required)             |

### Tasks

| Method | Path         | Description                        |
|--------|--------------|-------------------------------------|
| GET    | /tasks       | List machining tasks (e.g. TRN-01)  |
| GET    | /tasks/:id   | Get one task                        |

### Candidate

| Method | Path                        | Description                                   |
|--------|-----------------------------|-------------------------------------------------|
| GET    | /candidates                 | List all candidates (employer/admin only)       |
| GET    | /candidates/:id/dashboard   | Candidate profile, assessments, verification    |
| GET    | /candidates/me/assessments  | Logged-in candidate's own assessment history     |

### Assessments (the CNC workstation flow)

| Method | Path                          | Description                                                   |
|--------|-------------------------------|-----------------------------------------------------------------|
| POST   | /assessments                  | Start an INITIAL assessment for a task (candidate only)          |
| GET    | /assessments/:id              | Get an assessment + its attempts + skill gaps                    |
| POST   | /assessments/:id/attempts     | Submit machining parameters; runs the scoring engine, closes it   |
| POST   | /assessments/:id/reassess     | Start a REASSESSMENT for the same task                            |

`POST /assessments/:id/attempts` body:

```json
{
  "tool": "CNMG Roughing Insert",
  "spindleSpeedRpm": 1200,
  "feedRateMmRev": 0.25,
  "depthOfCutMm": 2.5,
  "processSequence": ["Workpiece Setup", "Rough Turning", "Finish Turning", "Measurement"],
  "cycleTimeSeconds": 42
}
```

Response includes the computed `score`, `status` (`GAPS_IDENTIFIED` / `READY_FOR_ROLE`),
a per-dimension `breakdown`, any identified `gaps`, and the `simulated` final dimension /
surface finish.

### Learning

| Method | Path              | Description                                |
|--------|-------------------|----------------------------------------------|
| GET    | /learning         | List targeted micro-learning modules          |
| POST   | /learning/complete| Mark a module complete `{ moduleId }`         |

### Employer

| Method | Path                                  | Description                                     |
|--------|----------------------------------------|--------------------------------------------------|
| GET    | /employer/candidates                   | Candidate pipeline with latest assessment          |
| GET    | /employer/candidates/:id/report        | Practical skill audit (initial vs. post-training)  |
| POST   | /employer/shortlist                    | Shortlist a candidate `{ candidateId, roleId }` — rejected unless `READY_FOR_ROLE` |
| GET    | /employer/shortlist                    | List this employer's shortlisted candidates        |

### Audit (admin only)

| Method | Path         | Description                     |
|--------|--------------|-----------------------------------|
| GET    | /audit-logs  | Recent audit trail entries        |

## The scoring engine

`src/services/scoringService.js` scores a submitted attempt out of 100 across seven
weighted dimensions: tool selection, spindle speed, feed rate, depth of cut, process
sequence correctness/completeness, dimensional accuracy (simulated final diameter vs.
task tolerance), and surface finish (estimated via the standard turning roughness
approximation `Ra ≈ f² / (32·r)`). A score ≥ 85 yields `READY_FOR_ROLE`; otherwise specific
skill gaps (e.g. `GD&T Knowledge`, `Finishing Feed Rate Tolerance`) are recorded and
surfaced to the candidate.

**Known simplification:** the front-end exposes a single tool/RPM/feed/depth control set
per cycle rather than per operation step, so the simulator applies one depth-of-cut value
for the whole turning sequence rather than separately for rough vs. finish passes. This is
noted in the code and is a reasonable next target for the assessment-engine roadmap
(per-operation parameters), not a production-validated model — as the original project
docs also caution, weights and formulas should be reviewed by qualified manufacturing
engineers before this is used for real hiring decisions.

## Notes on scope

This backend intentionally mirrors the original front-end prototype's data model
(Users, Candidates, Employers, Roles, Tasks/Assessments, AssessmentAttempts, SkillGaps,
LearningModules/Completions, VerificationRecords, Shortlists, AuditLogs) and the
documented API-shaped roadmap (Phase 3 backend, Phase 4 real assessment engine). It does
not implement Phases 5–8 (AI-assisted assessment, digital twin simulation, physical
machine integration, portable workforce credentials) — those remain future work as
described in the original project vision.
