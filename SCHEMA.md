# Database Schema

Generated directly from the SQLAlchemy models (`backend/app/models.py`) —
this is the real DDL, not hand-written documentation that could drift from
the code. SQLite dialect shown (matches local/demo `DATABASE_URL`); swap
to a Postgres DSN and SQLAlchemy emits the equivalent Postgres DDL
automatically via `Base.metadata.create_all()` on app startup.

## Entity Relationship Overview

```
projects (1) ──< employees (many)
employees (1) ──< seat_allocations (many)
seats (1) ──< seat_allocations (many)
projects (1) ──< seat_allocations (many)   [denormalized copy of employee's project at allocation time]
employees (1) ──< users (0..1)              [optional login, for the 'employee' role]
```

## Tables

### `projects`
```sql
CREATE TABLE projects (
	id INTEGER NOT NULL,
	name VARCHAR NOT NULL,
	description VARCHAR,
	manager_name VARCHAR,
	status VARCHAR,
	created_at DATETIME,
	PRIMARY KEY (id)
);
CREATE INDEX ix_projects_id ON projects (id);
CREATE UNIQUE INDEX ix_projects_name ON projects (name);
```

### `seats`
```sql
CREATE TABLE seats (
	id INTEGER NOT NULL,
	floor INTEGER NOT NULL,
	zone VARCHAR NOT NULL,
	bay VARCHAR NOT NULL,
	seat_number VARCHAR NOT NULL,
	status VARCHAR(11),               -- available | occupied | reserved | maintenance
	created_at DATETIME,
	PRIMARY KEY (id),
	CONSTRAINT uq_seat_location UNIQUE (floor, zone, seat_number)
);
CREATE INDEX ix_seats_id ON seats (id);
CREATE INDEX ix_seats_floor ON seats (floor);
CREATE INDEX ix_seats_status ON seats (status);
CREATE INDEX ix_seats_zone ON seats (zone);
```
`bay` doubles as a room-type label on the leadership floor (`"Cabin"`,
`"Meeting Room"`, `"Waiting Area"`, `"R&D Area"`, `"Growth Area"`) as well
as its normal meaning (`"Bay-1"`..`"Bay-11"`) on the other floors.

### `employees`
```sql
CREATE TABLE employees (
	id INTEGER NOT NULL,
	employee_code VARCHAR NOT NULL,
	name VARCHAR NOT NULL,
	email VARCHAR NOT NULL,
	department VARCHAR,                -- Research & Development | Growth | Technical | STEM | Non-STEM
	role VARCHAR,
	joining_date DATE,
	status VARCHAR(18),                 -- active | inactive | pending_allocation
	project_id INTEGER,
	created_at DATETIME,
	updated_at DATETIME,
	PRIMARY KEY (id),
	FOREIGN KEY(project_id) REFERENCES projects (id)
);
CREATE UNIQUE INDEX ix_employees_email ON employees (email);
CREATE INDEX ix_employees_id ON employees (id);
CREATE UNIQUE INDEX ix_employees_employee_code ON employees (employee_code);
```

### `seat_allocations`
```sql
CREATE TABLE seat_allocations (
	id INTEGER NOT NULL,
	employee_id INTEGER NOT NULL,
	seat_id INTEGER NOT NULL,
	project_id INTEGER,
	allocation_status VARCHAR(8),        -- active | released
	allocation_date DATETIME,
	released_date DATETIME,
	PRIMARY KEY (id),
	FOREIGN KEY(employee_id) REFERENCES employees (id),
	FOREIGN KEY(seat_id) REFERENCES seats (id),
	FOREIGN KEY(project_id) REFERENCES projects (id)
);
CREATE INDEX ix_seat_allocations_allocation_status ON seat_allocations (allocation_status);
CREATE INDEX ix_seat_allocations_id ON seat_allocations (id);
```
History-preserving: releasing a seat sets `allocation_status = released`
and stamps `released_date` rather than deleting the row, so past
allocations stay queryable.

### `users` (authentication)
```sql
CREATE TABLE users (
	id INTEGER NOT NULL,
	username VARCHAR NOT NULL,
	hashed_password VARCHAR NOT NULL,   -- bcrypt
	role VARCHAR(8) NOT NULL,            -- admin | hr | manager | employee
	employee_id INTEGER,                  -- optional link, used by the 'employee' role
	created_at DATETIME,
	PRIMARY KEY (id),
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);
CREATE INDEX ix_users_id ON users (id);
CREATE UNIQUE INDEX ix_users_username ON users (username);
```

## Business Rules Enforced at the DB Layer

- `uq_seat_location` — no duplicate seat number on the same floor+zone
- `ix_employees_email` (unique) — no duplicate employee email
- `ix_employees_employee_code` (unique) — no duplicate employee code
- `ix_users_username` (unique) — no duplicate login username
- One-active-seat-per-employee and one-active-employee-per-seat are
  enforced in application logic (`/seats/allocate`), not a DB constraint,
  since "one active row per employee" needs a partial/filtered uniqueness
  check that varies by dialect (Postgres supports partial unique indexes;
  SQLite doesn't cleanly) — kept in Python so the same logic works
  identically on both.

## Regenerating this file

```bash
cd backend
python3 -c "
from sqlalchemy.schema import CreateTable, CreateIndex
from app.database import engine
from app import models
for table in models.Base.metadata.sorted_tables:
    print(str(CreateTable(table).compile(engine)) + ';')
    for idx in table.indexes:
        print(str(CreateIndex(idx).compile(engine)) + ';')
"
```