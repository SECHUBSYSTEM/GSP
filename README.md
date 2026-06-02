# GSP Workflow Prototype

A simplified **Global Students Pathway (GSP)** student application workflow system built for the StudyNow Ltd technical assessment.

**Stack:** Node.js, Express, TypeScript, MongoDB, Next.js demo UI, pnpm monorepo.

---

## Quickstart (pnpm)

```bash
# 1. Install dependencies
pnpm install

# 2. Start MongoDB
pnpm docker:up

# 3. Configure environment
cp .env.example .env
# Optional: add Cloudinary + GEMINI_API_KEY for live uploads/AI

# 4. Seed sample data
pnpm seed

# 5. Run API + demo UI
pnpm dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:4000 |
| Demo UI | http://localhost:3003 |
| Health | http://localhost:4000/health |

### Docker troubleshooting (Windows)

If `pnpm docker:up` fails with `dockerDesktopLinuxEngine` or `502 Bad Gateway`:

1. Open **Docker Desktop** and wait until the engine shows **Running** (not just the UI open)
2. Run `docker version` — you must see both **Client** and **Server** sections
3. Retry: `pnpm docker:up`
4. Confirm: `docker ps` shows `gsp-mongo` on port `27017`

If Docker remains unreliable, use [MongoDB Atlas](https://www.mongodb.com/atlas) and set `MONGODB_URI` in `.env` instead.

---

## Postman

1. Import [`postman/GSP-Workflow.postman_collection.json`](postman/GSP-Workflow.postman_collection.json)
2. Import [`postman/GSP-Local.postman_environment.json`](postman/GSP-Local.postman_environment.json) and select **GSP Local**
3. Run the **Setup** folder (creates users and stores IDs in collection variables)
4. Run **Agent flow** and **Internal workflow** folders

Every request uses the `X-User-Id` header. Create your own users with:

```bash
curl -X POST http://localhost:4000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"My QA","email":"qa@test.com","role":"qa_officer"}'
```

Use the returned `id` as `X-User-Id` on subsequent requests.

---

## Architecture decisions

### 1. Pure-function workflow kernel (`server/src/workflow/`)

Stages, transitions, rules, actions, and permissions live in **testable pure functions** with no database dependency.

**Why:** Adding a new stage tomorrow means editing config files — not route handlers. Unit tests run in milliseconds without MongoDB.

### 2. Contextual actions auto-update the pipeline

Each action in `actions.ts` declares an optional `targetStage`. When you call `POST /applications/:id/actions/drop_out`, the service atomically applies side effects **and** moves the application to `closed_lost`.

**Why:** The pipeline always reflects reality. Officers never need a separate “close” transition after an exit action.

### 3. Separate Agent vs internal serializers

Agents receive `statusLabel` (e.g. “Under Review”) — never internal stage names like `qa_review`. Internal roles receive full stage, transitions, AI assessments, and audit access.

**Why:** The agent boundary is enforced in the API layer, not hidden in the UI. Postman tests verify agents cannot trigger transitions or see internal metadata.

### 4. Basic user CRUD + header auth

`POST /users` creates users with roles. Requests pass `X-User-Id`. No JWT — appropriate for a time-boxed prototype.

**Why:** Interviewers can create users and test role restrictions without a login flow. Production would use OAuth/JWT; README documents this tradeoff.

### 5. Multi-provider AI funnel

`AI_PROVIDER=mock|gemini|openai`. All responses validated with Zod. Timeout, retry, and mock fallback. AI output is always `advisory: true` — never auto-transitions.

**Why:** Swapping providers is an env change. Demo works with zero API keys. Failures never block manual review.

### 6. Optimistic locking + idempotency

Applications have a `version` field. Concurrent updates return `409 STALE_VERSION`. Transitioning to the current stage returns `200` with `noOp: true`.

**Why:** Safe retries and realistic concurrent-officer behaviour.

### 7. Human-readable errors — demo vs production

**This prototype:** API responses include `message` and `hint` when `EXPOSE_ERROR_HINTS=true` (default), so Postman users and non-technical interviewers can self-correct.

**Production:** API would return only a stable `code`. Friendly messages and hints would be mapped in the **UI** from a client-side catalog — verbose API errors can leak workflow internals to attackers.

Toggle: `EXPOSE_ERROR_HINTS=false` in `.env` to simulate production API responses.

---

## Pipeline (7 stages)

`new_app → qa_review → app_review → decision → deposit → cas_review → enrolment`

**Terminal states:** `app_rejected`, `closed_lost`

**Business rules:**
1. All required documents (`passport`, `transcript`, `english_test`) before QA → App Review
2. Admission review note before App Review → Decision

**Contextual actions:** defer, withdraw, cancel, refund, change_course, drop_out, app_rejected — availability depends on stage + role.

---

## API reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/users` | None | Create user with role |
| GET | `/users` | Internal | List users |
| POST | `/applications` | Agent/Counsellor | Create application |
| GET | `/applications` | Any | List (scoped by role) |
| GET | `/applications/:id` | Any | Detail (agent or internal view) |
| POST | `/applications/:id/transition` | Internal | Forward stage transition |
| GET | `/applications/:id/available-transitions` | Internal | Transitions with block reasons |
| GET | `/applications/:id/available-actions` | Any | Contextual actions |
| POST | `/applications/:id/actions/:action` | Role-scoped | Contextual action (auto-updates stage) |
| POST | `/applications/:id/documents` | Agent/Counsellor/Admission | Upload document |
| POST | `/applications/:id/notes` | Any | Add note |
| GET | `/applications/:id/ai-assessment` | Internal | Latest AI assessment |
| POST | `/applications/:id/ai-assessment/refresh` | Internal | Re-run assessment |
| GET | `/applications/:id/audit-log` | Internal | Audit trail |

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | API port |
| `MONGODB_URI` | localhost | MongoDB connection |
| `EXPOSE_ERROR_HINTS` | true | Demo: show hints in API; prod: false |
| `AI_PROVIDER` | mock | mock, gemini, or openai |
| `GEMINI_API_KEY` | — | Google AI key |
| `GEMINI_MODEL` | gemini-2.0-flash | Configurable Gemini model |
| `CLOUDINARY_*` | — | Optional real file uploads |

