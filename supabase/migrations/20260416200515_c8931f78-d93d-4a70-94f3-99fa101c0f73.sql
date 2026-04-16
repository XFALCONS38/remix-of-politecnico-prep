
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  duration_days integer NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tier text;

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active tiers"
  ON public.subscription_tiers FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage tiers"
  ON public.subscription_tiers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.subscription_tiers (name, duration_days, price_cents, display_order) VALUES
  ('Trial', 7, 0, 1),
  ('Standard', 60, 1900, 2),
  ('Pro', 180, 4900, 3)
ON CONFLICT (name) DO NOTHING;
