# Architecture.md — Ethara Seat Allocation & Project Mapping System

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (Vite) + Tailwind v4 | Not Next.js — spec allowed either |
| Backend | FastAPI + SQLAlchemy | Python 3.12 dev, 3.14-compatible pins |
| DB (prod) | PostgreSQL on Railway | via `pg8000` (pure-Python driver) |
| DB (local/demo) | SQLite | `sqlite:///./ethara_seats.db`, gitignored |
| Auth | JWT (python-jose) + bcrypt | `bcrypt` called directly, not via `passlib` |
| Frontend host | Vercel | static Vite build |
| Backend host | Railway | `uvicorn`, `$PORT` injected |
| AI assistant | Rule-based regex intent parser | no external LLM key needed |

## 2. Backend Structure

```
backend/app/
  main.py            FastAPI app, CORS, router registration, /seed (admin-only)
  database.py        Engine/session; auto-converts postgres:// -> postgresql+pg8000://
  models.py           SQLAlchemy: User, Employee, Project, Seat, SeatAllocation
  schemas.py          Pydantic request/response models
  auth.py              hash/verify password, JWT create/decode, require_roles()
  seed.py              Deterministic seed generator (random.seed(42))
  routers/
    auth.py            /auth/login, /me, /password, /users (admin-only)
    employees.py        CRUD + search/filter
    projects.py          CRUD + list-by-project
    seats.py              CRUD, /available, /allocate, /release
    dashboard.py           /summary, /project-utilization, /floor-utilization
    ai.py                   /query
```

### Data model

```
projects (1) ──< employees (many)
employees (1) ──< seat_allocations (many)
seats (1) ──< seat_allocations (many)
employees (1) ──< users (0..1)   [optional login link]
```

Full DDL: see `SCHEMA.md` (generated directly from the models, not
hand-written).

### Auth flow

1. `POST /auth/login` (form-encoded `username`/`password`) → JWT with
   `sub` (username) and `role` claims, 8h expiry.
2. Every other endpoint depends on `get_current_user` (decodes + looks
   up the user) at minimum.
3. Write endpoints additionally depend on `require_roles(...)`, which
   403s if the caller's role isn't in the allowed set.
4. Frontend stores the token in `localStorage`, attaches
   `Authorization: Bearer <token>` on every request via a shared
   `request()` wrapper in `api.js`.

### Seat allocation logic

`POST /seats/allocate` with just `employee_id`:
1. If `preferred_zone` given, try there first.
2. Else, find the zone with the most active allocations for teammates
   on the same project (`_find_best_zone_for_project`).
3. Fall back to any available seat.
4. 409 if nothing is free anywhere.

Enforced in application code, not a DB constraint, because "one active
row per employee" needs a partial/filtered uniqueness check that isn't
portable across SQLite and Postgres.

### Department / project / seating structure

- 5 departments, fixed headcounts: R&D (25), Growth (100), Technical
  (1,500), STEM (2,000), Non-STEM (remainder, ~1,375).
- 19 projects grouped under those departments (R&D: 1, Growth: 1,
  Technical: 8, STEM: 3 — Skyforge/Fenrir weighted highest, Non-STEM: 6,
  named after Ethara's real RLHF/evaluation service lines).
- 5 floors × 10 zones × 110 seats = 5,500 seats.
- **Floor 1 is the dedicated leadership floor**: Zone-A = R&D's own
  area, Zone-B = Growth's own area (both open-plan, not cabins), 30
  individual cabins for a promoted pool of Technical/STEM/Non-STEM staff
  (given Manager/Senior Manager/CEO/CFO/CTO titles — their real
  department/project is untouched), 15 meeting-room seats, 25
  waiting-area seats. Room type is encoded via the `bay` field
  (`"Cabin"`, `"Meeting Room"`, etc.) — seat numbering always stays
  sequential per zone; it's never repurposed (see Rules.md).
- Floors 2–5 hold the individual-contributor population against fixed
  occupied targets (1053/888/969/730); the shortfall becomes
  `pending_allocation`.

## 3. Frontend Structure

```
frontend/src/
  App.jsx                Route table; everything but Landing/Login is behind ProtectedRoute
  api.js                  Fetch wrapper; auto-detects backend URL if VITE_API_URL unset
  auth/
    AuthContext.jsx        Token + user state, login()/logout()
    ProtectedRoute.jsx      Redirects to /login if unauthenticated
  components/
    Sidebar.jsx             Nav + user info + settings/logout
  pages/
    Landing.jsx             Public marketing page, real stats from the API
    Login.jsx                Split-panel auth page (see Design.md)
    Dashboard.jsx             KPIs, charts, stacked floor bars
    Employees.jsx              Search/filter/allocate/release (role-gated)
    Members.jsx                 Read-only team directory
    Seats.jsx                    Floor-map grid + cross-floor status filter
    Assistant.jsx                 Chat UI over /ai/query
    Settings.jsx                   Profile + change password
```

### Routing / access model

- `/` (Landing) and `/login` are public.
- Every other route is wrapped in `<ProtectedRoute>`, which redirects to
  `/login` (preserving the intended destination) if there's no valid
  session.
- Role-based UI gating happens per-page (e.g. `Employees.jsx` hides
  Allocate/Release behind `CAN_WRITE_ROLES.includes(user.role)`), always
  backed by the same rule enforced server-side — the UI hint is a
  convenience, not the actual security boundary.

## 4. Deployment Topology

```
Browser
  │
  ├──> Vercel (frontend, static build)
  │      VITE_API_URL (or runtime hostname-based fallback) -> Railway URL
  │
  └──> Railway (backend, uvicorn)
         DATABASE_URL -> Railway Postgres (via pg8000)
         JWT_SECRET_KEY -> must be set for real (dev fallback is public in the code)
         CORS_ORIGINS -> comma-separated list, defaults include the known Vercel URL
```

See `DEPLOYMENT_NOTES.md` for the two real issues hit getting this
wired up (stale `.env`, SQLite-vs-Postgres ambiguity) and how they were
resolved.