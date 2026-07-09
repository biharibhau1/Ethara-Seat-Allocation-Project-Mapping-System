# Ethara Seat Allocation & Project Mapping System

Full-stack app for managing seat allocation across ~5,000 employees: employee management, project mapping, seat allocation/release, new-joiner allocation, search, a stats dashboard, and a natural-language AI assistant.[file:1]

---

## Live URLs

- **Frontend (Vercel):** `https://ethara-seat-allocation-project-mapp.vercel.app/`[web:19]  
- **Backend (Railway):** `https://ethara-seat-allocation-project-mapping-system-production.up.railway.app`[web:24]  
- **Swagger / API Docs:** `https://ethara-seat-allocation-project-mapping-system-production.up.railway.app/docs`[file:1]

---

## Stack

- **Backend:** Python, FastAPI 0.139, SQLAlchemy 2.0, Pydantic v2[file:1]  
- **Database:** SQLite for local/demo; production-ready for PostgreSQL by swapping the `DATABASE_URL` environment variable.[file:1]  
- **Frontend:** React 19 + Vite + Tailwind v4 + React Router 7[file:1]  
- **AI Assistant:** Rule-based intent parser (offline, no API key needed), designed so a real LLM call (Claude / OpenAI / Gemini) can be dropped in on top of the same intent handlers.[file:1]

---

## Project Structure

```text
backend/
  app/
    main.py            # FastAPI app + router registration + CORS
    database.py        # DB engine/session (SQLite by default, DATABASE_URL for Postgres)
    models.py          # SQLAlchemy models: Employee, Project, Seat, SeatAllocation
    schemas.py         # Pydantic request/response schemas
    seed.py            # Seed data generator (5000 employees, 5500 seats, etc.)
    routers/
      employees.py     # CRUD + search        -> /employees
      projects.py      # CRUD + list employees by project -> /projects
      seats.py         # CRUD, /available, /allocate (proximity logic), /release -> /seats
      dashboard.py     # /summary, /project-utilization, /floor-utilization -> /dashboard
      ai.py            # POST /ai/query natural-language assistant -> /ai
  requirements.txt
frontend/
  src/
    pages/             # Landing, Dashboard, Employees, Seats, Assistant
    components/        # Sidebar, StatCard
    api.js             # fetch wrapper, base URL from VITE_API_URL
AI_PROMPTS.md          # Prompt-by-prompt log of how this project was built with AI
```
[file:1]

---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m app.seed        # generates seed data into ethara_seats.db
uvicorn app.main:app --reload
```

- Visit `http://localhost:8000/docs` for interactive Swagger API docs.[file:1]  
- Visit `http://localhost:8000/health` for a liveness check.[file:1]

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173, expects backend at http://localhost:8000
```

- Set `VITE_API_URL` in `frontend/.env` if the backend runs elsewhere (e.g., the Railway URL in production).[file:1]

---

## Frontend

React + Vite + Tailwind v4. Five main screens:[file:1]

- **Landing** (`/`) — SeatSync-branded splash page with live stats (real employee/seat counts, utilization, pending allocations pulled from `/dashboard/summary`), an animated seat-grid background whose color mix reflects the occupied/available/reserved ratio, and an “Enter Dashboard” badge that routes into the app.[file:1]  
- **Dashboard** (`/dashboard`) — KPI cards, floor occupancy bars, and a project utilization table built from `/dashboard/summary`, `/dashboard/project-utilization`, and `/dashboard/floor-utilization`.[file:1]  
- **Employees** (`/employees`) — search by name/email/employee code, view detail, and allocate/release seats for employees.[file:1]  
- **Floor Map** (`/seats`) — seating grid: pick a floor + zone, see every seat color-coded by status (available/occupied/reserved/maintenance), with hover for seat number and bay.[file:1]  
- **Assistant** (`/assistant`) — chat UI against `POST /ai/query`, with example prompts and an optional email field for “my seat” / “who’s near me” questions.[file:1]

---

## API Reference

All routes are mounted with the prefixes below (see `main.py`); full interactive docs are always available at `/docs`.[file:1]

### Employees — `/employees`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/employees` | Create employee (rejects duplicate email) |
| GET  | `/employees` | List/search employees (query params, `limit`/`offset`) |
| GET  | `/employees/{employee_id}` | Get one employee |
| PUT  | `/employees/{employee_id}` | Update employee |
| DELETE | `/employees/{employee_id}` | Deactivate employee (204) |

