

# Full bundle execution plan (C, A, A)

Building everything in one PR: admin enhancements + student zone overhaul + DB migration. Acknowledging this is a large PR with regression risk — I'll keep existing exam engine, admin import/delete, and passages logic untouched.

## 1. Database migration (one shot)

```sql
-- Time tracking on exam answers
ALTER TABLE exam_attempt_answers
  ADD COLUMN time_spent_ms integer DEFAULT 0,
  ADD COLUMN first_seen_at timestamptz,
  ADD COLUMN answered_at timestamptz;

-- Practice attempts (untimed, per-question, with stopwatch shown)
CREATE TABLE practice_attempts (
  id uuid PK, user_id uuid, topic text, section text,
  question_id uuid, options_snapshot jsonb, assigned_letter text,
  student_answer text, is_correct boolean,
  time_spent_ms integer DEFAULT 0, created_at timestamptz
);
-- RLS: user reads/inserts own only.

-- Tier configuration upgrade
ALTER TABLE subscription_tiers
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN features jsonb DEFAULT '{}',
  ADD COLUMN max_sets integer,
  ADD COLUMN bonus_sets_count integer DEFAULT 0;

-- Explicit tier→set allowlist (Q2: A)
CREATE TABLE tier_set_access (
  tier_id uuid REFERENCES subscription_tiers ON DELETE CASCADE,
  set_id text NOT NULL,
  is_bonus boolean DEFAULT false,
  PRIMARY KEY (tier_id, set_id)
);
-- RLS: admin write; authenticated read.

-- Abandoned checkout capture
CREATE TABLE abandoned_checkouts (
  id uuid PK, email text, user_id uuid, tier_slug text,
  stripe_session_id text, amount_cents integer,
  created_at timestamptz, recovered_at timestamptz
);
-- RLS: admin only.

-- Pro-only Tips & Formulas
CREATE TABLE tips_articles (
  id uuid PK, slug text UNIQUE,
  title_en text, title_it text, body_en text, body_it text,
  category text, display_order int, is_published boolean,
  created_at timestamptz
);
-- RLS: admin write; only users with active Pro+ subscription read.

-- Seed default 4 tiers (free / core_3m / pro_3m / pro_6m) with slugs.
```

## 2. Edge functions

- **admin-export-questions** (new) — returns JSON in exact bulk-import shape, respects filters
- **admin-tiers** (new) — CRUD tiers + manage `tier_set_access`
- **admin-abandoned** (new) — list/export abandoned checkouts
- **practice-question** (new) — serves randomized question filtered by topic + tier-allowed sets, returns server-shuffled A-E options snapshot
- **create-checkout** (modify) — insert abandoned_checkouts row on session create
- **stripe webhook** (modify) — set `recovered_at` on completion
- **generate-exam** (modify) — validate requested set_id is in user's tier allowlist
- **score-attempt** (modify) — accept and store `time_spent_ms` per answer

## 3. Admin UI (new tabs in `/admin`)

- **AdminTiers.tsx** — table of tiers; per-tier "Assigned Sets" picker with bonus checkbox; edit price/duration/features
- **AdminAbandoned.tsx** — abandoned email list, CSV export
- **AdminTimeAnalytics.tsx** — heatmap: avg time per section + top 20 slowest questions (from `exam_attempt_answers.time_spent_ms`)
- **AdminTips.tsx** — markdown article CRUD (EN/IT)
- **AdminQuestions.tsx** — add "Export JSON" button (respects current filters)

## 4. Student UI

- **Briefing.tsx** at `/exam/:set_id/briefing` — rules, time per section, scoring (port `code-3.html` if matches)
- **SectionTransition.tsx** at `/exam/:set_id/transition` — port `code-2.html` countdown
- **Practice.tsx** at `/practice` — topic picker → untimed runner with **visible stopwatch counting up** (Q3: A); pulls from tier-allowed sets only
- **Tips.tsx** at `/tips` — Pro-only, gated server-side via subscription check
- **Dashboard.tsx** restyle per `code.html`
- **Exam.tsx** — instrument answer changes to send `time_spent_ms` and `first_seen_at`/`answered_at`
- **Sidebar** — add Practice, Tips (Pro badge if not subscribed), Analytics nav items

## 5. Routing additions

```
/exam/:set_id/briefing  → Briefing
/exam/:set_id/transition → SectionTransition
/practice               → Practice topic picker
/practice/:topic        → Practice runner
/tips                   → Tips index (Pro-gated)
/tips/:slug             → Article view
/admin → existing + new tabs (Tiers, Abandoned, Time, Tips)
```

## 6. Tier gating enforcement (server-side)

- `generate-exam` checks `tier_set_access` before serving any questions for a set
- `practice-question` filters question pool to only sets user's active tier owns
- `tips_articles` RLS: requires active Pro/Pro Extended subscription
- Frontend hides locked sets but server is source of truth

## What I will NOT touch
- Existing exam scoring math, passage serving, bulk question import/delete, RLS on questions, `useAvailableSets`

## Files to create (~25)
- 1 migration
- 4 new edge functions, 3 modified
- 4 new admin tabs + 1 export button
- 5 new student pages + dashboard restyle + sidebar update
- Updates to App.tsx routing and AuthContext for tier slug exposure

Ready to build. Will start with the DB migration, then edge functions, then UI top-down.

