

# Full Exam Engine Implementation

This is a large implementation covering database migration, 2 edge functions, and 4 frontend pages. I'll break it into sequential steps.

## Step 1: Database Migration

Drop old tables/views and create new schema:

```sql
-- Drop old dependencies
DROP VIEW IF EXISTS questions_public;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS attempts CASCADE;  -- will recreate
DROP TABLE IF EXISTS exam_types;
DROP TABLE IF EXISTS questions;         -- old schema

-- Create passages
CREATE TABLE passages ( ... );  -- as specified

-- Create questions (new schema with correct_answers/wrong_answers JSONB, passage_id, etc.)
CREATE TABLE questions ( ... );  -- as specified

-- Create user_question_history (composite PK)
CREATE TABLE user_question_history ( ... );

-- Create exam_attempt_answers (with options_snapshot, assigned_letter, student_answer)
CREATE TABLE exam_attempt_answers ( ... );

-- Recreate attempts WITHOUT exam_type_id FK (no longer needed)
-- Keep: id, user_id, current_section, started_at, submitted_at, score, section_scores, status, is_free_attempt, created_at
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_section INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  section_scores JSONB,
  status attempt_status DEFAULT 'in_progress',
  is_free_attempt BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on all tables
-- passages: authenticated SELECT
-- questions: SELECT false for regular users (service role only), admin ALL
-- user_question_history: users own rows
-- exam_attempt_answers: users own rows (via attempt ownership)
-- attempts: same as before
```

## Step 2: Edge Function — `generate-exam`

New `supabase/functions/generate-exam/index.ts`:

- Authenticates user via JWT
- Accepts `{ is_free }` — if true, restricts to `set_id = 'SET_01'`
- Queries `user_question_history` for last 2 attempts to build exclusion list
- Selects questions by topic quotas:
  - Math (16): algebra×2, functions×1, exp_log×2, trigonometry×2, analytic_geometry×2, sequences_series×1, probability×2, euclidean_geometry×2, free×2
  - Logic (10): sequence_pattern×1, ordering_puzzle×1, syllogism×1, cipher×1, set_overlap×1, text_comprehension×5 (passage block)
  - Physics (10): kinematics/dynamics×2, energy_collisions×1, thermodynamics/fluid_mechanics×2, electrostatics/dc_circuits×2, magnetism/optics×1, orbital_mechanics×1, free×1
  - Tech (6): one each of boolean_logic, pseudocode, bitwise, topology_3d, spatial_reasoning, cross_section
- 50/50 medium/hard split (adaptive after 5+ exams)
- For text_comprehension: selects a passage, loads all 5 questions by passage_id in passage_order
- Answer assembly: 1 random correct + 4 random wrong → shuffle → assign A-E → store in `exam_attempt_answers` with `options_snapshot` and `assigned_letter`
- Creates attempt row, inserts `user_question_history` entries
- Returns: attempt_id + ordered list of `{ question_id, section, question_text_en, passage_text_en?, options: {A: text, B: text, ...} }`
- Does NOT return correct answers to client

## Step 3: Edge Function — `score-attempt` (rewrite)

- Reads `exam_attempt_answers` for the attempt
- Compares `student_answer` to `assigned_letter`
- Scoring: +1.0 correct, -0.25 wrong, 0.0 blank
- Updates `attempts` with score, section_scores, status='completed', submitted_at
- Increments `times_served`/`times_correct` on questions

## Step 4: Rewrite `Simulation.tsx`

- On mount: call `generate-exam` (pass `is_free: !hasActiveAccess`)
- If existing in-progress attempt found, load its `exam_attempt_answers` instead
- Display questions with 5 options (A-E) from `options_snapshot`
- Show passage text above questions when passage data exists
- Save answers: update `exam_attempt_answers.student_answer` with selected letter
- Single 90-minute timer (no per-section timer) — all 42 questions in sequence
- Section labels shown as visual grouping, not separate timed blocks
- On submit: call `score-attempt`

## Step 5: Rewrite `Results.tsx`

- Load attempt data + `exam_attempt_answers` joined with question info (via new edge function `get-exam-review`)
- Show each question using `options_snapshot` (frozen at exam time)
- Highlight correct answer (`assigned_letter`) in green, student's wrong answer in red
- Show `solution_en` — blurred/locked for free users, visible for paid
- Show passage text for comprehension questions

## Step 6: New Edge Function — `get-exam-review`

Returns full review data for a completed attempt (uses service role to read questions table):
- Question text, options_snapshot, assigned_letter, student_answer, solution_en, section, passage_text_en

## Step 7: Admin Panel — `src/pages/Admin.tsx`

- Protected by admin role check
- Table listing all questions (filterable by section, topic, difficulty, set_id, is_active)
- Toggle `is_active` on any question
- Bulk JSON import: paste array → validate → insert via edge function
- New edge function `admin-questions` for CRUD operations (validates admin role)

## Step 8: Route & Config Updates

- `App.tsx`: Add `/admin` route with `AdminRoute` wrapper
- `ProtectedRoute.tsx`: Add `AdminRoute` component (checks `has_role(uid, 'admin')`)
- `supabase/config.toml`: Add `generate-exam`, `get-exam-review`, `admin-questions` entries

## Files Changed/Created

| File | Action |
|------|--------|
| Database migration | Drop old tables, create new schema + RLS |
| `supabase/functions/generate-exam/index.ts` | New |
| `supabase/functions/score-attempt/index.ts` | Rewrite |
| `supabase/functions/get-exam-review/index.ts` | New |
| `supabase/functions/admin-questions/index.ts` | New |
| `supabase/config.toml` | Add 3 function entries |
| `src/pages/Simulation.tsx` | Rewrite |
| `src/pages/Results.tsx` | Rewrite |
| `src/pages/Admin.tsx` | New |
| `src/components/ProtectedRoute.tsx` | Add AdminRoute |
| `src/App.tsx` | Add /admin route |

