

# Update SET_01 with Bilingual Data + Add Language Selection

## Summary
Replace all 42 SET_01 questions with LaTeX-formatted bilingual versions (EN+IT), update the passage with Italian translation, modify edge functions to support bilingual `options_snapshot`, and add a language selector before exam start.

## Step 1: Database — Update all SET_01 data via SQL

**One large UPDATE migration** that:
- Updates all 42 questions with new `question_text_en` (LaTeX), `question_text_it`, `correct_answers` (with `text_it`), `wrong_answers` (with `text_it`), `solution_en` (LaTeX), `solution_it`, `it_ready = true` — matched by `question_code` + `set_id`
- Updates the passage with `passage_text_it` and `it_ready = true`

Since UPDATE requires migrations, this will be a migration with 42 UPDATE statements + 1 passage UPDATE.

## Step 2: Edge Function — `generate-exam`

Modify `assembleAnswers()` to store bilingual options:
```
// Current: {"A": "text_en", ...}
// New:     {"A": {"en": "text_en", "it": "text_it"}, ...}
```

Accept `lang` param from request body. Return both `question_text_en` and `question_text_it` fields, plus `passage_text_it` for passage questions. Resume path also fetches `_it` fields.

## Step 3: Edge Function — `get-exam-review`

Fetch `question_text_it`, `solution_it`, `passage_text_it` from DB. Return them alongside English versions in the response.

## Step 4: Frontend — `Simulation.tsx`

- Add a **language selection screen** before exam starts (two buttons: English / Italiano)
- Store `lang` in state, pass to `generate-exam` call
- Update `ExamQuestion` interface to include `question_text_it`, `passage_text_it`
- Options rendering: check if option value is string (old) or object (new bilingual) — render `options[letter][lang]` or `options[letter]` accordingly
- Italian section labels: `{ mathematics: "Matematica", logic: "Comprensione e Logica", physics: "Fisica", technical: "Conoscenze Tecniche" }`

## Step 5: Frontend — `Results.tsx`

- Update `ReviewQuestion` interface with `_it` fields
- Add lang toggle or detect from options format
- Render bilingual content based on language choice
- Solution display uses `solution_it` when Italian selected

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | UPDATE 42 questions + 1 passage with IT translations + LaTeX |
| `supabase/functions/generate-exam/index.ts` | Bilingual `assembleAnswers`, accept `lang`, return `_it` fields |
| `supabase/functions/get-exam-review/index.ts` | Return `_it` fields |
| `src/pages/Simulation.tsx` | Language picker, bilingual rendering |
| `src/pages/Results.tsx` | Bilingual review rendering |

