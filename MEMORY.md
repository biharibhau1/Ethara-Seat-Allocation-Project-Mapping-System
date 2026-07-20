# Memory.md — Quick Context

Read this first if picking up this project cold. Everything here is a
fact that's been verified at some point in this project's history, not
an assumption — see DEBUGGING_NOTES.md / AI_PROMPTS.md for the
verification trail on anything that looks surprising.

## What this is

Ethara Seat Allocation & Project Mapping System — FastAPI + React,
manages seating/projects/departments for 5,000 employees, with JWT
auth and role-based access. Started from an assessment brief, grown
well past its minimum scope (see Phases.md).

## Live URLs

- GitHub: https://github.com/biharibhau1/Ethara-Seat-Allocation-Project-Mapping-System
- Frontend (Vercel): https://ethara-seat-allocation-project-mapp.vercel.app
- Backend (Railway): https://ethara-seat-allocation-project-mapping-system-production.up.railway.app
- Swagger: `<backend URL>/docs`

## Demo logins

| Username | Password | Role |
|---|---|---|
| admin | admin123 | admin |
| hr | hr123 | hr |
| manager | manager123 | manager |
| employee | employee123 | employee (linked to a real seeded employee) |

## Non-obvious facts worth knowing

- **Departments have fixed headcounts, not proportions**: R&D=25,
  Growth=100, Technical=1500, STEM=2000, Non-STEM=remainder (~1375).
- **Floor 1 is not a normal floor** — it's the leadership floor: Zone-A
  (R&D), Zone-B (Growth), 30 cabins, 15 meeting rooms, 25 waiting-area
  seats, rest spare. Floors 2–5 have fixed occupied targets
  (1053/888/969/730).
- **Skyforge and Fenrir are intentionally the largest STEM projects**
  (weighted 4:4:1 against Valor) — not a bug if their headcount looks
  disproportionate.
- **`bay` field does double duty**: normal desks use `"Bay-1"`.."Bay-11"`,
  but on Floor 1 it's repurposed to name room type (`"Cabin"`,
  `"Meeting Room"`, `"R&D Area"`, `"Growth Area"`, `"Waiting Area"`).
  `seat_number` is NEVER repurposed this way — always sequential.
- **`/seed` is `POST`, admin-only.** It drops and regenerates every
  table. It was briefly a public unauthenticated `GET` endpoint — that
  was a real incident, not a hypothetical. Don't ever make it public
  again.
- **The demo `employee` login's linked record changes on every reseed**
  (random.seed(42) makes the *process* deterministic, but which
  employee ends up "first" can still shift with code changes upstream
  of employee creation) — don't hardcode assumptions about which real
  person it maps to.
- **AI assistant is regex-based, not an LLM call** — intentional, per
  spec's fallback allowance. The intent-matching functions are
  structured so a real LLM could be layered on top of the same
  DB-lookup helpers later without a rewrite.
- **Chat/DM were evaluated and deliberately not built** — the reference
  implementation (TaskFlow) was localStorage-only, not real multi-user
  chat. Don't assume "port TaskFlow's X" means it's backend-real;
  check first (Members/Settings were real, Chat/DM weren't).

## Known-fixed bugs (don't reintroduce these)

1. Missing `email-validator` dep → `pydantic[email]` pinned.
2. Seat-number gaps from renaming seats for room type → `bay` only, never `seat_number`.
3. `/dashboard/project-utilization` cross-join inflating counts →
   `func.count(x.id.distinct())`.
4. `passlib` + `bcrypt` incompatibility → call `bcrypt` directly.
5. Public `GET /seed` and de-authed dashboard endpoints → both fixed,
   see Rules.md #1–2.
6. Frontend `.env` pointing at `localhost:8000` in production → now
   gitignored + runtime fallback added in `api.js`.
7. Missing Postgres driver → `pg8000` + URL auto-conversion in `database.py`.

## Environment gotchas (specific to the sandbox used to build this)

- Background processes (uvicorn, vite preview) die between separate
  tool-call sessions — always boot + test within one shell session.
- Network egress is allowlisted; `vercel.app`/`railway.app` aren't
  reachable from that sandbox even via a real browser (Playwright hits
  the same proxy) — live-site verification had to happen by cloning the
  repo and code-reviewing instead of hitting the URLs directly.
- Google Fonts (`fonts.googleapis.com`) also isn't in that sandbox's
  allowlist — a 403 on that specific request during local testing is
  expected there and not a real app bug.

## Where things stand as of the last update

All of PRD.md's "Core Features" are shipped and verified. Deployment is
live; two security regressions found post-deploy were fixed (Rules.md
#1–2). Members and Settings pages are the most recent addition. See
Phases.md "Not Started / Deferred" for what's next if asked.