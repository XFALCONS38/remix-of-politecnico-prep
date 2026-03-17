

# Add LaTeX Rendering for Math Notation

## Problem
Question text, answer options, and solutions contain raw math notation like `sqrt(x^2 - 4)`, `log_0.5(...)`, `sin^6(x)`, etc. These should render as proper mathematical formulas.

## Approach
Install `react-katex` + `katex` and create a `<MathText>` component that detects LaTeX delimiters and renders them inline. The question data already uses plain-text math — I'll use a regex-based parser that converts common patterns (or explicit `$...$` delimiters) into KaTeX-rendered spans.

Since the question data uses plain text (not LaTeX markup), the component will need to handle `$...$` delimiters. This means I'll also need to update the question text in the database to use LaTeX notation — but that's a large effort. Instead, I'll use a **hybrid approach**: render `$...$` delimited text with KaTeX, and leave undelimited text as-is. This way, future questions can use `$...$` for LaTeX, and existing questions will still display correctly.

## Changes

1. **Install dependencies**: `katex` and `react-katex` packages
2. **Create `src/components/MathText.tsx`**: A reusable component that:
   - Splits text on `$...$` (inline) and `$$...$$` (block) delimiters
   - Renders delimited portions with KaTeX
   - Renders the rest as plain text
3. **Import KaTeX CSS** in `index.html` (CDN link) or in the component
4. **Update `Simulation.tsx`**: Wrap question text, option text, and passage text with `<MathText>`
5. **Update `Results.tsx`**: Same — wrap question text, options, and solution text with `<MathText>`
6. **Update `Admin.tsx`**: Wrap question preview text with `<MathText>` if applicable

All text rendering points where math could appear will use `<MathText>` instead of raw `{text}`.

