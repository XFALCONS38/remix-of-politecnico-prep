

# PolitoSim MVP — Full Implementation Plan

Complete backend + auth + payments + simulation engine for the TIL-I Engineering exam simulator.

---

## Step 1: Enable Lovable Cloud & Stripe
- Provision Supabase (database, auth, edge functions)
- Connect Stripe for payment processing

## Step 2: Database Schema (SQL Migrations)

### Enums
- `app_role` (admin, user)
- `difficulty_level` (easy, medium, hard)
- `attempt_status` (in_progress, completed, auto_submitted)
- `subscription_status` (active, expired, cancelled)

### Tables

**profiles** — auto-created on signup via trigger
- id (UUID, PK, FK→auth.users), email, display_name, access_expiry (timestamptz nullable), created_at

**user_roles** — separate table for security
- id (UUID PK), user_id (FK→auth.users CASCADE), role (app_role), unique(user_id, role)

**exam_types** — stores TIL-I config
- id, name, scoring_rules (jsonb with sections/timers/thresholds), is_free_tier, created_at
- Seeded with TIL-I Engineering: 42 questions, 90 min, 4 sections with strict timers

**questions** — exact structure requested
- id (UUID PK), section (text: "math", "logic", "physics", "tech"), question_text, image_url (nullable), options (jsonb — array of 5 strings), correct_option_index (integer 0-4), explanation (text — paid feature), difficulty (text: easy/medium/hard)

**attempts**
- id, user_id (FK CASCADE), exam_type_id (FK), current_section (int 1-4), started_at, submitted_at, score, section_scores (jsonb), status (attempt_status), is_free_attempt (bool), created_at

**answers**
- id, attempt_id (FK CASCADE), question_id (FK), selected_option_index (integer nullable), is_correct (boolean nullable), time_spent_seconds (int), created_at, unique(attempt_id, question_id)

**subscriptions**
- id, user_id (FK CASCADE), stripe_session_id (unique), amount_cents, currency, access_start, access_expiry, status (subscription_status), created_at

### Security View
- **questions_public** — excludes `correct_option_index` and `explanation`, with `security_invoker=on`

### Helper Functions (Security Definer)
- `has_role(user_id, role)` — role check without RLS recursion
- `has_active_access(user_id)` — checks profiles.access_expiry > now()
- Trigger: auth.users insert → auto-create profiles row

### Indexes
- attempts(user_id), answers(attempt_id), questions(section), subscriptions(user_id), subscriptions(stripe_session_id), user_roles(user_id)

### RLS Policies
- **profiles**: users read/update own only
- **user_roles**: admin-only via has_role()
- **questions**: readable if user has in-progress free attempt OR active paid access; admin can write
- **attempts**: users see own; update only in-progress; no delete
- **answers**: users see own attempt answers; insert/update for in-progress only
- **subscriptions**: users read own; writes only via edge functions

### Seed Data
- 1 exam_type: TIL-I Engineering with full scoring_rules JSON (sections, timers, thresholds)
- 42 sample questions: 16 math, 10 logic, 10 physics, 6 tech — each with 5 options, correct index, explanation, difficulty

---

## Step 3: Authentication & Access Control

### Auth Provider
- `AuthProvider` with `onAuthStateChange` → exposes user, session, loading, `hasActiveAccess`, `hasFreeAttemptAvailable`

### Auth Pages
- **/login** — email/password form, Zod validation, link to register
- **/register** — email/password signup, link to login

### Route Guards
- `ProtectedRoute` — unauthenticated → `/login`
- `PaidRoute` — no active access → `/pricing`
- `/simulation` — allows through if free attempt not yet used

---

## Step 4: Stripe Payment (€19 / 60 Days)

### Edge Function: `create-checkout`
- Creates one-time €19 Stripe Checkout Session
- `client_reference_id` = user UUID, returns checkout URL

### Edge Function: `stripe-webhook`
- Verifies Stripe signature
- On `checkout.session.completed`: inserts subscription, updates profiles.access_expiry = now() + 60 days

### Pricing Page
- €19 card with feature list, "Unlock Full Access" button → Stripe checkout

---

## Step 5: Simulation Engine — Section-Based with Kill Switch

### Starting a Simulation
- Creates attempt row (status: in_progress, current_section: 1)
- Loads questions per section from `questions_public` view

### Section Timer Kill Switch
- 4 sequential sections with independent timers (36/20/22/12 mins)
- Timer computed from server-side `started_at` (refresh-safe)
- When section timer expires → auto-save blanks → lock section → force-advance to next
- User can advance early with confirmation
- **No going back** to previous sections
- Visual warnings: yellow at 5 min, red at 2 min, pulsing at 30 sec

### Real-Time Answer Saving
- Every selection upserts to `answers` table immediately
- Tracks time_spent_seconds per question
- Optimistic UI with React Query mutations

### Within a Section
- Free navigation between questions in current section
- Question nav sidebar: answered/unanswered/flagged status
- Flag for review toggle

---

## Step 6: Scoring (Edge Function: `score-attempt`)

- Server-side only (anti-cheat)
- Scoring: correct = +1.0 | wrong = -0.25 | blank = 0.0
- Max: 42.0 | Min: -10.5
- Computes total + per-section scores
- Updates attempt record with score, section_scores, status=completed

---

## Step 7: Results Page — The "Guarantee" Calculator

### Score Display
- **Score ≥ 60** → Large GREEN badge: **"GUARANTEED ADMISSION"** — "You are safe. Prepare your documents."
- **Score ≥ 50** → Large YELLOW badge: **"LIKELY ADMISSION"** — "You are on the edge. Practice Physics to secure your spot."
- **Score < 50** → Large RED badge: **"AT RISK"** — "You need +X points to be safe. Unlock the detailed solutions now."

### Email Gate (Free Attempts)
- After scoring anonymous free attempt → popup: "Enter your email to see your results"
- Converts anonymous session to real account

### Free vs Paid Results
- **Free**: Shows score, status badge, per-section bars, correct/incorrect markers — **explanation field is BLURRED** with lock overlay
- **Paid**: Full explanations revealed, time analysis, weakness breakdown

### Paywall CTA
- Blurred explanations show "Unlock Full Solutions for €19" overlay → links to pricing

---

## Step 8: Core Pages & Navigation

### Landing Page (`/`)
- Hero: "Take a Free TIL Simulation. See if you would get in today."
- CTA: "Start Simulation"
- Auth-aware nav (Login/Register or Dashboard)

### Dashboard (`/dashboard`) — protected + paid
- Access expiry countdown, past attempts list with scores, "Start New Simulation" button

### Routing
- `/` → Landing (public)
- `/login`, `/register` → Auth pages
- `/pricing` → Payment page
- `/simulation` → Exam interface (protected, allows free attempt)
- `/results/:attemptId` → Results (protected)
- `/dashboard` → Dashboard (protected + paid)

