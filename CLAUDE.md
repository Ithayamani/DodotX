# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

DodotX (internal DB/seed data still say "KidQuest" in places — same app) is a gamified task/rewards
app for families: parents assign tasks and rewards, kids complete tasks to earn points, trophies, and
streaks, and non-account "visitors" can view read-only progress via a family code. It ships as an Expo
/ React Native mobile+web app backed by a FastAPI + MongoDB API, plus AI features (task suggestions,
custom themes, auto-generated routines) proxied through Emergent's LLM integration.

Hosting: the backend and MongoDB currently run on Emergent's infrastructure
(`https://family-quest-15.preview.emergentagent.com`). That URL is a `.preview` domain and changes
whenever the Emergent project is re-forked/reopened — if it ever changes, update
`frontend/app.json` → `expo.extra.backendUrl` **and** `frontend/eas.json` →
`build.production.env.EXPO_PUBLIC_BACKEND_URL` together (see "app.json extra.backendUrl" pitfall
below for why both matter).

## Commands

### Backend (`backend/`)

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt        # emergentintegrations is NOT on public PyPI — see Gotchas
uvicorn server:app --reload --port 8001
```

Required env vars (`backend/.env`, gitignored): `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_SECRET`.
`EMERGENT_LLM_KEY` is required for the `/api/ai/*` routes to work.

Run tests (these hit a **live** backend over HTTP via `requests`, not an isolated test DB — see
Gotchas):
```bash
pytest backend/tests/                          # full suite
pytest backend/tests/test_calendar.py -v       # single file
pytest backend/tests/backend_test.py -k signup # single test by name
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001 pytest backend/tests/   # point at local server instead
```

### Frontend (`frontend/`)

```bash
yarn install
npx expo start              # dev server; press i/a/w for iOS sim / Android emulator / web
npx expo start --web --offline   # web only, skips Expo's online version-check (needed on restricted networks)
npx tsc --noEmit             # typecheck
npx eslint .                 # lint (yarn lint runs `expo lint`, same thing)
```

No frontend test runner is configured (no Jest setup).

Native builds go through EAS (`frontend/eas.json` defines `development`/`preview`/`production`
profiles):
```bash
eas build --platform android --profile preview     # installable APK
eas build --platform ios --profile production
```
Or fully local (needs Xcode/Android Studio): `npx expo prebuild && npx expo run:android` / `run:ios`.

## Architecture

### Backend: FastAPI + Motor (async MongoDB), no ORM

- `server.py` — app assembly: mounts every router under `/api`, CORS, the inline demo-account
  auto-seeder that runs on every startup (`seed_demo_accounts_inline`), and the `/api/admin/seed`
  / `/api/admin/verify-demo` endpoints (gated behind an `X-Admin-Secret` header matching `ADMIN_SECRET`
  — these are destructive/diagnostic, keep them gated).
- `routes/__init__.py` — the shared `db` (Motor client), `get_current_user` dependency (decodes the
  Bearer JWT, loads the `User` doc), and `FAMILY_CODE_EXPIRY_MINUTES`. Every route module imports `db`
  from here rather than creating its own connection.
- `models.py` — all Pydantic models (API request/response shapes). There's no separate DB-schema layer;
  Mongo documents are just `Model(...).dict()`.
- `auth.py` — password/PIN hashing (bcrypt) and JWT encode/decode. `SECRET_KEY` has no fallback — the
  process won't start without `JWT_SECRET` set, matching how `MONGO_URL`/`DB_NAME` are handled in
  `routes/__init__.py`.
- `utils.py` — ID/family-code generation (uses `secrets`, not `random` — keep it that way, these are
  security-relevant), streak/level/trophy calculation, and the `DEFAULT_TASKS`/`DEFAULT_REWARDS` seed
  data.
- Auth model: three user roles share one `users` collection — `parent` (signs up with email/password),
  `child` (created via `POST /family/join-child` with a placeholder email and empty password hash, gets
  a JWT like any other user), and unauthenticated `visitor` (read-only, hits `/api/visitor/{code}` with
  no token at all). **Every route that takes a `child_id` or `family_id`-scoped resource must verify
  `current_user.family_id` matches** — this has been the source of IDOR bugs before (see
  `routes/progress.py`, `routes/tasks.py`, `routes/children.py` for the pattern:
  `if not current_user.family_id or resource["family_id"] != current_user.family_id: raise 403`).
- The parent PIN is a *second* factor gating the parent dashboard, separate from login — it's verified
  via `POST /family/verify-pin` and is unrelated to the account password.
- AI routes (`routes/ai.py`) import `emergentintegrations.llm.chat` **inside each endpoint function**,
  not at module level — this is intentional so the rest of the app works even if that package isn't
  installed; only the AI endpoints themselves will fail.

### Frontend: Expo Router (file-based routing) + Zustand

- `app/` — routes. `(parent)/` and `(child)/` are route groups with their own tab layouts
  (`_layout.tsx`); the parentheses mean the segment doesn't appear in the URL. `(parent)/_layout.tsx`
  redirects to `/parent-pin` unless `parentUnlocked` is set in the app store — that flag is
  session-only (never persisted) and must be set via `setParentUnlocked(true)` after a successful PIN
  check, and cleared on logout, or the PIN gate is bypassable.
- `src/stores/index.ts` — two Zustand stores: `useAuthStore` (JWT + user, persisted through
  `src/utils/secureStorage.ts`) and `useAppStore` (current family/child/theme/PIN-unlock state, in
  memory only). Call `useAppStore().reset()` on logout so stale family/child state doesn't leak into
  the next session.
- `src/utils/secureStorage.ts` — wraps `expo-secure-store` with an `AsyncStorage` fallback on web
  (SecureStore has no web backing). Auth tokens must go through this, not raw `AsyncStorage`.
- `src/api/client.ts` — single Axios instance; every backend call goes through the exported
  `*API` objects here (`authAPI`, `familyAPI`, `tasksAPI`, etc.), not ad-hoc `axios`/`fetch` calls. The
  request interceptor injects the Bearer token; the response interceptor clears auth on 401 **except**
  for the endpoints listed in `CREDENTIAL_ENDPOINTS` (wrong PIN/password shouldn't nuke the whole
  session).
- Screens follow a consistent `loading` state pattern: guard on missing prerequisite data (e.g.
  `!currentChild`) with `<Redirect .../>` *before* the `if (loading)` check, not after — otherwise a
  null prerequisite leaves the screen stuck on the loading spinner forever (this was a real bug across
  four child screens).

## Gotchas

- **`app.json`'s `extra.backendUrl` is baked in at build time.** If two different processes ever add
  this key separately, JSON silently keeps the last one and the app calls the wrong backend with no
  error — this exact bug happened once. Grep for `backendUrl"` in `app.json` before editing it and make
  sure there's only one.
- **Backend integration tests hit the live deployed backend by default**, not a local/test database
  (`BASE_URL` in `backend/tests/*.py` defaults to the production `.preview` URL and uses the real
  `review@dodotx.net` / `parent@test.com` demo accounts). Don't run them against production without
  meaning to; pass `EXPO_PUBLIC_BACKEND_URL` to point at a local server instead.
- **`emergentintegrations` is not on public PyPI.** `pip install -r requirements.txt` will fail on that
  one line outside Emergent's own environment. The rest of the backend runs fine without it — only
  `/api/ai/*` needs it.
- **Root-level `*_test.py` files** (`backend_test.py`, `backend_bugfix_test.py`,
  `backend_refactoring_test.py`, `apple_review_test.py`, `focused_test.py`) are historical one-off
  verification scripts from earlier bug-fix rounds, distinct from `backend/tests/`. They're not wired
  into any test runner config.
