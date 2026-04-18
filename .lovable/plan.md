

# TILPrep visual + structural overhaul — execution plan

This is a massive 8-phase spec (weeks of work). Below is a realistic, sequenced plan that respects the working exam engine, admin import/delete, and passages system you just built. I also included the small "easy difficulty" change you asked for.

## Two critical conflicts to flag before I touch anything

**1. shadcn/ui is already deeply integrated.** Your spec says "no component library, build from scratch." But ~50 shadcn components currently power your working admin (`AdminQuestions`, `AdminPassages`, bulk delete dialogs, tables, accordions) and auth pages. Stripping them = breaking everything we just built.

→ **My recommendation: keep shadcn under the hood, restyle its primitives to match your design tokens** (10px radius, no 1px borders, recessed `#DFE3E7` inputs, emerald focus rings). Visually identical to "scratch-built", zero regressions. If you insist on pure-Tailwind from-scratch, double the work and expect admin breakage during migration.

**2. Route restructure is breaking.** Today: `/simulation`, `/results`, `/admin`. Spec wants `/exam/:set_id`, `/results/:attempt_id`, `/admin/content`, `/admin/users`, etc. → I'll add the new routes as canonical and keep old paths as redirects so nothing breaks mid-migration.

## Add "easy" difficulty (small, bundled with Phase 0+1)

- `src/lib/questionSchema.ts`: `z.enum(["medium","hard"])` → `z.enum(["easy","medium","hard"])`
- `AdminQuestions.tsx` filter dropdown + `QuestionEditor.tsx` select: add "Easy" option
- Difficulty pill colors: green = Easy, amber = Medium, red = Hard
- No DB migration needed (column is free `text`)

## Phased execution (one phase per follow-up turn — don't batch)

**Phase 0 + 1 — Foundation & component library** *(I'll do this first when you say go)*
- Add color tokens + Poppins/Inter fonts to `tailwind.config.ts` and `index.html`
- Restyle existing shadcn primitives (Button, Input, Card, Badge, Dialog) to match design system
- Build new components that don't exist yet: `ProgressRing`, `QuestionNavigator`, `AnswerOptionCard`, `ScoreColorBand`, `SectionStatusChip`, `SetCard`, `LanguageToggle`, exam `TopBar`, `Sidebar`
- Add easy/medium/hard difficulty change

**Phase 2** — Public pages: Landing, Pricing, Login, Register
**Phase 3** — Student zone: Dashboard, `/exams` lobby, `/exam/:set_id` shell wrapping existing engine, Section Transition, Score Page, Review, Analytics, Settings
**Phase 4** — Admin restyle + new routes (`/admin/content`, `/admin/users`); existing import/delete/passages logic untouched
**Phase 5** — Modals: EmailGate, Upgrade, SectionSubmit, TerminateExam (2-step)
**Phase 6** — i18n (i18next + EN/IT JSON locales)
**Phase 7** — Stripe launch-pricing gate (100-purchase counter, auto-flip prices)
**Phase 8** — Full QA pass against your checklist

## What I will NOT touch
- Edge functions: `score-attempt`, `generate-exam`, `get-exam-review`, `parse-pdf-questions`, `admin-questions` bulk insert/delete/passages logic
- `useAvailableSets` hook and dynamic set system
- Supabase client, types, RLS policies on `questions`/`attempts`/`passages`
- The working `AdminQuestions` bulk-select-and-delete you just got

## Two questions before I start

**Q1 — Component library approach?**
- **A) Restyle shadcn to match (recommended)** — tokens swap, zero regressions
- **B) Strip shadcn, rebuild from scratch** — breaks admin, ~3-5x more work
- **C) Hybrid** — new pages from scratch, leave admin alone (two style systems)

**Q2 — How much in the first PR?**
- **A) Phase 0+1 only** — foundation, tokens, fonts, base + new components, easy difficulty. Then you review and say "continue Phase 2."
- **B) Phase 0+1+2** — also Landing/Pricing/Login/Register. Bigger PR, slower iteration.
- **C) Just the easy-difficulty change** — minimum viable, plan visual overhaul separately.

Reply with your picks (e.g., "A and A") and I'll start.

