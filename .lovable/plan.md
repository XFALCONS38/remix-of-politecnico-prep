

# Robust Student Dashboard + UX Fixes

## Context
Currently the Dashboard is a simple list of past attempts. The user wants a beautiful, feature-rich dashboard for pro students with analytics, plus several UX fixes across the app. The simulator itself should NOT be touched (except the submit confirmation and arrow key fix which are minimal behavioral changes in `Simulation.tsx`).

## What We're Building

### A. New Dashboard (complete rewrite of `src/pages/Dashboard.tsx`)

**Layout**: Responsive grid — sidebar-style nav on desktop, bottom/hamburger on mobile.

```text
┌──────────────────────────────────────────────────┐
│  Header: TILPrep logo (→ home) | email | signout │
├──────────────────────────────────────────────────┤
│                                                  │
│  Welcome back, [name/email]         [Start Sim]  │
│  Pro access expires in X days                    │
│                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ Total   │ │ Best    │ │ Avg     │ │ Exams  │ │
│  │ Exams   │ │ Score   │ │ Score   │ │ This   │ │
│  │   12    │ │  34.5   │ │  28.2   │ │ Week:3 │ │
│  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
│                                                  │
│  ┌── Score Progress Over Time ──────────────┐    │
│  │  Simple line/bar chart of attempt scores │    │
│  │  (pure CSS/SVG, no library needed)       │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌── Section Strengths ────────────────────┐     │
│  │  Math:     ████████░░  78%              │     │
│  │  Logic:    ██████░░░░  55%              │     │
│  │  Physics:  ████░░░░░░  40%  ← weakest  │     │
│  │  Technical:███████░░░  65%              │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ┌── Recent Attempts ──────────────────────┐     │
│  │  Date | Score | Verdict | View/Continue │     │
│  │  ...                                    │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  (Free users: upgrade banner stays)              │
└──────────────────────────────────────────────────┘
```

**Stats cards** (top row): Total exams completed, Best score, Average score, Exams this week. Computed client-side from attempts data.

**Score history chart**: A simple SVG-based mini chart showing score progression across attempts (no external charting library). Each bar/dot = one completed attempt.

**Section strengths**: Aggregated from `section_scores` JSONB across all completed attempts. Shows average % per section with colored progress bars. Highlights weakest section.

**Attempt history table**: Same data as current but styled as a proper responsive table/card list. On mobile, each attempt becomes a stacked card.

**Upgrade banner**: Still shown for free users, hidden for pro.

**Responsive behavior**:
- Desktop (≥768px): Grid layout, stats in a row, chart + strengths side by side
- Tablet: Stats wrap to 2×2, chart full width
- Mobile (<640px): Single column, cards stack vertically, touch-friendly tap targets (min 44px)

### B. Navigation Fixes

1. **Login page** (`Login.tsx`): Add "← Back to Home" link or TILPrep logo linking to `/`
2. **Register page** (`Register.tsx`): Same — add home link
3. **Language selection screen** (`Simulation.tsx`, the `if (!lang)` block): Add a "← Back to Dashboard" button
4. **Fix duplicate nested Link/span tags** in headers (visible in current code: `<Link><Link>TILPrep</Link></Link>`)

### C. Submit Confirmation Dialog

In `Simulation.tsx`, when the user manually clicks "Submit Exam":
- Show an AlertDialog: "Are you sure you want to submit? You still have X unanswered questions."
- Two buttons: "Continue Exam" (cancel) and "Submit Anyway" (confirm)
- Auto-submit (timer expiry) skips this dialog

### D. Arrow Key Navigation Fix

The current `useEffect` for keyboard handling already handles ArrowLeft/ArrowRight. Looking at the code, the issue is that `saveAnswer` is missing from the dependency array of the `useEffect`, and the handler references stale closures. We need to add `saveAnswer` to deps and also prevent default on arrow keys to avoid page scrolling.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Complete rewrite: stats cards, score chart (SVG), section strengths, responsive layout |
| `src/pages/Login.tsx` | Add TILPrep logo/link to home at top; fix nested Link tags |
| `src/pages/Register.tsx` | Add TILPrep logo/link to home at top |
| `src/pages/Simulation.tsx` | (1) Add back button on language screen, (2) Add AlertDialog for submit confirmation, (3) Fix arrow key `e.preventDefault()` + deps |
| `src/pages/Results.tsx` | Fix duplicate nested Link tags in header |
| `src/pages/Pricing.tsx` | Fix duplicate nested Link tags in header |
| `src/pages/Index.tsx` | Fix duplicate nested span tags in header |

No database changes needed — all analytics are computed client-side from existing `attempts` table data (score, section_scores, started_at).

