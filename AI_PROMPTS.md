# AI_PROMPTS.md

AI tool used: **Claude** (Anthropic), via the Claude.ai chat/agentic coding
environment with a sandboxed Linux container (bash, file read/write,
ability to run and curl-test the server directly).

## Prompt 1 – Architecture

> [Uploaded the assessment spec document — "Vibe Coding Assessment: Ethara
> Seat Allocation & Project Mapping System.md" — as the brief.] Build the
> backend for this.

Claude decided on: FastAPI + SQLAlchemy + SQLite (swappable to Postgres via
`DATABASE_URL`), one router file per resource (employees/projects/seats/
dashboard/ai), Pydantic schemas separated from ORM models.

## Prompt 2 – Database

Derived directly from the "Database Model Suggestion" section of the spec:
`employees`, `projects`, `seats`, `seat_allocations`. Added `UniqueConstraint`
on `(floor, zone, seat_number)` to enforce "no duplicate seat number on same
floor/zone", and unique constraints on employee `email` and `employee_code`
to enforce "no duplicate employee email."

## Prompt 3 – Backend APIs

Implemented every endpoint listed in section 5 of the spec (Employee,
Project, Seat, Dashboard, AI Assistant APIs) with the exact paths/methods
given.

## Prompt 4 – Seat Allocation Logic

> "New joiners should be prioritized for available seats near their project
> team. If no seats are available in the preferred zone, system should
> suggest alternate zones."

Implemented `_find_best_zone_for_project()`: queries which zone currently
holds the most active seat-allocations for teammates on the same project,
and allocates there first; falls back to `preferred_zone` param if given, and
to any available seat as a last resort. Enforces "one employee = one active
seat" by rejecting allocation if an active allocation already exists.

## Prompt 5 – AI Assistant

No LLM API key is available in this sandbox, so Claude built a **rule-based
keyword/regex intent parser** as the required fallback ("If AI API is not
available, candidate can build a fallback keyword-based assistant"),
covering all six example queries from the spec (seat lookup, project
assignment, available seats by floor, occupancy by project, "who's near me",
new-joiner allocation guidance). The code is structured so a real Claude/
OpenAI call can be dropped in on top of the same DB-lookup functions later
without rewriting the data layer.

## Prompt 6 – Frontend

Built as React + Vite + Tailwind v4 (chosen for the spec's recommended stack).
Design brief: this is an internal ops tool, not a marketing page, so the
direction was functional-but-considered rather than flashy — a warm-neutral
canvas, a deep teal-green accent (deliberately avoiding the generic
cream/terracotta and near-black/acid-green looks that AI tools default to),
Space Grotesk for headers, Inter for body, IBM Plex Mono for seat codes.
Four screens: Dashboard (KPIs + floor/project utilization), Employees
(search + allocate/release), Floor Map (the signature element — a literal
color-coded seat grid per floor/zone, since the subject is physical office
seating), and Assistant (chat UI over `/ai/query`).

### Landing page (added in a follow-up)

> [Candidate supplied a standalone HTML/CSS/JS landing page design —
> "SeatSync — Enterprise Seat & Floor Intelligence" — with a blueprint-grid
> background, HUD stat panels, and an access-badge CTA.] Wire this in as the
> real front door to the app.

Claude reviewed the design first rather than integrating it as-is, and
flagged before building:
- It's a marketing splash, not one of the spec's required screens — it sits
  in front of the existing Dashboard/Employees/Seats/Assistant app, it
  doesn't replace them.
- The supplied stats were fabricated (6,000 employees, 5,842 seats ticking
  randomly, 12 floors, "94.2% allocation accuracy," "210ms sync latency")
  and didn't match the real seed data (5,000 / 5,500 / 5 floors), which
  would read as misleading claims about real-time sync the app doesn't do.

After confirming the candidate wanted it wired in as the real landing page:
- Converted the static HTML/CSS/JS into a React component (`Landing.jsx`)
  with the CSS scoped under a `.landing-page` class and animation keyframes
  renamed (`ls-` prefix) so nothing leaks into or collides with the rest of
  the app's Tailwind theme.
- Replaced every fabricated number with a live fetch from
  `/dashboard/summary` and `/dashboard/floor-utilization`: total capacity,
  floors mapped, seat utilization %, and pending allocations are all real,
  with a count-up animation on load instead of the original's random
  fake-realtime jitter (honest motion, not a false "live sync" claim).
- Rewrote the footer ticker copy to list features that actually exist
  (auto allocation, floor-wise maps, project-based seating, search, AI
  assistant) instead of unbuilt claims like "attendance sync" and
  "role-based admin access."
- The seat-grid canvas background's color mix (occupied/available/reserved)
  is now driven by the real ratios from the API instead of arbitrary
  probabilities.
- Wired the "Enter Dashboard" button to React Router's `navigate("/dashboard")`
  instead of a dead `#dashboard` anchor, and restructured `App.jsx` so the
  landing page renders standalone (no sidebar) while `/dashboard`,
  `/employees`, `/seats`, `/assistant` share the app layout.

## Prompt 6b – Department & Project Restructure

> "some changes in ethara_seed.db like floor 1 has 980/1100, floor 2 has
> 1053/1100... total no. of projects will 18-20... highest number of
> member will be in fenrir and skyforge" (first pass), followed by:
> "department 1. research and development has 25 members / growth has 100
> / technical ~1500 / stem 2000 / non-stem remaining... in seating
> arrangement, first sort department wise..." (second pass, layering
> departments on top), then simplified further: "140 individual cabins is
> too much, maximum it can go up to 30 cabins, 1 area is fixed for r&d
> team, other for growth."

Iterated through three versions of the seating model as the candidate's
own thinking evolved, rather than guessing the end state up front:
1. Per-floor occupied targets + 19 weighted projects (Skyforge/Fenrir
   highest headcount).
2. Added 5 fixed-headcount departments (R&D 25, Growth 100, Technical
   1500, STEM 2000, Non-STEM remainder) mapped to project groups, with
   floors 1-2 as a combined "leadership" zone for R&D+Growth+promoted
   staff.
3. Consolidated to a single leadership floor per the candidate's
   correction, with only 30 cabins (not 140) for promoted staff, and
   dedicated open-plan zones (not cabins) for the R&D and Growth teams
   specifically — this is the version that shipped.

For the Non-STEM project names, Claude did a real web search on
ethara.ai's actual service lines (RLHF/data-annotation/evaluation) rather
than inventing generic names, landing on Text-to-Image Compare, Omni-ELO,
Multimodal Annotation, Rubric Design, Dialogue Evaluation, Data Labeling
Ops — all real categories of work that kind of company does.

## Prompt 6c – Clickable Dashboard Stats

> "all buttons like employees, total seats, occupied, available, reserved,
> maintenance, pending allocation must be clickable and opens releted web
> page."

Made every `StatCard` an optional `<Link>` (falls back to a plain div if
no `to` prop is given, so it doesn't force navigation everywhere). Routed
each stat to a real filtered view: Employees → `/employees`; Total seats →
`/seats`; Occupied/Available/Reserved/Maintenance → `/seats?status=X`;
Pending allocation → `/employees?status=pending_allocation`. Since a
status filter can span hundreds of seats across all 5 floors, the Floor
Map page gained a second display mode — a paginated cross-floor list —
instead of trying to force that into the existing single-zone grid.

## Prompt 7 – Testing

Claude ran the app for real inside the sandbox rather than only
eyeballing the code:
- `python -m app.seed` and verified the printed counts matched every seed
  target in the spec (5,500 seats, 5,000 employees, 500 available, 120
  reserved, ~150 pending).
- Started `uvicorn` and used `curl` against every endpoint (employees CRUD +
  search + duplicate-email/seat rejection, projects, seats + filters,
  `/dashboard/*`, `/seats/allocate` + `/release` full cycle, and `/ai/query`)
  with the exact example questions from the spec.
- Ran `npm run build` on the frontend to catch compile errors, then booted
  backend + `vite preview` together and confirmed the frontend's origin
  gets a valid CORS response (`access-control-allow-origin` header present)
  from the API, and inspected the compiled CSS to confirm the custom
  Tailwind theme tokens (brand color, status colors, fonts) actually
  generated real utility classes rather than silently falling back to
  defaults.
- After wiring in the landing page: reseeded + rebooted both servers, hit
  `/dashboard/summary` directly to confirm the exact numbers the landing
  page would render, and requested `/dashboard` through the preview server
  to confirm client-side routing (SPA fallback) serves the app instead of
  a 404.
- After adding auth: verified all 4 roles end-to-end with real `curl`
  calls — no token gets 401, employee token can read but gets 403 on
  create-employee and seat-allocate, hr token can allocate/release. Then
  repeated the core flow in an actual headless browser via Playwright:
  unauthenticated visit to `/dashboard` redirects to `/login`; logging in
  as `employee` lands on `/dashboard` with the sidebar showing the right
  role and no write buttons on the Employees page; logging in as `admin`
  shows the Allocate/Release buttons. Screenshots taken of both views
  rather than assuming the conditional rendering worked from reading the
  code.

## Prompt 8 – Debugging

Issues Claude generated incorrectly, and how they were found/fixed:

1. **Missing `email-validator` dependency** — Pydantic's `EmailStr` type
   raised `ImportError` on server start. Found via the uvicorn crash log,
   fixed by installing `email-validator` and pinning `pydantic[email]` in
   `requirements.txt`.
2. **Background server dying between shell calls** — first attempts to run
   `uvicorn &` in one command and `curl` it in a later command failed
   (`Connection refused`) because each tool invocation tears down background
   processes. Fixed by starting the server and running all curl checks
   within a single shell session.
3. **AI assistant name-extraction regex too greedy** — `"Where is employee
   Cheryl Avila seated?"` initially failed to match because the regex
   captured `"Cheryl Avila seated"` as the name (including the trailing
   verb), so the DB lookup found no employee. Fixed with a lookahead that
   stops the capture before `is/seated/sit/located` or `?`.
4. **"Which project is X assigned to?" phrasing not handled** — the original
   regex only looked for `"employee <name>"`, which this phrasing doesn't
   use. Added a second regex (`"is <name> assigned"`) as a fallback.
5. **Dead/no-op code branch** left in `dashboard.py` from an initial
   DB-dialect-dependent approach to floor utilization (`.cast()` isn't
   portable across SQLite/Postgres) — removed in favor of a simple
   per-floor `COUNT` loop that works on any backend.
6. **Tailwind v4 arbitrary grid columns** — `grid-cols-14` / `grid-cols-16`
   aren't real Tailwind utilities (default scale stops at 12); the seat
   grid silently would have fallen back to no column rule. Fixed by using
   bracket syntax (`grid-cols-[repeat(16,minmax(0,1fr))]`).
7. **Invalid `font-700` class** in the sidebar — Tailwind font-weight
   utilities are named (`font-semibold`), not numeric; fixed before it ever
   reached a build.
8. **Seat-numbering gap bug** — the seed script renamed R&D/cabin seats to
   `RD-xxx`/`CAB-xxx` when carving out the leadership floor, which pulled
   those seats out of each zone's sequential `A1-001...A1-110` numbering
   and left visible gaps (e.g. `A1-010` missing). Found because the
   candidate reported it directly from the running app. Fixed by keeping
   the original sequential seat number always and only changing the `bay`
   field to indicate room type.
9. **Project-utilization cross-join bug ("596750 seated")** — `/dashboard/
   project-utilization` joined `Employee` and `SeatAllocation` to `Project`
   independently (not to each other), so for a project with both many
   employees and many allocations, the join produced every combination of
   (employee row, allocation row) — the reported occupied-seat count was
   literally `real_allocations × employee_count` (verified: 682 × 875 =
   596,750 for Skyforge). Fixed with `func.count(...).distinct()` on the
   allocation id, matching the pattern already used correctly for the
   employee count in the same query.
10. **passlib + bcrypt incompatibility** — `passlib`'s bcrypt backend
    raises `AttributeError: module 'bcrypt' has no attribute '__about__'`
    /  `password cannot be longer than 72 bytes` against bcrypt>=4.1, a
    known unresolved upstream compatibility break. Verified by hashing a
    trivial password directly and watching it fail before wiring auth into
    the app at all. Switched to calling `bcrypt` directly (hash/checkpw)
    instead of going through `passlib`.

## Prompt 8b – Role-Based Access Control

> "Role based access is one of the main priority add these"

Added JWT auth with 4 roles (admin, hr, manager, employee) matching the
spec's named personas (Employee/HR/Admin/Project teams). Design decisions:
- A separate `User` table (username/hashed_password/role/optional
  `employee_id` link) rather than bolting credentials onto `Employee`,
  since not every employee needs a login and logins shouldn't require an
  employee record (e.g. a pure HR/admin account).
- Write endpoints (create/update/deactivate employee, create project/seat,
  allocate/release seat) require `admin` or `hr` (or `admin`-only for
  project/seat creation) via a `require_roles(...)` FastAPI dependency;
  every other endpoint just requires a valid token (`get_current_user`).
- Seed script creates one login per role with known demo credentials
  (`admin/admin123`, `hr/hr123`, `manager/manager123`,
  `employee/employee123` — the last linked to a real employee record).
- Frontend: `AuthContext` (token in `localStorage`, this being a real
  standalone app rather than a claude.ai artifact where that's
  disallowed), a `ProtectedRoute` wrapper, a `/login` page with one-click
  demo-credential buttons, and the Employees page's Allocate/Release
  buttons are replaced with a "read-only" notice for roles that don't
  have write access — mirroring the backend's 403s in the UI instead of
  just letting the button fail silently.

## Prompt 9 – Deployment

Not yet done. Documented as a next step; recommended targets from the spec
(Railway/Render) are ready to receive this app as-is once `DATABASE_URL` is
pointed at a managed Postgres instance.

## Prompt 10 – Refactoring

Kept intentionally minimal for a first working pass: one concern (CRUD,
allocation, dashboard, AI) per router file, schemas separated from models,
seed data isolated in its own script so it never runs as a side effect of
importing the app.

## What AI generated correctly

- All CRUD endpoints matching the spec's exact paths/methods on first pass.
- Seed data generator hit every numeric target in the spec exactly
  (verified by direct run, not assumed).
- Core business rules (no duplicate seat/email, one active allocation per
  employee, released seat returns to available) worked correctly on first
  functional test.

## What AI generated incorrectly

All ten issues listed under Prompt 8's Debugging section: the missing
`email-validator` dependency, two AI-assistant regex bugs, a dead code
branch in `dashboard.py`, two Tailwind CSS mistakes (invalid grid-cols
values, invalid `font-700` class), a seat-numbering gap bug introduced
while carving out the leadership floor, a query cross-join bug that
inflated one project's occupied-seat count by ~875x, and a `passlib`/
`bcrypt` version incompatibility hit while wiring up auth. None of these
were caught by "the code looks right" — each was found by actually running
something (a server boot, a curl call, the candidate using the live app)
and seeing the wrong output.

## How correctness was verified

Not just code review — every core flow was actually executed in the sandbox:
seed script run and counts checked against the spec's numeric requirements;
server booted and hit with real `curl` requests for every endpoint category
(CRUD, search, filters, duplicate-rejection, seat allocate/release full
cycle, all AI assistant example queries from the spec) with responses
inspected for correctness; frontend built with `npm run build` and served
alongside the live backend to confirm CORS and real network calls work
end-to-end, not just that the components render in isolation.
