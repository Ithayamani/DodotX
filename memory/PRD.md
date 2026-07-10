# DodotX — Product Requirements Document (PRD)

**Version:** 3.0 (consolidated) · **Platform:** Mobile (Expo / React Native) · **Backend:** FastAPI · **DB:** MongoDB

---

## 1. Overview

DodotX is a **family gamified task-management app**. Parents create tasks and rewards for their children; children complete daily tasks to earn points, level up, unlock trophies and rewards, and build streaks. A read-only **visitor** mode lets extended family follow a child's progress and send cheers. The app supports themes, a vacation-mode task set, an AI assistant for generating tasks/routines/rewards/themes, and a **streak calendar** with milestone rewards.

### 1.1 Goals
- Motivate kids through gamification (points, levels, trophies, streaks, rewards).
- Give parents simple control over tasks, rewards, children, and family settings.
- Provide glanceable progress tracking via a calendar with daily completion status and streak milestones.
- Allow safe, low-friction child access (family code + name, no email needed) and read-only visitor access.

### 1.2 Personas / Roles
| Role | Access | Auth |
|------|--------|------|
| **Parent** | Full control: tasks, rewards, children, family settings, AI tools. Protected by a 4-digit PIN. | Email + password (JWT) |
| **Child** | Complete tasks, view Home/Tasks/Trophies/Shop/Calendar. | Family code + child name → JWT (role `child`) |
| **Visitor** | Read-only view of a family's children progress; send cheer messages. | Family code only (no login) |

---

## 2. Tech Architecture

- **Frontend:** Expo Router (file-based routing), Zustand store, Axios API client, React Native Reanimated, Confetti, AsyncStorage/SecureStore for token, theme system.
- **Backend:** FastAPI, routers mounted under `/api`, Motor (async MongoDB). JWT auth (7-day expiry), bcrypt password + PIN hashing.
- **AI:** Emergent LLM key via `emergentintegrations` (`LlmChat`, OpenAI `gpt-5.2`) for task/routine/reward/theme generation.
- **Email:** Gmail SMTP for password-reset codes.
- **Auth token:** stored in AsyncStorage; axios attaches `Authorization: Bearer`. Interceptor clears the token only on genuine 401s (NOT for credential/PIN/code endpoints).

### 2.1 Rate limiting (auth)
- **Login:** per-account (email) — 10 attempts / 60s → 429 (avoids shared-proxy lockout).
- **Signup:** per-IP — 30 / 60s (generous).
- **Forgot-password:** per-account — 5 / 5min.

---

## 3. Data Models (fields)

### Family
`id`, `name`, `code` (6-char invite code), `code_generated_at` (None = never expires, e.g. demo), `pin` (hashed 4-digit), `theme` (enum), `custom_theme` (optional), `vacation_mode` (bool), `vacation_start_date` (YYYY-MM-DD), `vacation_end_date` (YYYY-MM-DD), `parent_id`, `parent_profile_picture` (base64), `created_at`.

### User
`id`, `email`, `hashed_password`, `name`, `role` (`parent`|`child`|`visitor`), `family_id`, `created_at`.

### Child
`id`, `name`, `avatar` (emoji or base64), `age` (optional int), `profile_picture` (optional base64), `family_id`, `created_at`.

### Task
`id`, `title`, `icon` (emoji), `pts` (1–100), `cat` (TaskCategory), `modes` {`daily`:bool, `vacation`:bool}, `active` (bool), `family_id`, `created_at`.
- **TaskCategory enum:** `learning`, `active`, `creative`, `chores`, `health`, `social`.
- **Create validation:** `title` (min 1), `pts` (1–100), `cat` **required**; `icon`, `modes`, `active` optional.

### Reward
`id`, `name`, `icon` (emoji), `pts` (≥1), `desc`, `family_id`, `created_at`.

### Progress (per child)
`child_id`, `points`, `total_tasks`, `streak`, `last_date`, `perfect_days`, `completions` {`YYYY-MM-DD`: [task_id,…]}, `redeemed_rewards` [reward_id], `streak_milestones` [int], `updated_at`.

### CheerMessage
`id`, `child_id`, `sender_name`, `message`, `created_at`.

