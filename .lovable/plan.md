
# Admin Questions: nested Set → Section grouping with serial ordering

## What's wrong today
In Admin → Questions, each Set accordion lists every question as one big flat table mixed across sections (mathematics, logic, physics, technical) and not in a clear serial order. You want them sorted serially **and** split per section under each set, the same way sets are already split.

## Change scope
Single file: `src/components/admin/AdminQuestions.tsx`. No backend, RLS, or schema changes. The existing `admin-questions` edge function already returns everything we need.

## New structure inside the "Question Bank" card

```text
[ Set SET_01  · 60 questions · 58 active ]   ← outer accordion (existing)
   [ Mathematics · 20 questions ]              ← NEW inner accordion
      Q001 …
      Q002 …
      Q003 … (serial by question_code)
   [ Physics · 15 questions ]
      Q001 …
      Q002 …
   [ Logic · 15 questions ]
   [ Technical · 10 questions ]
[ Set SET_02 … ]
```

## Implementation details

1. **Replace `groupedBySet` with `groupedBySetThenSection`**
   - `Map<set_id, Map<section, AdminQuestion[]>>`
   - Section order fixed: `mathematics → physics → logic → technical` (matches the exam flow used elsewhere in the app).
   - Inside each section, sort by `question_code` using natural/numeric-aware compare so `M2` comes before `M10` (`localeCompare` with `{ numeric: true }`).

2. **Render a nested `<Accordion type="multiple">`** inside each set's `AccordionContent`. Each section becomes its own `AccordionItem` showing:
   - section name (capitalised), question count badge, active count badge, a section-level select-all checkbox (reusing the existing `toggleSelectSet` helper with the section's IDs).

3. **Pagination key changes** from `pageBySet[setId]` to `pageBySetSection[`${setId}::${section}`]` so each section paginates independently. Same `PAGE_SIZE = 20`.

4. **Set-level header** keeps its existing checkbox and totals (sum across sections).

5. **Add a `#` column** at the start of each section's table showing the 1-based serial index within that section (after sorting), so admins immediately see the order.

6. Keep all existing behaviour: row checkboxes, edit/delete buttons, active toggle, IT badge, success rate, filters bar, JSON/PDF/Direct upload tabs, bulk delete, export, refresh — none of these change.

## What stays untouched
- `admin-questions` edge function
- `QuestionEditor`, bulk import/delete logic
- Filters (section/topic/difficulty/set_id) — they continue to narrow what's loaded; the new grouping just organises whatever comes back.
- All other admin tabs and student pages.

## Files
- **Edit:** `src/components/admin/AdminQuestions.tsx` (only)

## Risk
Very low — purely a presentation change in one component.
