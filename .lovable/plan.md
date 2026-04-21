

# Tier-gated set picker + 4 designed screens

## What's being built

1. **Tier-gated `useAvailableSets`** — only show sets the user's active tier owns
2. **Student Dashboard** redesign per `student_dashboard_2.png` (Learning Progress + Upcoming + Performance Analytics table)
3. **Briefing screen** redesign per `pre_exam_airlock.png` (Academic Architecture left, Pre-Exam Briefing right, section dots footer)
4. **Practice Library** redesign per `practice_library.png` (sidebar + featured topic + topic grid + Formula Bank panel)
5. **Account Settings** new page per `screen-8.png` at `/settings` (Personal Identity, Billing Ledger, Current Plan, Tier Architecture)

---

## 1. Tier-gated set access (the user's main complaint)

**Backend:** Add a SECURITY DEFINER RPC `get_user_allowed_sets(_user_id uuid)` that:
- Reads user's active subscription → matches `subscription_tiers` by slug/name → returns rows from `tier_set_access` (with `is_bonus` flag)
- Falls back to the `free` tier's allowlist if no active subscription
- Falls back to all available sets if `free` tier has no allowlist (safe default)

**Frontend:** Extend `useAvailableSets` to accept `{ scope: "all" | "user" }` (default `"user"`). Admin pages (`AdminPassages`, etc.) pass `"all"`; Simulation/Dashboard/Practice get `"user"` automatically.

Result: a Core subscriber configuring an exam sees only their 6 sets + 1 bonus, nothing else. Locked sets never render in the set picker.

---

## 2. Dashboard redesign (`Dashboard.tsx`)

Layout: left vertical sidebar + main content area.

- **Left sidebar (sticky, 240px):** Logo (TIL-I Prep / Engineering 2024) → nav (Overview / Mathematics / Physics / Logic / English) → "Start Simulation" CTA pinned bottom → Support / Logout.
- **Top header:** "ACADEMIC TERM 2024" eyelash + big "Student Dashboard" title + bell + avatar.
- **Learning Progress card** (large): "Completion across core modules" + UPDATED TODAY chip + 3 sub-cards (Math / Physics / Logic) each with % + delta arrow + thin progress bar (real `sectionStrengths` data).
- **Upcoming card** (right column): countdown to next exam (DAYS / HRS) + "View Details" — pulls from in-progress attempts or upcoming launch date.
- **Performance Analytics table:** Subject Module / Raw Score / Percentile / Cohort Avg / Status (Exceptional/On Track/Needs Review pills) — computed from `attempts.section_scores`.
- **Footer:** Terms / Privacy / Institutional Access.

Keeps existing data model. Restyled, no new queries except cohort avg (computed client-side over attempts).

---

## 3. Briefing screen (`Briefing.tsx`)

Two-column layout:

- **Left:** "ENTRANCE EXAMINATION" pill → big "Academic Architecture" title → description paragraph → 2x2 stat grid (Total Questions 42, Duration 90m, Correct +1.0, Incorrect −0.25) → hero image placeholder.
- **Right:** "Pre-Exam Briefing" with vertical green accent bar, then 3 cards (Structured Sections / Performance Threshold / Proctoring Rules) each with icon tile + title + body, then confirmation checkbox + disabled-until-checked "Start Section 1: Mathematics →" CTA + small settings cog.
- **Footer:** MATH · PHYSICS · LOGIC · VERBAL with progress dots (first one filled green).

Reuses existing copy keys, adds new ones for "Academic Architecture", "Structured Sections", etc. (EN/IT).

---

## 4. Practice Library (`Practice.tsx` topic-picker view)

- **Left sidebar (240px):** "Academic Architect / Exam Prep 2024" logo, nav (Dashboard / Subjects / **Practice Tests** active / Formula Bank / Scholar Records), profile chip, "Start Daily Drill" CTA pinned bottom.
- **Top:** Search bar + bell + cog.
- **Hero title:** "Practice Library." with green dot, subtitle.
- **Featured card** (full width): difficulty pill ("ADVANCED"), section name (e.g. "Mathematics"), curriculum completion bar with %, available-questions count + "Start Drill →" CTA. Auto-pick the user's weakest section.
- **3-column grid:** topic cards each with category pill, topic name, progress bar, "Start Drill" button.
- **Formula Bank dark card** (right of grid, Pro-only): list 3 sample formulas + "Open Repository" — locked overlay if not Pro.

Topic data still comes from `practice-question` edge function (already tier-gated via `tier_set_access`). Adds aggregate "completion %" per topic from `practice_attempts`.

---

## 5. Account Settings (new page `/settings`)

- **Personal Identity card:** avatar with edit pencil, Full Name, Email, Current Password (masked, show/hide eye), "Save Changes" CTA. Wires to `profiles` table + `supabase.auth.updateUser`.
- **Billing Ledger card:** table (Date / Plan / Amount / Status / Invoice download icon) — pulls from `subscriptions` table. "View Archive →" link.
- **Right column — Current Plan card** (dark): "CURRENT PLAN" pill, plan name, 3 feature bullets with green checks. Reads user's active tier.
- **Annual billing CTA card** (amber): "Save 15% with annual billing" + Upgrade Now.
- **Tier Architecture card:** all available tiers from `subscription_tiers` listed, current marked with green left bar + "CURRENT" pill, others get "Switch Plan" / "Downgrade" buttons → `/pricing`.
- **Footer:** "Need Technical Assistance?" with Documentation + Contact Support buttons.

Add `/settings` route + nav link in `SiteHeader`.

---

## Files

**Edit:** `src/hooks/useAvailableSets.ts`, `src/pages/Dashboard.tsx`, `src/pages/Briefing.tsx`, `src/pages/Practice.tsx`, `src/components/SiteHeader.tsx`, `src/App.tsx`, `src/components/admin/AdminPassages.tsx` (pass `scope: "all"`)

**Create:** `src/pages/Settings.tsx`, `supabase/migrations/<new>.sql` (RPC `get_user_allowed_sets`)

**Untouched:** exam engine logic, scoring, edge functions, RLS, admin import/delete, passages CRUD.

---

## Things I will NOT do unless asked
- Won't redesign the in-exam Simulation runner UI (only the picker filters down)
- Won't change exam scoring or answer recording
- Won't restyle Pricing/Login/Register in this PR (separate task)

