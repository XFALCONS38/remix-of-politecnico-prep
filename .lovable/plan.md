

# Rename to TILPrep + Add Pro Test Account

## 1. Rename "PolitoSim" → "TILPrep"

Update all 6 files that reference the old name:
- `src/pages/Index.tsx` — header brand
- `src/pages/Dashboard.tsx` — header brand
- `src/pages/Results.tsx` — header brand  
- `src/pages/Admin.tsx` — "TILPrep — Admin"
- `src/pages/Pricing.tsx` — header brand
- `src/pages/Login.tsx` — card description text
- `index.html` — page title + og:title + twitter:title

## 2. Add test account with pro access

Create the user `abc123@gmail.com` with password `1q2w3e4r5t` via the auth admin API, then set `access_expiry` far in the future (e.g. 2030-01-01) on their profile to unlock all paid features.

This requires:
1. Edge function or direct Supabase admin call to create the auth user (since email auto-confirm may be off, we need to confirm them)
2. UPDATE profiles SET `access_expiry = '2030-01-01'` for that user

We'll use `cloud--configure_auth` to enable auto-confirm temporarily or use the service role to create a confirmed user via an edge function call. Simplest: use a one-off SQL insert + the Supabase admin API via `psql` to update the profile.