### CustomTheme
`name`, `primary`, `background`, `card`, `text`, `accent`.

---

## 4. Gamification Rules

### 4.1 Levels (by total points)
🌱 Beginner (0–99) · ⚡ Rising Star (100–249) · 🔥 Hot Streak (250–499) · 🌟 Quest Master (500–999) · 💎 Legend (1000–1999) · 🏆 Champion (2000+).

### 4.2 Trophies (auto-earned)
🥉 First Quest! (1 task) · 🔥 On Fire! (3-day streak) · ⚡ Week Warrior (7-day streak) · 💫 Century! (100 pts) · 🌟 Star Player (500 pts) · 💎 Diamond (1000 pts) · 🎁 First Reward! (redeem 1) · 🏆 Perfect Day! (all tasks in a day).

### 4.3 Streak definition (unified everywhere)
A day is **complete** when ALL applicable tasks were done that day (vacation-mode tasks on vacation days, daily-mode tasks otherwise; measured by intersection of completed task IDs with the applicable task set). **Streak** = consecutive complete days ending today or yesterday; resets on a miss. Same value shown on Home, parent child cards, trophies, and the calendar.

### 4.4 Streak milestone rewards (badge + auto-unlocked special reward)
| Days | Badge | Special reward |
|------|-------|----------------|
| 7 | 🥉 Week Streak! | 🍕 Pizza night of your choice |
| 14 | 🥈 Two-Week Hero! | 🎮 1 hour of extra screen time |
| 30 | 🥇 Monthly Master! | 🎁 A special toy or book |
| 60 | 💎 Diamond Discipline! | 🎢 A fun day out |
| 100 | 👑 Legendary 100! | 🏆 Grand prize — parent's choice |
Earned milestones are persisted to `progress.streak_milestones` (based on longest streak).

---

## 5. Themes & Vacation Mode

- **Themes:** ⚽ Football, 🚀 Space, 🌊 Ocean, 🌿 Nature, 🎮 Gaming, 🗺️ Adventure. Each defines primary/background/card/text/accent colors. AI can generate a `custom_theme` from a text description.
- **Vacation mode:** a **date range** (`vacation_start_date` → `vacation_end_date`). When today is within the range, only **vacation-mode** tasks apply; otherwise **daily-mode** tasks apply. Activation is **date-aware** in the child Tasks screen and backend task toggle. The calendar visually marks the vacation range.

---

## 6. Screens & Flows (frontend routes)

### 6.1 Entry / Auth
- **Landing** (`/index`): Sign Up as Parent, Sign In as Parent, Join Your Family (visitor/child), legal links.
- **Signup** (`/auth/signup`): name, email, password (8+ chars incl. number & special char). → creates account.
- **Login** (`/auth/login`): email + password → role-select.
- **Forgot password** (`/auth/forgot-password`): request reset code via email → confirm code + new password.
- **Onboarding** (`/onboarding`): first-time parent wizard — family name, theme, add first child, seed default tasks/rewards.

### 6.2 Role selection & PIN
- **Role select** (`/role-select`): child cards + "Parent Dashboard" card.
- **Parent PIN** (`/parent-pin`): 4-digit PIN gate to enter parent area. Wrong PIN → error (403), does NOT log out. Correct PIN → parent tabs.

### 6.3 Parent area (tab layout `(parent)`)
- **Children** (`/index`): list children (avatar, name, age); add / edit (name, avatar, photo, age) / delete child; **calendar icon** per child → child-calendar; AI assistant entry.
- **Tasks** (`/tasks`): list/create/edit/delete tasks (title, icon, points, category, daily & vacation toggles); **AI Smart Assistant**: Auto-Generate Routines (age-aware), Suggest Tasks, Adjust Difficulty, Suggest Rewards.
- **Rewards** (`/rewards`): list/create/edit/delete rewards (name, icon, points, description).
- **Settings** (`/settings`): family code (share, regenerate), theme switch, vacation mode toggle + date range, parent profile picture, PIN change, legal/support links, **Delete Account** (confirm).

