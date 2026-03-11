
# TILprep Brand System Implementation

## Summary
Apply the complete TILprep brand system: updated color palette, refined typography sizes, and a new 3-tier button system (Primary = outlined, Secondary = green filled, Ghost = text only).

## Changes

### 1. `src/index.css` -- Color & Typography Updates
- Update `--foreground` to Soft Charcoal (#2A2A2A / `0 0% 16.5%`)
- Update `--warning` to Warm Amber (#F5A623 / `37 91% 55%`)
- Card foreground, popover foreground, and secondary foreground updated to match new text color
- Typography sizes already correct (H1 40px/600, H2 28px/500, H3 20px/500, body 16px)

### 2. `src/components/ui/button.tsx` -- New Button System
- **default (Primary)**: Transparent background, 1px solid border using primary color (#1E2A38), primary text color, 10px radius, hover lightens background
- **secondary**: Background #2BB673, white text, hover #249E62, padding 12px 20px
- **ghost**: Text only, no border (already close, just ensure clean styling)
- **outline**: Keep as-is for backwards compatibility

### Technical Details

**Color HSL conversions:**
| Color | HEX | HSL |
|-------|-----|-----|
| Soft Charcoal (text) | #2A2A2A | 0 0% 16.5% |
| Warm Amber | #F5A623 | 37 91% 55% |
| Button green | #2BB673 | 152 61% 44% |
| Button green hover | #249E62 | 152 61% 38% |

**Button variant mapping:**
- `default` = Primary CTA (outlined, transparent bg)
- `secondary` = Secondary CTA (green filled)
- `ghost` = Cancel/Skip (text only, no border)
