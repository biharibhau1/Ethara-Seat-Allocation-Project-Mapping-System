# Phases.md — Development History & Roadmap

Chronological, not aspirational — this reflects what actually happened,
in order, including the false starts. See AI_PROMPTS.md for the
prompt-by-prompt detail behind each phase.

## Completed

### Phase 1 — Backend core
FastAPI + SQLAlchemy + SQLite. Employee/Project/Seat/SeatAllocation
models, full CRUD, seat allocation with zone-proximity auto-suggest,
seed script hitting the spec's minimum numeric targets (5,000
employees, 5,500 seats, 10 projects at the time).

### Phase 2 — Frontend core
React + Vite + Tailwind v4. Dashboard, Employees, Floor Map (seat
grid), Assistant chat — each screen actually run against the live
backend and checked, not just built.

### Phase 3 — Landing page
Candidate-supplied HTML/CSS/JS design ("SeatSync") reviewed for
fabricated stats before integrating; converted to a React component
with every number wired to the real `/dashboard/summary` API instead.

### Phase 4 — Department & project restructure
Iterated three times based on evolving requirements: (1) per-floor
targets + weighted projects, (2) fixed department headcounts + a
2-floor leadership zone, (3) consolidated to one leadership floor (30
cabins, not 140) with dedicated R&D/Growth open-plan areas. Final
structure documented in Architecture.md.

### Phase 5 — Bug fixes (round 1)
Seat-numbering gaps (bay-vs-seat_number confusion) and the
project-utilization cross-join bug ("596750 seated") — both found by
the user actually using the app, both fixed and reverified.

### Phase 6 — Clickable dashboard stats
Every KPI card links to a filtered Employees/Seats view; Floor Map
gained a cross-floor paginated list mode for status filters that can
span hundreds of seats.

### Phase 7 — Auth & RBAC
JWT login, 4 roles, require_roles() dependency, 4 demo logins,
frontend AuthContext/ProtectedRoute/Login page, role-gated UI.
Verified via curl (401/403 matrix) and a real Playwright browser run
with screenshots.

### Phase 8 — Submission completeness pass
GitHub repo, live deployment (Vercel + Railway), SCHEMA.md,
DEPLOYMENT_NOTES.md, DEBUGGING_NOTES.md, screenshot set — audited
against the original assessment's submission checklist item by item.

### Phase 9 — Deployment hardening
Added pg8000 + automatic postgres:// -> postgresql+pg8000://
conversion, dynamic CORS_ORIGINS, vercel.json SPA rewrite, runtime
backend-URL auto-detection in the frontend — done independently, then
audited.

### Phase 10 — Security regression fix
Two issues found in that audit — a public unauthenticated /seed
endpoint and two dashboard endpoints that had lost their auth
requirement — fixed (admin-only POST /seed, auth restored), verified
with a 7-point curl checklist, without disturbing the Phase 9 work.

### Phase 11 — Login page redesign
Adapted the layout/interaction pattern from the user's own TaskFlow
project (AuthPage.tsx) — split panel, animated reveals, numbered
fields — reskinned to Ethara's theme, TypeScript stripped to plain
JSX, signup mode dropped (no public signup endpoint exists).

### Phase 12 — Dashboard visual consistency
Stacked 4-status floor-occupancy bars (was single-color), tone-colored
left borders on stat cards — closing the visual gap the login redesign
opened up between a polished front door and a plain admin panel.

### Phase 13 — Members & Settings
Ported from TaskFlow after checking which reference pages were
backend-real (Members, Settings) vs. localStorage mockups (Chat, DM —
not ported). New department filter, /auth/password endpoint, nested
employee info on /auth/me.

## Not Started / Deferred

- **CSV bulk import/export** for employees/seats — noted as optional in
  the original assessment spec.
- **Per-manager project scoping** — managers currently get org-wide
  read access rather than being limited to their own project's people.
- **Real chat/DM** — deliberately not built (see PRD.md, section 4);
  would need a Message model, real endpoints, and either polling or a
  websocket. Revisit only if there's an actual product reason for it.
- **CSV/PDF export** of the dashboard or directory.
- **Automated tests** — everything so far has been verified by manual
  curl/Playwright runs during development, not a checked-in test suite.
  Worth adding if this project continues to evolve.