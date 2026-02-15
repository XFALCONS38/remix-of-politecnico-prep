

## Plan: Replace Placeholder Questions with Real Exam Questions

### Current State
The database contains 42 simple placeholder questions (e.g., "What is sin(30°)?"). These need to be replaced with the 10 real math questions you provided.

### What Will Change

**Step 1 — Clear existing placeholder questions**
Delete all 42 placeholder rows from the `questions` table (and any related `answers` rows if they exist).

**Step 2 — Insert 10 real math questions**
Insert your 10 provided questions into the `questions` table with:
- `section`: "math" for all
- `question_text`: The actual question text
- `options`: JSON array of 5 answer choices
- `correct_option_index`: As specified in your data
- `explanation`: Full worked-out solution
- `difficulty`: "medium" (default, adjustable later)

**Note:** After this update, the database will have only 10 math questions instead of 42 across all sections. The simulation currently expects 42 questions (16 math, 10 logic, 10 physics, 6 tech). With only 10 math questions and no questions for other sections, the simulation will need to adapt — it will either run with just the available questions or we can add more questions later for the other sections.

### Technical Details
- A single SQL migration will handle both the deletion and insertion
- Foreign key constraints: any existing `answers` referencing old questions will be cleared first
- The `exam_types` scoring config remains unchanged
- No code changes needed — the simulation already fetches questions dynamically from the database