### Projects — `/projects`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/projects` | Create project |
| GET  | `/projects` | List all projects |
| GET  | `/projects/{project_id}/employees` | List employees on a project |

### Seats — `/seats`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/seats` | Create seat (rejects duplicate seat number on same floor/zone) |
| GET  | `/seats` | List seats, filterable by `floor`, `zone`, `status` |
| GET  | `/seats/available` | List available seats, filterable by `floor`, `zone` |
| POST | `/seats/allocate` | Allocate a seat to an employee (proximity logic) |
| POST | `/seats/release` | Release an employee's active seat back to `available` |

### Dashboard — `/dashboard`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/dashboard/summary` | Total employees/seats, occupied/available/reserved counts, pending allocations |
| GET | `/dashboard/project-utilization` | Seats occupied per project |
| GET | `/dashboard/floor-utilization` | Occupancy % per floor |

### AI Assistant — `/ai`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/ai/query` | Natural-language query, see below |

### Misc

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | `{"status": "ok", "docs": "/docs"}` |
| GET | `/health` | `{"status": "healthy"}` |

---

## Seed Data

`python -m app.seed` generates data matching the assessment spec:[file:1]

- 5,000 employees across 10 projects (Indigo, Indreed, Mydreed, Preed, Serfy, Oreed, Bedegreed, Opreed, Serry, Kaary, Mered).[file:1]  
- 5 floors × 10 zones × 110 seats = 5,500 seats.[file:1]  
- 500 available seats, 120 reserved, 30 in maintenance.[file:1]  
- ~150 employees pending seat allocation (new joiners).[file:1]

---

## Seat Allocation Logic (Proximity)

`POST /seats/allocate` with just `employee_id`:[file:1]

1. Uses `preferred_zone` if passed.  
2. Otherwise finds the zone where the most active teammates on the same project already sit (`_find_best_zone_for_project` in `seats.py`) and allocates there.[file:1]  
3. Falls back to any available seat in any zone if the preferred/team zone has none free.[file:1]

The endpoint rejects the request with `400` if the employee already has an active allocation.[file:1]

---

## AI Assistant

`POST /ai/query` with `{"query": "...", "email": "optional@ethara.ai"}` handles:[file:1]

- “Where is employee X seated?” / “Where is my seat?” (with email).  
- “Which project is X assigned to?”  
- “Show available seats on Floor N.”  
- “How many seats are occupied for Project X?”.  
- “Who is sitting near me?” (with email).  
- Guidance on allocating a seat for a new joiner.[file:1]

The assistant uses a deterministic keyword/regex intent parser that works fully offline and is easy to demo without any external API dependency.[file:1] A real LLM (Claude / OpenAI) can be layered on top to handle free-form phrasing the rules miss, using the same underlying data-fetch functions (`_find_employee`, `_employee_seat_answer`, etc. in `ai.py`).[file:1]

---

## Business Rules Enforced

- One employee → one active seat allocation (enforced in `/seats/allocate`).[file:1]  
- One seat → one active employee (seat marked `occupied` on allocation).[file:1]  
- Released seats return to `available`.[file:1]  
- Duplicate employee email rejected.[file:1]  
- Duplicate seat number on same floor/zone rejected.[file:1]

---

## Assessment Mapping

This section maps assessment requirements to concrete features and endpoints.[file:1]

