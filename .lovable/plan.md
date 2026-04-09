

# Universal Theme, Language Preferences & Set Selection

## Summary
Add dark/light mode toggle, a universal language preference (stored in profile), set selection before exam, and ensure Italian users always see native Italian content from the database — never translated.

## Database Changes

### Migration 1: Add columns to `profiles` and `attempts`
```sql
ALTER TABLE profiles ADD COLUMN preferred_lang TEXT DEFAULT 'en';
ALTER TABLE attempts ADD COLUMN lang TEXT DEFAULT 'en';
ALTER TABLE attempts ADD COLUMN set_id TEXT DEFAULT 'SET_01';
```

- `preferred_lang` on profiles: persists the user's language choice across sessions
- `lang` on attempts: records which language was used for each exam (so Results/Dashboard know which field to read)
- `set_id` on attempts: records which question set was used

## Frontend Changes

### 1. Theme & Language Context (`src/contexts/ThemeContext.tsx` — new)
- Dark/light mode: stores in `localStorage`, applies `dark` class to `<html>`
- Provides `theme`, `toggleTheme`, `lang`, `setLang` globally
- `lang` syncs from `profile.preferred_lang` on login; updates profile in DB when changed

### 2. Tailwind dark mode (`tailwind.config.ts`)
- Set `darkMode: "class"` (may already be set)

### 3. Universal Header Component (`src/components/SiteHeader.tsx` — new)
- TILPrep logo → home link
- Dark/light toggle (Sun/Moon icon)
- Language toggle (EN/IT flag switch) — changes UI labels site-wide
- Used on: Index, Dashboard, Pricing, Login, Register, Results pages

### 4. Registration (`Register.tsx`)
- Add language selector (EN/IT) during signup
- Store chosen lang in profile via `preferred_lang`

### 5. Simulation pre-exam screen (`Simulation.tsx`)
- Replace language-only selector with a combined screen:
  - Language choice (pre-filled from profile preference)
  - **Set selection**: Show available sets. Free users: only SET_01. Pro users: all sets (currently just SET_01, but extensible)
  - "Start Exam" button
- Pass `set_id` + `lang` to `generate-exam` edge function
- Store `lang` and `set_id` on the attempt record

### 6. Edge function: `generate-exam`
- Accept `set_id` from body (default `SET_01`)
- Use `set_id` to filter questions: `.eq("set_id", body.set_id)`
- Store `lang` and `set_id` on the attempt row
- Remove the old `is_free` → `SET_01` logic; instead directly use the passed `set_id`

### 7. Results page (`Results.tsx`)
- Read `lang` from the attempt record (via `get-exam-review` response)
- Use that lang to decide which field to display (`question_text_it` vs `question_text_en`, `solution_it` vs `solution_en`)
- Remove the manual language toggle on Results — language is locked to what was used during the exam
- The translator toggle in the header does NOT affect question/answer/solution text

### 8. Dashboard (`Dashboard.tsx`)
- Section labels respect the global `lang` from context
- Attempt history shows "View" links that load results in the exam's original language
- All UI text (Welcome back, stats labels, etc.) translated based on global lang

### 9. Language rules (critical)
- **Exam content** (questions, options, solutions): ALWAYS uses the `lang` stored on the attempt. Never translated dynamically.
- **UI chrome** (buttons, labels, navigation): Uses the global `lang` from ThemeContext, switchable anytime via header toggle.
- The header language toggle explicitly does NOT affect exam content rendering.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `preferred_lang` to profiles, `lang` + `set_id` to attempts |
| `tailwind.config.ts` | Ensure `darkMode: "class"` |
| `src/contexts/ThemeContext.tsx` | New: dark mode + global UI lang provider |
| `src/components/SiteHeader.tsx` | New: universal header with theme + lang toggles |
| `src/App.tsx` | Wrap with ThemeProvider |
| `src/pages/Index.tsx` | Use SiteHeader |
| `src/pages/Dashboard.tsx` | Use SiteHeader, bilingual UI labels |
| `src/pages/Login.tsx` | Use SiteHeader |
| `src/pages/Register.tsx` | Use SiteHeader, add lang preference picker |
| `src/pages/Pricing.tsx` | Use SiteHeader |
| `src/pages/Simulation.tsx` | Combined lang + set picker pre-exam screen |
| `src/pages/Results.tsx` | Lock content lang to attempt's lang, use SiteHeader |
| `supabase/functions/generate-exam/index.ts` | Accept `set_id`, store `lang` + `set_id` on attempt |
| `supabase/functions/get-exam-review/index.ts` | Return attempt `lang` in response |
| `src/contexts/AuthContext.tsx` | Fetch `preferred_lang` in profile |