### 6.4 Child area (tab layout `(child)`)
- **Home** (`/index`): greeting, points, level + progress, streak, stats, trophy preview.
- **Tasks** (`/tasks`): today's tasks (daily or vacation set, date-aware); tap to complete/uncomplete → points update + confetti; "Regular Mode / Vacation Mode" indicator; perfect-day handling.
- **Trophies** (`/trophies`): all trophies with locked/unlocked states.
- **Shop** (`/shop`): rewards with progress bars toward point cost; unlock/redeem.
- **Calendar** (`/calendar`): month grid colored by daily completion (🟢 all done, 🟡 some, ⚪ none), today highlighted, vacation days marked (🏖️ + blue border) with vacation banner; streak summary (current 🔥 / best 🏆 / perfect days ✅); Streak Rewards milestones (locked/unlocked).

### 6.5 Shared / Visitor
- **Child calendar (parent view)** (`/child-calendar?childId=&childName=`): same CalendarView, opened from parent Children screen.
- **Join family** (`/join-family`): enter family code → verify → child join (name) OR visitor.
- **Visitor** (`/visitor`): enter family code → read-only children progress; vacation indicator; (cheers).

---

## 7. API Endpoints (all under `/api`)

### Auth (`/auth`)
`POST /signup` · `POST /login` · `GET /me` · `POST /forgot-password` · `POST /reset-password` · `DELETE /delete-account`

### Family (`/family`)
`POST /` (create) · `GET /` · `PUT /` (update: name, theme, custom_theme, vacation_mode + dates, pin, parent picture) · `POST /verify-pin?pin=` (403 on wrong) · `POST /verify-code` · `POST /join-child` · `POST /regenerate-code`

### Children (`/children`)
`POST /` · `GET /` · `GET /{child_id}` · `PUT /{child_id}` · `DELETE /{child_id}`

### Tasks (`/tasks`)
`POST /` · `GET /` · `PUT /{task_id}` · `DELETE /{task_id}` · `POST /{task_id}/toggle` (marks done/undone for today, updates points, streak, perfect_days, completions)

### Rewards (`/rewards`)
`POST /` · `GET /` · `PUT /{reward_id}` · `DELETE /{reward_id}`

### Progress (no sub-prefix)
`GET /progress/{child_id}` (points, level, streak, trophies, rewards status, today completions) · `GET /progress/{child_id}/calendar` (days map, current/longest streak, complete_days, daily/vacation totals, `vacation:{active,start,end}`, milestones) · `POST /cheers` · `GET /cheers/{child_id}`

### AI (`/ai`)
`POST /suggest-tasks` (age/interests/goals → task list, category-validated) · `POST /auto-routines` (age-aware, sanitized, saves up to 8) · `POST /adjust-difficulty` (analyzes tasks, suggests point tweaks) · `POST /suggest-rewards` · `POST /generate-theme` (text → custom_theme)

### Visitor (`/visitor`)
`GET /{family_code}` (read-only family + children progress)

### Admin/Health
`GET /api/health` · `GET /api/admin/seed` (force re-seed demo — **wipes data**) · `GET /api/admin/verify-demo`

---

## 8. Default Content (seeded)

- **Default tasks (8):** Morning Routine, Read for 20 mins, Physical Activity, Help with Chores, No Screens Before 10AM, Creative Project, Outdoor Adventure, Healthy Meal.
- **Default rewards (5):** Pizza Night!, Extra Screen Time, Movie Night, Shopping Trip, Grand Surprise.

---

## 9. Demo / Review Account

- **Parent:** `review@dodotx.net` / `Review123!` · **PIN:** `1234` · **Family code:** `REVIEW` (never expires) · **Children:** Emma, Liam.
- Internal test: `parent@test.com` / `Parent123!` · code `TEST01`.
- Seeded demo streak history via `seed_calendar_demo.py` (do NOT run `/api/admin/seed`, it wipes it).

---

## 10. Non-functional / Deployment Notes

- Mobile build reads backend URL from `app.json` → `extra.backendUrl` (`.env` is NOT bundled in EAS builds). Preview URLs change on fork → rebuild after any URL change.
- iOS/Android builds & TestFlight/App Store via Emergent Publish flow (Emergent manages the Expo account).
- Images stored as base64 (avatars, profile pictures).

---

## End of PRD
