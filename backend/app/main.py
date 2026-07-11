import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .auth import require_roles
from .database import Base, engine
from .routers import employees, projects, seats, dashboard, ai, auth

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ethara Seat Allocation & Project Mapping System",
    description="Manages seat allocation, project mapping, and floor utilization for ~5,000 employees.",
    version="1.0.0",
)

# Dynamically load CORS origins from environment variable if set, otherwise use defaults
cors_origins_str = os.getenv("CORS_ORIGINS")
if cors_origins_str:
    origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
else:
    origins = [
        "https://ethara-seat-allocation-project-mapp.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(seats.router)
app.include_router(dashboard.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/seed")
def trigger_seed(_admin: models.User = Depends(require_roles(models.UserRole.admin))):
    """
    Remote re-seed, for convenience when setting up a fresh deployment.

    SECURITY: this drops and regenerates every table (all employees, seats,
    allocations, and users are wiped and replaced with fresh demo data).
    It is admin-only and POST-only on purpose:
    - Admin-only, because anyone who could call this could destroy all
      production data with a single request.
    - POST, not GET, because a destructive action must never sit behind a
      plain link/GET request — GETs are expected to be safe and are
      commonly pre-fetched, crawled, or cached.
    Call with: curl -X POST <backend-url>/seed -H "Authorization: Bearer <admin-token>"
    """
    from .seed import seed
    try:
        seed()
        return {"status": "success", "message": "Database seeded successfully!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}