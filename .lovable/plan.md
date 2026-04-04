

# Fix Bilingual Options & LaTeX Rendering in Exam

## Problems Identified

1. **Options show English even when Italian is selected**: The `options_snapshot` stored in `exam_attempt_answers` contains plain strings like `{"A": "text"}` instead of bilingual objects `{"A": {"en": "...", "it": "..."}}`. The `generate-exam` edge function code already produces bilingual format, but it needs redeployment. Additionally, resumed attempts with old-format data will always show English.

2. **LaTeX not rendering in answer options**: The `correct_answers` and `wrong_answers` JSONB fields in the `questions` table store double backslashes (`\\sqrt{7}`, `\\cup`) instead of single backslashes (`\sqrt{7}`, `\cup`). The `question_text_en/it` fields are correct with single backslashes. KaTeX requires single backslashes to render properly.

## Fixes

### Step 1: Database Migration — Fix double backslashes in answer JSONB

Run a migration that replaces `\\` with `\` in all text values within `correct_answers` and `wrong_answers` JSONB for all questions in SET_01. This covers `text_en`, `text_it`, and `explanation_en` fields. Also fix `solution_en` and `solution_it` if they have the same issue.

```sql
-- Fix double backslashes in correct_answers and wrong_answers
UPDATE questions
SET
  correct_answers = regexp_replace(correct_answers::text, '\\\\', '\', 'g')::jsonb,
  wrong_answers = regexp_replace(wrong_answers::text, '\\\\', '\', 'g')::jsonb,
  solution_en = regexp_replace(solution_en, '\\\\', '\', 'g'),
  solution_it = regexp_replace(solution_it, '\\\\', '\', 'g')
WHERE set_id = 'SET_01';
```

### Step 2: Redeploy `generate-exam` edge function

The code already produces bilingual `options_snapshot`. Ensure it's deployed so new attempts get the correct format. (Edge functions auto-deploy on save in Lovable.)

### Step 3: Frontend — Handle old attempts gracefully

The `getOptionText` helper in `Simulation.tsx` already handles both formats (string vs object). No frontend change needed for this.

### Step 4: Clear any in-progress attempts with old format (optional)

If the user has an in-progress attempt with old-format options, it will resume with English-only options. The simplest fix: mark old in-progress attempts as abandoned so a fresh exam generates with the new bilingual format.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Fix `\\` → `\` in `correct_answers`, `wrong_answers`, `solution_en`, `solution_it` |
| `supabase/functions/generate-exam/index.ts` | No code change needed — just redeploy |