---

## Testing

### Commands

```bash
pnpm test:unit              # Workflow unit tests (no DB required)
pnpm test:coverage          # Unit tests + workflow kernel coverage report
pnpm test:smoke             # API smoke test (requires MongoDB — run pnpm docker:up first)
pnpm test                   # Unit + smoke
```

### Latest test report

| Suite | Tests | Status | Notes |
|-------|-------|--------|-------|
| Workflow unit (`tests/workflow/workflow.test.ts`) | 11 | Pass | Rules, transitions, permissions, contextual actions |
| API smoke (`tests/api/smoke.run.ts`) | 1 flow | Requires MongoDB | Create user → app → blocked transition with hint |

**Workflow unit scenarios covered:**
- QA → App Review blocked without required documents
- QA → App Review allowed when documents complete
- App Review → Decision blocked without admission review note
- Idempotent same-stage transition check
- Agent blocked from internal transitions
- `drop_out`, `app_rejected`, `refund` action stage rules
- Agent sees only `withdraw` action
- Agent blocked from other agent's applications
- Terminal state blocks further transitions

### Coverage (workflow kernel)

Run `pnpm test:coverage`. Coverage targets `server/src/workflow/` — the core state machine:

| Module | Statements | Branches | Functions |
|--------|------------|----------|-----------|
| **All workflow files** | ~76% | ~79% | ~59% |
| `actions.ts` | ~94% | 100% | ~67% |
| `rules.ts` | ~84% | 100% | ~88% |
| `transitions.ts` | ~83% | ~67% | ~67% |
| `index.ts` | ~59% | ~68% | 60% |

Coverage is intentionally focused on the workflow kernel. Route and integration layers are covered by the API smoke test.

---

## Pre-demo checklist (for you)

- [ ] Docker running → `pnpm docker:up` → `docker ps` shows `gsp-mongo`
- [ ] `.env` configured (Cloudinary + Gemini optional; mock AI works without keys)
- [ ] `pnpm seed` (prints user IDs — use in UI or Postman)
- [ ] `pnpm dev` → API :4000, UI :3003
- [ ] Postman Setup folder passes

---

## AI tools transparency

AI tools (Cursor) were used for:

- Project scaffolding and monorepo setup
- Boilerplate route and middleware structure
- Repetitive test case generation (workflow unit tests, smoke test structure, Postman request stubs)
- Initial Zod schema drafts

Written and reviewed manually by the candidate:

- Workflow engine design and business rules
- Permission matrix and agent boundary serializers
- Idempotency and optimistic locking logic
- AI prompt content and provider factory architecture
- All test scenarios, expected outcomes, and edge case assertions

---

## What we cut (and why)

| Cut | Reason |
|-----|--------|
| JWT / OAuth | Time budget; header auth sufficient for prototype |
| Student portal | Out of scope; student is data on the application |
| Visa stages | Reduced to 7-stage pipeline per brief |
| Offer Exists entry branch | Scope |
| Real-time notifications | Not required |

---

## Adding a new stage

1. `server/src/workflow/stages.ts` — add to `PIPELINE_ORDER` and labels
2. `server/src/workflow/transitions.ts` — define allowed transitions + roles
3. `server/src/workflow/permissions.ts` — if new role permissions needed
4. `server/src/workflow/rules.ts` — attach conditional rules to transitions
5. `server/src/workflow/agentStatusMap.ts` — agent-safe label

No route changes required.

---

## License

Technical assessment submission — StudyNow Ltd.
