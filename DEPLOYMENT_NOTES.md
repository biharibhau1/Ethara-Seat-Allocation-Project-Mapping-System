# Deployment Notes

## Live URLs

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://ethara-seat-allocation-project-mapp.vercel.app |
| Backend  | Railway | https://ethara-seat-allocation-project-mapping-system-production.up.railway.app |
| Repo     | GitHub  | https://github.com/biharibhau1/Ethara-Seat-Allocation-Project-Mapping-System |
| API docs | Swagger (on Railway backend) | `<backend URL>/docs` |

## Backend (Railway)

- Framework auto-detected as Python/FastAPI; start command runs
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Railway injects `$PORT`).
- **Required env vars:**
  - `DATABASE_URL` — a Postgres connection string from a Railway Postgres
    addon. Without this, the app silently falls back to
    `sqlite:///./ethara_seats.db` (see "Known Issues" below — this matters).
  - `JWT_SECRET_KEY` — a real random secret. The code falls back to a
    hardcoded dev value (`ethara-dev-secret-change-in-production`) if unset,
    which must not be used in production since it lets anyone forge tokens.
- Seed data: `python -m app.seed` needs to be run once against the
  production database (e.g. via Railway's one-off command / shell) to
  populate employees, seats, projects, and the 4 sample login users.
  Re-running it wipes and regenerates everything (`reset_db()` drops all
  tables first) — don't run it against live data you want to keep.
- CORS in `app/main.py` is locked to the specific Vercel origin
  (`allow_origins=["https://ethara-seat-allocation-project-mapp.vercel.app", "http://localhost:3000"]`)
  rather than `["*"]` — correct practice, but note the local dev origin
  listed is `:3000`, while Vite's actual default dev port is `:5173`; add
  `:5173` too if local dev CORS errors show up.

## Frontend (Vercel)

- Vite + React static build (`npm run build` → `dist/`).
- **Required env var:** `VITE_API_URL` — must be set in Vercel's Project
  Settings → Environment Variables to the Railway backend URL above.
  Vite bakes `VITE_API_URL` in at *build* time, so setting it only in a
  committed `.env` file is not enough if that file still says
  `http://localhost:8000` (see "Known Issues").

## Known Issues Found Reviewing the Deployed Repo

These were found by cloning the actual GitHub repo and reading what's
there — not by hitting the live URLs, which this environment's network
egress can't reach (see Debugging Notes, #11).

1. **`frontend/.env` is committed with `VITE_API_URL=http://localhost:8000`.**
   If Vercel's dashboard doesn't have its own `VITE_API_URL` env var
   override configured (which takes precedence over a committed `.env`
   file during Vercel's build), the deployed frontend will try to call
   `localhost:8000` from every visitor's browser and every API call will
   fail. **Action:** confirm `VITE_API_URL` is set correctly in Vercel's
   project settings, then redeploy if it wasn't.

2. **`backend/ethara_seats.db` (a SQLite file with real seed data) is
   committed to git**, and there's no `.gitignore` entry for it. If
   Railway doesn't have a Postgres addon attached with `DATABASE_URL` set,
   the app defaults to this SQLite file — and most Railway deployment
   types use an ephemeral filesystem, meaning every seat allocation made
   through the live app would be lost on the next redeploy or restart.
   **Action:** confirm `DATABASE_URL` is set to a real Postgres instance
   in Railway; if not, seat/employee data isn't actually persisting
   between deploys. Also worth adding `*.db` to a `.gitignore` and
   removing the committed file so future pushes don't ship stale seed
   data.

## Verifying the Fixes

Once both are addressed, a quick sanity check from a real browser (not
this sandbox):
1. Open the Vercel URL, open DevTools → Network tab, confirm requests go
   to the Railway URL, not `localhost`.
2. Log in as `admin` (`admin123`), allocate/release a seat, then trigger a
   Railway redeploy and confirm the change survived — proves Postgres is
   actually being used rather than ephemeral SQLite.