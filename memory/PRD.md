# KidQuest - Mobile App PRD

## Version: 2.0 (Full-Stack Mobile App)
**Platform:** Expo (iOS, Android, Web)  
**Backend:** FastAPI + MongoDB  
**Status:** In Development  
**Date:** July 2025

---

## Executive Summary

KidQuest is a family-focused gamified task management mobile application that motivates children to build positive daily habits through points, trophies, and rewards. Parents manage tasks and rewards while children interact with a fun, game-like interface. Extended family members can view progress and send encouragement.

**Mission:** Turn everyday family routines into joyful quests, giving children achievement and parents a tool that works.

---

## Technical Architecture

### Frontend (Expo)
- **Framework:** Expo SDK 52+ with React Native
- **Navigation:** React Navigation v7 (Tab + Stack navigation)
- **State Management:** Zustand + React Query
- **UI Components:** React Native + Custom components
- **Offline Support:** AsyncStorage with MongoDB sync
- **Platforms:** iOS, Android, Web (responsive)

### Backend (FastAPI)
- **Framework:** FastAPI (Python 3.11+)
- **Database:** MongoDB
- **Authentication:** JWT-based auth
- **API Prefix:** All routes under `/api`
- **File Storage:** Base64 for avatars

### Database Schema (MongoDB)
**Collections:**
1. `families` - Family data and settings
2. `users` - Parents and children accounts
3. `tasks` - Task definitions
4. `rewards` - Reward definitions
5. `progress` - Child progress tracking
6. `cheers` - Encouragement messages
7. `trophies` - Trophy unlock tracking

---

## Core Features (v1.0)

### 1. Authentication & Onboarding
- **Parent Signup:** Email/phone + password
- **Family Setup Wizard:** 4 steps (family name, theme, children, default tasks)
- **Child Invite:** Via email/mobile (no password, family code access)
- **Visitor Access:** Family code (6-char) for read-only access
- **4-digit PIN:** Parent dashboard protection

### 2. Role-Based Access
- **Parent:** Full dashboard (manage tasks, rewards, children, settings)
- **Child:** Task completion, trophy viewing, reward shop
- **Visitor:** Read-only progress view + send cheers

### 3. Child Module
- **Home Screen:** 
  - Personalized greeting
  - Total points, level, XP progress bar
  - Stats: tasks done today, streak, trophies, rewards won
  - Next reward progress
  - Trophy cabinet preview
  
- **Daily Tasks Screen:**
  - Filtered by mode (Daily/Vacation)
  - Tap to complete → confetti + points
  - Visual feedback (checkmarks, strikethrough)
  - Daily point total
  
- **Trophies Screen:**
  - 8 trophies with unlock conditions
  - Visual state (locked/unlocked)
  
- **Shop Screen:**
  - Rewards sorted by points
  - Progress bars
  - Lock/unlock states

### 4. Parent Module
- **Children Management:**
  - Add/edit/remove children
  - View stats per child
  - Avatar selection (emoji or AI-generated)
  
- **Task Manager:**
  - Create/edit/delete tasks
  - Configure: title, icon, points (1-100), category
  - Dual mode toggles: Daily / Vacation
  - Active/inactive status
  
- **Reward Manager:**
  - Create/edit/delete rewards
  - Configure: name, icon, description, point threshold
  - Auto-sort by points
  
- **Family Panel:**
  - 6-char family invite code
  - Share link generation
  - Family member list
  
- **Settings:**
  - 6 visual themes
  - Vacation mode toggle
  - Change PIN
  - Reset data (danger zone)

### 5. Visitor Module
- Join via family code
- Select child to view
- See points, level, streak
- Send pre-written cheer messages
- View cheer feed

### 6. Gamification System

**Level System:**
- 🌱 Beginner: 0-99 pts
- ⚡ Rising Star: 100-249 pts
- 🔥 Hot Streak: 250-499 pts
- 🌟 Quest Master: 500-999 pts
- 💎 Legend: 1000-1999 pts
- 🏆 Champion: 2000+ pts

**8 Trophies:**
1. First Quest 🥉 - Complete 1 task
2. On Fire 🔥 - 3-day streak
3. Week Warrior ⚡ - 7-day streak
4. Century 💫 - 100 total points
5. Star Player 🌟 - 500 total points
6. Diamond 💎 - 1000 total points
7. First Reward 🎁 - Unlock first reward
8. Perfect Day 🏆 - Complete all tasks in one day

**Streak Logic:**
- Increments daily with ≥1 task completed
- Resets to 0 if no tasks completed
- Tracked per child

