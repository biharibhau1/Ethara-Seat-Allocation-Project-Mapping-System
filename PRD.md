# PRD.md — Ethara Seat Allocation & Project Mapping System

## 1. Objective

Give Ethara's Employees, HR, Admins, and Project/Team Managers one system
to answer, at a glance:
- Where is a given employee seated?
- Which project/department is someone on?
- Which floor/zone/seat is free right now?
- Has a new joiner been allocated a seat yet?
- What's seat utilization by project, floor, and department?
- (via the AI assistant) any of the above, asked in plain English.

Source brief: the "Vibe Coding Assessment: Ethara Seat Allocation &
Project Mapping System" document, extended significantly beyond the
assessment's minimum scope over the course of building it (see
Phases.md).

## 2. Personas

| Persona | Needs | System role |
|---|---|---|
| Employee | Find their own seat, look up colleagues, browse the directory | `employee` |
| Manager / Project Lead | Same as Employee, read-only view into team data | `manager` |
| HR | Onboard/offboard employees, allocate/release seats | `hr` |
| Admin | Everything HR can do, plus manage projects, seats, and other users | `admin` |

Roles are enforced end-to-end: 401 with no token, 403 on insufficient
role, both on the API and mirrored in the UI (write buttons hidden
instead of just failing silently).

## 3. Core Features (all shipped)

- **Employee management** — CRUD, search by name/email/code, filter by
  project/department/status.
- **Project mapping** — 19 projects grouped under 5 fixed-headcount
  departments (Research & Development, Growth, Technical, STEM,
  Non-STEM). See Architecture.md for the exact breakdown.
- **Seat allocation & release** — proximity-aware auto-suggest (prefers
  the zone where the employee's project teammates already sit), enforces
  one active seat per employee.
- **New joiner allocation** — creating an employee leaves them
  `pending_allocation` until a seat is assigned.
- **Search & filter** — employees (name/email/code/department/status),
  seats (floor/zone/status), cross-floor filtered views from dashboard
  stat cards.
- **Dashboard & analytics** — headcount/seat KPIs, stacked floor
  occupancy bars (all 4 statuses), project utilization, donut/bar
  charts, pending-allocation list.
- **AI assistant** — rule-based NL query parser (no external API key
  required): seat lookup, project assignment, available seats by floor,
  occupancy by project, "who's near me," new-joiner guidance.
- **Team directory (Members)** — browsable, searchable, department-filterable.
- **Account settings** — view profile (+ linked employee record if any),
  change password.
- **Auth** — JWT login, 4 roles, admin-only user creation.

## 4. Explicitly Out of Scope (for now)

- Real-time team chat / DMs — evaluated (see AI_PROMPTS.md) and
  deliberately not built, since a faithful port of the reference design
  was localStorage-only (not really functional multi-user chat), and
  building a real version wasn't prioritized over the assessment's
  actual requirements.
- CSV bulk import/export.
- Per-manager project scoping (managers currently get org-wide read
  access, not limited to their own project's people).
- Self-service signup (logins are admin-provisioned only, by design —
  see Rules.md on the `/seed` endpoint incident for why this matters).

## 5. Success Criteria

- Every numeric target in the seed data matches exactly (5,000
  employees, 5,500 seats, department headcounts, floor occupancy
  targets) — verified by running the seed script and reading its
  printed summary, not assumed from code.
- Every endpoint requires auth; every write endpoint enforces the
  correct role — verified with real 401/403 curl checks, not just
  code review.
- Frontend and backend deployed and reachable (Vercel + Railway +
  Postgres) — see Deployment Notes for the two real issues found and
  fixed getting there.