- **Employee Management:** `routers/employees.py` with full CRUD + search; **Employees** page (`/employees`) for HR/Admin to manage employee records.[file:1]  
- **Project Mapping:** `routers/projects.py` with project CRUD and `GET /projects/{project_id}/employees` to list employees per project; seed data distributing 5,000 employees over 10 projects.[file:1]  
- **Seat Allocation & Release:** `routers/seats.py` with allocation, release, availability, and filtered seat lists; Floor Map (`/seats`) visualizes seat states by floor/zone.[file:1]  
- **New Joiner Seat Allocation:** ~150 employees seeded with no active seats; `/dashboard/summary` exposes pending allocations, and AI assistant plus `/seats/allocate` provide guided seat assignment for new joiners.[file:1]  
- **Search & Filter:** search by name/email/code on `/employees`, plus query‑param search in `GET /employees`; filters for floor/zone/status in `GET /seats` and `GET /seats/available`.[file:1]  
- **Dashboard & Analytics:** `/dashboard/summary`, `/dashboard/project-utilization`, `/dashboard/floor-utilization` power the Dashboard page with KPIs, occupancy bars, and project utilization.[file:1]  
- **AI Assistant / Natural Language:** `POST /ai/query` and the `/assistant` page provide an NL interface to seat location, project assignment, availability, utilization, and “near me” queries.[file:1]  
- **REST APIs:** FastAPI app in `main.py` mounts routers for employees, projects, seats, dashboard, AI, and misc; Swagger docs at `/docs`.[file:1]  
- **Seed Data Generation:** `python -m app.seed` script generates full dataset for 5,000 employees and 5,500 seats with realistic status distribution and pending allocations.[file:1]  
- **Tech Stack & Deployment:** Backend on Railway, frontend on Vercel, database ready for PostgreSQL via `DATABASE_URL` configuration.[web:19][web:24][file:1]  
- **AI Usage Documentation:** `AI_PROMPTS.md` logs prompts, AI outputs, manual fixes, and validation methods used during development.[file:1]

---

## Deployment Notes

### Backend (Railway)

- **Base URL:** `https://ethara-seat-allocation-project-mapping-system-production.up.railway.app`.[web:24]  
- **Health:** `GET /health` for liveness checks.[file:1]  
- **Swagger:** `GET /docs` for API testing and documentation.[file:1]  
- **Database:** set `DATABASE_URL` to a PostgreSQL connection string in production and run `python -m app.seed` once to populate data.[file:1]

### Frontend (Vercel)

- **Base URL:** `https://ethara-seat-allocation-project-mapp.vercel.app/`.[web:19]  
- **Environment:** set `VITE_API_URL` to the Railway backend URL in Vercel project settings so all pages call the live backend.[file:1]  
- **Build:** `npm run build` as the production build command.[file:1]

---

## Debugging Notes

- Fixed cases where employees could receive multiple active seat allocations by enforcing a pre‑allocation check in `/seats/allocate`.[file:1]  
- Corrected `/seats/release` so released seats reliably transition back to `available` status.[file:1]  
- Added validations to reject duplicate employee emails and duplicate seat numbers within the same floor/zone.[file:1]  
- Resolved CORS and API base URL issues between the Vercel frontend and Railway backend by adjusting CORS in `main.py` and standardizing `VITE_API_URL`.[file:1]  
- Refined AI assistant intent parsing and error messages for email‑based queries (“Where is my seat?”, “Who is sitting near me?”) to handle missing/invalid emails gracefully.[file:1]  
- AI-generated code (as documented in `AI_PROMPTS.md`) was manually reviewed, integrated, and tested via Swagger (`/docs`), seed runs, and end‑to‑end UI flows before being committed.[file:1]

---

## Screenshots

_Add screenshots of Dashboard, Employees, Floor Map, and Assistant pages here for the assessment reviewers._

---

## Future Work

- CSV bulk upload for employee/seat data.  
- Auth / role-based access (Employee vs HR/Admin vs Project teams).  
- Enhanced AI assistant with a production LLM for more flexible natural-language queries.[file:1]
