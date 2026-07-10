# Debugging Notes

Chronological log of real bugs hit while building and deploying this
project — each one found by actually running something and observing
wrong behavior, not by code review alone.

## Backend

**1. Missing `email-validator` dependency**
Pydantic's `EmailStr` type raised `ImportError` on server start.
*Found via:* the uvicorn crash log on first boot.
*Fix:* installed `email-validator`, pinned `pydantic[email]` in `requirements.txt`.

**2. Dead/no-op code branch in `dashboard.py`**
An initial attempt at DB-dialect-portable floor utilization used
`.cast()`, which isn't portable across SQLite/Postgres, and was left
behind unused.
*Fix:* replaced with a simple per-floor `COUNT` loop that works on any backend.

**3. Seat-numbering gap bug**
The seed script renamed R&D/cabin seats to `RD-xxx`/`CAB-xxx` when
carving out the leadership floor, pulling those seats out of each zone's
sequential `A1-001...A1-110` numbering and leaving visible gaps (e.g.
`A1-010` missing from Zone-A, Floor 1).
*Found via:* reported directly by the person using the running app.
*Fix:* seats always keep their original sequential number; only the `bay`
field changes to indicate room type.

**4. `/dashboard/project-utilization` cross-join bug ("596750 seated")**
The query joined `Employee` and `SeatAllocation` to `Project`
independently (not to each other). For a project with both many
employees and many allocations, the join produced every combination of
(employee row, allocation row) — the reported occupied-seat count was
literally `real_allocations × employee_count` (verified: 682 × 875 =
596,750 for one project).
*Found via:* reported directly by the person using the running app.
*Fix:* `func.count(SeatAllocation.id.distinct())`, matching the pattern
already used correctly for the employee count in the same query.

**5. `passlib` + `bcrypt` incompatibility**
`passlib`'s bcrypt backend raises `AttributeError: module 'bcrypt' has no
attribute '__about__'` / `password cannot be longer than 72 bytes`
against bcrypt>=4.1 — a known, unresolved upstream compatibility break.
*Found via:* hashing a trivial password directly before wiring auth into
the app at all, rather than discovering it mid-integration.
*Fix:* call `bcrypt` directly (`hashpw`/`checkpw`) instead of going
through `passlib`.

## AI Assistant (regex intent parser)

**6. Name-extraction regex too greedy**
`"Where is employee Cheryl Avila seated?"` initially failed to match
because the regex captured `"Cheryl Avila seated"` as the name (including
the trailing verb), so the DB lookup found no employee.
*Fix:* lookahead that stops the capture before `is/seated/sit/located` or `?`.

**7. "Which project is X assigned to?" phrasing not handled**
The original regex only looked for `"employee <name>"`, which this
phrasing doesn't use.
*Fix:* added a second regex (`"is <name> assigned"`) as a fallback.

## Frontend

**8. Tailwind v4 arbitrary grid columns**
`grid-cols-14` / `grid-cols-16` aren't real Tailwind utilities (the
default scale stops at 12) — the seat grid would have silently fallen
back to no column rule at all.
*Fix:* bracket syntax, `grid-cols-[repeat(16,minmax(0,1fr))]`.

**9. Invalid `font-700` class**
Tailwind font-weight utilities are named (`font-semibold`), not numeric.
*Fix:* caught before it ever reached a build.

## Infrastructure / Process

**10. Background server dying between shell calls**
Early attempts to start `uvicorn &` in one command and `curl` it in a
later command failed with `Connection refused`, because each sandbox
tool invocation tears down background processes started in a prior call.
*Fix:* start the server and run all verification curls within a single
shell session.

**11. Sandbox network egress vs. live deployment**
When trying to verify the deployed Vercel/Railway URLs from the sandbox
used to build this project, both `curl` and a headless browser returned
`403 Host not in allowlist` — the sandbox's own network egress is
allowlisted to a fixed set of domains, and `vercel.app`/`railway.app`
aren't on it. This means the deployed app's correctness had to be
verified by cloning the actual GitHub repo and reviewing what was pushed,
rather than by hitting the live URLs directly. Two real issues were found
this way — see Deployment Notes.

## What worked correctly on the first pass

- All CRUD endpoints matched the spec's exact paths/methods immediately.
- The seed data generator hit every numeric target in the spec exactly on
  the first run (verified directly, not assumed).
- Core business rules (no duplicate seat/email, one active allocation per
  employee, released seat returns to available) worked correctly on the
  first functional test.
- JWT auth + role-based access control worked correctly end-to-end on
  first test, verified via `curl` (401/403 checks for all 4 roles) and a
  real headless-browser Playwright run with screenshots.