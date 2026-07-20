# Design.md — Design System

## Direction

Internal ops tool, not a marketing product — so the app shell
(Dashboard, Employees, Members, Floor Map, Assistant, Settings) is
deliberately restrained: data-dense, fast to scan, minimal motion,
since it's a screen people open dozens of times a day. The Landing page
and Login page are the two places that get a richer, more "designed"
treatment, since they're each seen once per session, not continuously.

## Color Tokens

Defined as CSS custom properties in `index.css` (`@theme` block), so
Tailwind v4 auto-generates matching utilities (`bg-*`, `text-*`,
`border-*`, including directional like `border-l-*`).

| Token | Hex | Use |
|---|---|---|
| `--color-canvas` | `#F7F7F4` | Page background (warm off-white, not pure white) |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-line` | `#E3E3DE` | Borders |
| `--color-ink` | `#1F2421` | Primary text, dark surfaces (login left panel) |
| `--color-muted` | `#6B7268` | Secondary text |
| `--color-brand` | `#2F5D50` | Primary actions, links, focus rings |
| `--color-brand-light` | `#E8F0EC` | Hover states, active nav |
| `--color-available` | `#3FA66B` | Available-seat status; also the login page's "alive" accent |
| `--color-occupied` | `#2F5D50` | Occupied-seat status (same as brand — occupied = "in use, on-brand") |
| `--color-reserved` | `#C9922A` | Reserved-seat status |
| `--color-maintenance` | `#B5484B` | Maintenance-seat status, error states |

Status colors are used consistently everywhere a seat status appears:
Floor Map legend, Dashboard stacked bars, stat card accents — never
reinvented per-screen.

## Typography

| Token | Font | Use |
|---|---|---|
| `--font-display` | Space Grotesk | Headers, KPI numbers, page titles |
| `--font-sans` | Inter | Body text, form inputs |
| `--font-mono` | IBM Plex Mono | Seat codes, labels, mono accents (login numbered fields) |

Login page reuses these exact tokens rather than introducing new fonts
(originally TaskFlow's reference design used Archivo Black — dropped in
favor of staying consistent with the rest of the app).

## Component Patterns

- **Cards**: `bg-surface border border-line rounded-lg`, optionally with
  a `border-l-[3px]` tone-colored accent (stat cards).
- **Status badges**: `text-xs px-2 py-0.5 rounded-full`, background/text
  pair from the status-tone map (e.g. `bg-available-bg text-available`).
- **Buttons**: primary = `bg-brand text-white`, secondary = `border
  border-line` outline, both `rounded-md`.
- **Forms**: `border border-line rounded-md px-3 py-2`, focus ring via
  `focus:ring-2 focus:ring-brand/30 focus:border-brand`.

## Landing Page ("SeatSync")

Dark blueprint-grid aesthetic, animated seat-grid canvas background
whose color mix reflects the *real* occupied/available/reserved ratio
from the API (not arbitrary), HUD-style stat panels, badge/access-card
metaphor for the CTA. Scoped under `.landing-page` with `ls-` prefixed
keyframes so nothing leaks into the rest of the app's theme.

## Login Page

Adapted from the user's TaskFlow project (`AuthPage.tsx`) — split dark
(`.auth-left`) / light (`.auth-right`) panels, animated staggered
reveals, numbered field labels (`01 Username`, `02 Password`), offset
hard-shadow submit button, feature list with real (not placeholder)
copy, stat row with real seed numbers. Reskinned from TaskFlow's
copper/linen palette to Ethara's teal/cream tokens above. Scoped under
`.auth-page` in `login.css`. Signup mode dropped entirely — no public
signup endpoint exists in this backend.

## What NOT to do

- Don't introduce new colors/fonts for a single feature — extend the
  token set in `index.css` if something is genuinely missing, then use
  the token everywhere that need recurs.
- Don't add animation to screens used repeatedly in a session
  (Dashboard, Employees, etc.) — reserve motion for Landing/Login.
- Don't assume a Tailwind utility exists — v4's default scale is
  smaller than some devs expect (see Rules.md #14).