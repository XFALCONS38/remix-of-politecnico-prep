

# Seed SET_01: Passage + 26 Math Questions + 10 Logic + 10 Physics + 6 Technical

## What exists
- `passages` table: 0 rows for SET_01
- `questions` table: 0 rows for SET_01
- `admin-questions` edge function: supports `bulk_insert_passages` and `bulk_insert` actions

## Plan

### Step 1: Insert the passage
Use the `admin-questions` edge function with `bulk_insert_passages` to insert the acoustic metamaterials passage. Retrieve the generated UUID.

### Step 2: Insert all 42 questions
Use the `admin-questions` edge function with `bulk_insert` in batches:
1. **Math M1-M16** (16 questions) — standalone, `passage_id: null`
2. **Logic L1-L5** (5 questions) — standalone, `passage_id: null`
3. **Logic L6-L10** (5 questions) — with `passage_id` set to the UUID from Step 1, `passage_order` 1-5
4. **Physics P1-P10** (10 questions) — standalone, `passage_id: null`
5. **Technical T1-T6** (6 questions) — standalone, `passage_id: null`

Total: 42 questions (complete SET_01).

### Authentication requirement
The `admin-questions` edge function requires an admin user's auth token. The user must be logged in as an admin in the preview for the `curl_edge_functions` tool to work (it auto-includes the auth token).

If the user is not logged in as admin, I'll fall back to using a database migration to INSERT the data directly via SQL.

### No code changes needed
All data goes into existing tables via existing edge functions or SQL. No frontend or schema changes required.

