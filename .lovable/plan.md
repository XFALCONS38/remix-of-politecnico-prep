

# Import SET_02 Questions into Database

## What We're Doing
Insert the 30 questions from the uploaded `Set_02.json` file into the `questions` table using the existing `admin-questions` edge function's `bulk_insert` action.

## Steps

1. **Copy the uploaded file** to the filesystem
2. **Call the `admin-questions` edge function** with `action: "bulk_insert"` and the parsed JSON array as the `questions` payload
3. **Verify** the insertion by querying the database for SET_02 question count

No schema changes needed — the data format matches the existing `questions` table structure exactly.