### 7. Visual Themes (6 Options)
1. ⚽ Football - Grass green (#00c853)
2. 🚀 Space - Violet (#7c4dff)
3. 🌊 Ocean - Cyan (#00bcd4)
4. 🌿 Nature - Leaf green (#8bc34a)
5. 🎮 Gaming - Purple (#e040fb)
6. 🗺️ Adventure - Amber (#ff6f00)

---

## AI Integration Preparation (v1.0)

### Feature: "Ask AI to Suggest Tasks"
**Location:** Parent Task Manager screen  
**Functionality:**
- Button: "✨ Get AI Suggestions"
- Input: Child age, interests, goals
- Output: 5-10 task suggestions with icons, points, categories
- Parent can add suggestions with one tap

**Technical Implementation:**
- Endpoint: `POST /api/ai/suggest-tasks`
- Request: `{ child_age, interests[], goals, current_tasks_count }`
- LLM Provider: Use Emergent LLM Key (OpenAI/Claude/Gemini)
- Prompt engineering for age-appropriate, creative tasks
- Response format: Array of task objects

---

## Default Data

### Default Tasks (8 pre-loaded)
| Task | Icon | Points | Daily | Vacation |
|------|------|--------|-------|----------|
| Morning Routine | 🌅 | 10 | ✅ | ✅ |
| Read for 20 mins | 📚 | 15 | ✅ | - |
| Physical Activity | ⚽ | 15 | ✅ | - |
| Help with Chores | 🧹 | 10 | ✅ | - |
| No Screens Before 10AM | 📵 | 10 | ✅ | - |
| Creative Project | 🎨 | 15 | - | ✅ |
| Outdoor Adventure | 🌳 | 20 | - | ✅ |
| Healthy Meal | 🥗 | 10 | ✅ | ✅ |

### Default Rewards (5 pre-loaded)
| Reward | Icon | Points | Description |
|--------|------|--------|-------------|
| Pizza Night | 🍕 | 50 | Pick the toppings! |
| Extra Screen Time | 🎮 | 80 | 30 mins bonus gaming! |
| Movie Night | 🎬 | 120 | You pick the movie! |
| Shopping Trip | 🛍️ | 200 | Choose a small treat |
| Grand Surprise | 🏆 | 400 | Epic reward! |

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Parent registration (email/phone)
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/invite-child` - Send child invite
- `POST /api/auth/join-family` - Child joins via code

### Family
- `GET /api/family` - Get family details
- `PUT /api/family` - Update family settings
- `GET /api/family/code` - Get/regenerate family code
- `POST /api/family/verify-code` - Verify visitor code

### Children
- `POST /api/children` - Add child
- `GET /api/children` - List all children
- `GET /api/children/:id` - Get child details
- `PUT /api/children/:id` - Update child
- `DELETE /api/children/:id` - Remove child

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List all tasks
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/toggle` - Toggle task completion

### Rewards
- `POST /api/rewards` - Create reward
- `GET /api/rewards` - List all rewards
- `PUT /api/rewards/:id` - Update reward
- `DELETE /api/rewards/:id` - Delete reward

### Progress
- `GET /api/progress/:childId` - Get child progress
- `GET /api/progress/:childId/stats` - Get stats (streak, trophies)
- `GET /api/progress/:childId/history` - Task completion history

### Cheers
- `POST /api/cheers` - Send cheer message
- `GET /api/cheers/:childId` - Get cheers for child

### AI (v1.0)
- `POST /api/ai/suggest-tasks` - AI task suggestions

---

## Mobile UX Guidelines

### Navigation Architecture
- **Bottom Tab Navigation** (Child Mode):
  - Home 🏠
  - Tasks ✓
  - Trophies 🏆
  - Shop 🎁
  
- **Bottom Tab Navigation** (Parent Mode):
  - Children 👨‍👩‍👧
  - Tasks ✓
  - Rewards 🎁
  - Family 👪
  - Settings ⚙️

### Gesture Patterns
- Pull-to-refresh on all list screens
- Swipe actions for edit/delete
- Long-press for quick actions
- Bottom sheet for forms/modals

### Visual Feedback
- Confetti animation on task completion
- Toast notifications (+N pts)
- Progress bar animations
- Trophy unlock animations
- Haptic feedback on interactions

---

## Deployment Requirements

### Mobile App (iOS/Android)
- **App Store Metadata:** Screenshots, description, keywords
- **Permissions Required:**
  - Notifications (task reminders)
  - Camera (optional for child avatars)
- **Build Configuration:** 
  - iOS: app.json with bundle ID, version
  - Android: app.json with package name, permissions
- **Compliance:** 
  - COPPA compliance (children's privacy)
  - Age rating: 4+

### Web Deployment
- Progressive Web App (PWA) support
- Responsive design (320px+)
- Web preview URL

---

## Future Roadmap

### v1.1
- Edit child profiles
- Reward claiming approval flow
- Weekly progress reports
- Custom avatar upload

### v1.2
- Scheduled tasks (weekday-specific)
- Custom trophies
- Task history calendar (heatmap)
- Export progress (PDF/CSV)

### v2.0
- Push notifications (task reminders)
- Sibling leaderboard mode
- Enhanced AI features (habit analysis)
- Teacher/tutor role
- Dark mode

---

## Non-Functional Requirements

- **Performance:** App launch < 2s, API response < 500ms
- **Offline:** Core features work offline, sync on reconnect
- **Security:** JWT auth, PIN protection, encrypted storage
- **Accessibility:** WCAG 2.1 AA, min 44×44px touch targets
- **Data Privacy:** COPPA compliant, parental consent
- **Device Support:** iOS 14+, Android 8+
- **Responsive:** 320px - 1920px screen widths

---

## Tech Stack Summary

**Frontend Libraries:**
- expo-router (navigation)
- zustand (state management)
- @tanstack/react-query (server state)
- react-native-reanimated (animations)
- expo-notifications (push notifications)
- @react-native-async-storage/async-storage (offline storage)
- react-native-confetti-cannon (celebrations)
- expo-haptics (tactile feedback)

**Backend Libraries:**
- fastapi
- pymongo
- python-jose (JWT)
- passlib (password hashing)
- pydantic (validation)
- python-dotenv

**AI Integration:**
- Emergent LLM Key (OpenAI/Claude/Gemini)
- emergentintegrations library

---

## Success Metrics

- Parent setup completion: <3 minutes
- Child task completion rate: >60% daily
- App retention: >80% week 1
- Parent satisfaction: 4.5+ stars
- Zero data loss incidents
- <1% crash rate

---

## Constraints & Assumptions

- MongoDB connection required for multi-device sync
- One family per parent account
- Max 10 children per family
- Max 50 tasks per family
- Max 30 rewards per family
- Visitor access doesn't require account
- Parent PIN stored securely (hashed)
- Images stored as base64 (avatars, icons)

---

## End of PRD
