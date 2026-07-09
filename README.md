# Ethara Seat Allocation & Project Mapping System

Full-stack app for managing seat allocation across ~5,000 employees: employee
management, project mapping, seat allocation/release, new-joiner allocation,
search, a stats dashboard, and a natural-language AI assistant.

## Stack

- **Backend:** Python, FastAPI 0.139, SQLAlchemy 2.0, Pydantic v2
- **Database:** SQLite for local/demo (swap `DATABASE_URL` env var for Postgres in prod)
- **Frontend:** React 19 + Vite + Tailwind v4 + React Router 7
- **AI Assistant:** Rule-based intent parser (offline, no API key needed). Designed
  so a real LLM call can be dropped in on top of the same intent handlers.

## Project Structure

```
backend/
  app/
    main.py            # FastAPI app + router registration + CORS
    database.py         # DB engine/session (SQLite by default, DATABASE_URL for Postgres)
    models.py            # SQLAlchemy models: Employee, Project, Seat, SeatAllocation
    schemas.py            # Pydantic request/response schemas
    seed.py                # Seed data generator (5000 employees, 5500 seats, etc.)
    routers/
      employees.py         # CRUD + search        -> /employees
      projects.py            # CRUD + list employees by project -> /projects
      seats.py                 # CRUD, /available, /allocate (proximity logic), /release -> /seats
      dashboard.py                # /summary, /project-utilization, /floor-utilization -> /dashboard
      ai.py                          # POST /ai/query natural-language assistant -> /ai
  requirements.txt
frontend/
  src/
    pages/            # Landing, Dashboard, Employees, Seats, Assistant
    components/       # Sidebar, StatCard
    api.js            # fetch wrapper, base URL from VITE_API_URL
AI_PROMPTS.md         # Prompt-by-prompt log of how this project was built with AI
```

## Running locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m app.seed        # generates seed data into ethara_seats.db
uvicorn app.main:app --reload
```
Visit `http://localhost:8000/docs` for interactive Swagger API docs, or
`http://localhost:8000/health` for a liveness check.

**Frontend:**
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173, expects backend at http://localhost:8000
```
Set `VITE_API_URL` in `frontend/.env` if the backend runs elsewhere.

## Frontend

React + Vite + Tailwind v4. Five screens:
- **Landing** (`/`) — SeatSync-branded splash page with live stats (real
  employee/seat counts, utilization, pending allocations pulled from
  `/dashboard/summary`), an animated seat-grid background whose color mix
  reflects the real occupied/available/reserved ratio, and an "Enter
  Dashboard" badge that routes into the app.
- **Dashboard** (`/dashboard`) — KPI cards, floor occupancy bars, project utilization table
- **Employees** (`/employees`) — search by name/email/code, view detail, allocate/release seat
- **Floor Map** (`/seats`) — the actual seating grid: pick a floor + zone, see every seat
  color-coded by status (available/occupied/reserved/maintenance), hover for
  seat number and bay
- **Assistant** (`/assistant`) — chat UI against `POST /ai/query`, with example prompts and
  an optional email field for "my seat" / "who's near me" questions

## API Reference

All routes are mounted with the prefixes below (see `main.py`); full interactive
docs are always available at `/docs`.

### Employees — `/employees`
| Method | Path | Description |
|---|---|---|
| POST | `/employees` | Create employee (rejects duplicate email) |
| GET | `/employees` | List/search employees (query params, `limit`/`offset`) |
| GET | `/employees/{employee_id}` | Get one employee |
| PUT | `/employees/{employee_id}` | Update employee |
| DELETE | `/employees/{employee_id}` | Deactivate employee (204) |

### Projects — `/projects`
| Method | Path | Description |
|---|---|---|
| POST | `/projects` | Create project |
| GET | `/projects` | List all projects |
| GET | `/projects/{project_id}/employees` | List employees on a project |

### Seats — `/seats`
| Method | Path | Description |
|---|---|---|
| POST | `/seats` | Create seat (rejects duplicate seat number on same floor/zone) |
| GET | `/seats` | List seats, filterable by `floor`, `zone`, `status` |
| GET | `/seats/available` | List available seats, filterable by `floor`, `zone` |
| POST | `/seats/allocate` | Allocate a seat to an employee (proximity logic, see below) |
| POST | `/seats/release` | Release an employee's active seat back to `available` |

### Dashboard — `/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/summary` | Total employees/seats, occupied/available/reserved counts, pending allocations |
| GET | `/dashboard/project-utilization` | Seats occupied per project |
| GET | `/dashboard/floor-utilization` | Occupancy % per floor |

### AI Assistant — `/ai`
| Method | Path | Description |
|---|---|---|
| POST | `/ai/query` | Natural-language query, see below |

### Misc
| Method | Path | Description |
|---|---|---|
| GET | `/` | `{"status": "ok", "docs": "/docs"}` |
| GET | `/health` | `{"status": "healthy"}` |

## Seed Data

`python -m app.seed` generates, matching the assessment spec:
- 5,000 employees across 10 projects (Indigo, Indreed, Mydreed, Preed, Serfy,
  Oreed, Bedegreed, Opreed, Serry, Kaary, Mered)
- 5 floors x 10 zones x 110 seats = 5,500 seats
- 500 available seats, 120 reserved, 30 in maintenance
- ~150 employees pending seat allocation

## Seat Allocation Logic (proximity)

`POST /seats/allocate` with just `employee_id`:
1. Uses `preferred_zone` if passed.
2. Otherwise finds the zone where the most active teammates on the same
   project already sit (`_find_best_zone_for_project` in `seats.py`), and
   allocates there.
3. Falls back to any available seat in any zone if the preferred/team zone
   has none free.

Rejects the request with `400` if the employee already has an active
allocation.

## AI Assistant

`POST /ai/query` with `{"query": "...", "email": "optional@ethara.ai"}` handles:
- "Where is employee X seated?" / "Where is my seat?" (with email)
- "Which project is X assigned to?"
- "Show available seats on Floor N"
- "How many seats are occupied for Project X?"
- "Who is sitting near me?" (with email)
- Guidance on allocating a seat for a new joiner

This is a deterministic keyword/regex intent parser — it works fully offline
and is easy to demo without any external API dependency. A real LLM (Claude/
OpenAI) can be layered on top to handle free-form phrasing the rules miss,
using the same underlying data-fetch functions (`_find_employee`,
`_employee_seat_answer`, etc. in `ai.py`).

## Business Rules Enforced

- One employee → one active seat allocation (checked in `/seats/allocate`)
- One seat → one active employee (seat marked `occupied` on allocation)
- Released seats return to `available`
- Duplicate employee email rejected
- Duplicate seat number on same floor/zone rejected

## Development Notes

`AI_PROMPTS.md` documents, prompt by prompt, how this app was built with AI
assistance — architecture decisions, the database model, the proximity
allocation logic, the AI assistant's fallback design, the landing page
rework, testing performed, and bugs found/fixed along the way. Worth reading
before extending the codebase.

## What's not yet built (next steps)

- Deployment (Railway/Render/Vercel) + live URLs
- CSV bulk upload for employee/seat data
- Auth / role-based access (Employee vs HR/Admin)
