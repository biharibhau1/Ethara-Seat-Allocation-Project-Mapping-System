# Rules.md — Guardrails for working on this project

These aren't aspirational best-practices — every rule here maps to a
real bug or incident that happened during this project's development
(see DEBUGGING_NOTES.md for the full log). Read the "why" before
assuming a rule is overcautious.

## Security

1. **Never expose a destructive action behind GET.** `/seed` was
   originally a public `GET` endpoint that dropped and regenerated
   every table. Anyone who found it (trivially — it's listed in the
   public `/docs` Swagger page) could wipe production data with one
   click, a pre-fetch, or a crawler. Destructive actions must be `POST`
   (or `DELETE`), and must require auth.
2. **Every endpoint requires `get_current_user` at minimum.** Two
   dashboard endpoints briefly lost this ("Make dashboard summary and
   floor-utilization public") while a third kept it — this
   inconsistency is exactly the kind of thing that slips through
   without a systematic check. If you touch a router, verify every
   endpoint in it still has an auth dependency before moving on.
3. **Write endpoints require the right role, not just any token.**
   Create/update/delete employee, create project/seat, allocate/release
   seat → `admin`/`hr` (or `admin`-only for project/seat creation).
   Verify with a real 403 test using a lower-privileged token — don't
   assume the dependency is wired correctly just because it compiles.
4. **Don't commit secrets or real data.** `JWT_SECRET_KEY` has a dev
   fallback baked into `auth.py` — it must be overridden by a real env
   var in any real deployment. `ethara_seats.db` (a SQLite file with
   seed data) was committed to git for a while; it's now gitignored.
5. **CORS origins must be explicit**, not `["*"]`, once real user data
   is involved. Use the `CORS_ORIGINS` env var in production.

## Data Integrity

6. **Seat numbers stay sequential, always.** A seed-script change once
   renamed cabin/R&D-area seats to `CAB-xxx`/`RD-xxx`, which pulled them
   out of each zone's `A1-001...A1-110` sequence and left visible gaps
   (reported directly by a user noticing `A1-010` missing). Room type on
   the leadership floor is encoded via the `bay` field only — never
   touch `seat_number` for that purpose.
7. **Watch for join fan-out in aggregate queries.** Joining two
   one-to-many relationships to the same parent in one query (e.g.
   `Project -> Employee` and `Project -> SeatAllocation` independently)
   produces a Cartesian product per parent row. One project's
   "occupied seats" count was inflated to `real_count × employee_count`
   (682 × 875 = 596,750) this way. Use `func.count(x.id.distinct())`,
   and sanity-check aggregate numbers against a direct count before
   trusting them.
8. **Seed data must hit its numeric targets exactly**, not
   approximately — every count in PRD.md/README.md is meant to be
   independently verifiable by re-running `python -m app.seed` and
   reading the printed summary. If a change makes a target inexact,
   that's a bug, not a rounding footnote.

## Process

9. **Verify by running things, not by reading code.** Nearly every bug
   in this project's history was caught by actually booting the server
   and hitting it (`curl`, Playwright), not by code review. "Looks
   correct" is not the same as "confirmed correct" — this applies
   doubly to auth/role checks, where a missing dependency silently
   fails open.
10. **Background processes die between separate tool-call sessions in
    this sandbox.** Start a server and run all verification against it
    within the *same* shell session, or you'll get false "connection
    refused" failures that look like app bugs but aren't.
11. **A "false alarm" is still worth investigating before reporting.**
    When something looks broken (e.g. a richer `Dashboard.jsx` than
    expected, or a failed test assertion), check whether it's an actual
    regression or a stale test/cache/assumption before alarming the
    user — but always check, never silently assume it's fine either.
12. **Don't silently revert someone else's fix while fixing something
    else.** When closing the `/seed` and dashboard-auth security gaps,
    the CORS/Postgres/seed-convenience improvements made independently
    were preserved exactly — the fix only touched the specific
    vulnerable lines.

## Design / UI

13. **Reuse the existing theme tokens** (`--color-brand`,
    `--color-available`, `--color-ink`, `--font-display`, `--font-mono`,
    etc. — see Design.md) rather than introducing new colors or fonts
    ad hoc, even when adapting a design from elsewhere (e.g. the login
    page was reskinned from TaskFlow's copper/linen palette into
    Ethara's teal/cream palette specifically to stay consistent).
14. **Tailwind v4 doesn't have every utility you'd expect** —
    `grid-cols-14`/`grid-cols-16` aren't real classes (scale stops at
    12; use bracket syntax), and font-weight utilities are named
    (`font-semibold`), not numeric (`font-700`). Check generated CSS
    output when in doubt, don't assume a class compiled.
15. **Don't port a "reference" feature without checking it's real.**
    TaskFlow's ChatPage/DMPage were localStorage-only (no backend
    persistence, never synced between users) — porting them faithfully
    would have shipped the same non-functional mock into this app. Check
    what a reference implementation actually does before reusing it.

## Copyright / IP

16. Non-STEM project names were derived from Ethara's *real* public
    service categories (checked via web search), not invented generically
    — keep this grounded if adding more.