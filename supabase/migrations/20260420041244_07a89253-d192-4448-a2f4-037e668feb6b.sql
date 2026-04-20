-- 1. Time tracking on exam answers
ALTER TABLE public.exam_attempt_answers
  ADD COLUMN IF NOT EXISTS time_spent_ms integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS answered_at timestamptz;

-- 2. Practice attempts
CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text,
  section text NOT NULL,
  question_id uuid NOT NULL,
  options_snapshot jsonb NOT NULL,
  assigned_letter text NOT NULL,
  student_answer text,
  is_correct boolean,
  time_spent_ms integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own practice attempts"
  ON public.practice_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice attempts"
  ON public.practice_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user ON public.practice_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_topic ON public.practice_attempts(topic);

-- 3. Tier configuration upgrade
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_sets integer,
  ADD COLUMN IF NOT EXISTS bonus_sets_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_tiers_slug ON public.subscription_tiers(slug) WHERE slug IS NOT NULL;

-- Seed default tiers (idempotent on slug)
INSERT INTO public.subscription_tiers (name, slug, duration_days, price_cents, display_order, is_active, features, max_sets, bonus_sets_count)
VALUES
  ('Free',           'free',    30,  0,     1, true, '{"practice": true, "tips": false, "exam_simulator": true}'::jsonb, 1, 0),
  ('Core 3 Months',  'core_3m', 90,  1900,  2, true, '{"practice": true, "tips": false, "exam_simulator": true}'::jsonb, 6, 1),
  ('Pro 3 Months',   'pro_3m',  90,  2900,  3, true, '{"practice": true, "tips": true,  "exam_simulator": true}'::jsonb, 12, 2),
  ('Pro 6 Months',   'pro_6m',  180, 4900,  4, true, '{"practice": true, "tips": true,  "exam_simulator": true}'::jsonb, 12, 2)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- 4. Tier → set access
CREATE TABLE IF NOT EXISTS public.tier_set_access (
  tier_id uuid NOT NULL REFERENCES public.subscription_tiers(id) ON DELETE CASCADE,
  set_id text NOT NULL,
  is_bonus boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tier_id, set_id)
);

ALTER TABLE public.tier_set_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tier set access"
  ON public.tier_set_access FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage tier set access"
  ON public.tier_set_access FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Abandoned checkouts
CREATE TABLE IF NOT EXISTS public.abandoned_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  tier_slug text,
  stripe_session_id text,
  amount_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  recovered_at timestamptz
);

ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage abandoned checkouts"
  ON public.abandoned_checkouts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_created ON public.abandoned_checkouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_session ON public.abandoned_checkouts(stripe_session_id);

-- 6. Pro-only Tips & Formulas
CREATE TABLE IF NOT EXISTS public.tips_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_it text,
  body_en text NOT NULL,
  body_it text,
  category text NOT NULL DEFAULT 'tips',
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tips_articles ENABLE ROW LEVEL SECURITY;

-- Helper: pro access (active subscription matching pro_3m or pro_6m tier slugs)
CREATE OR REPLACE FUNCTION public.has_pro_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.subscription_tiers t
      ON t.name = s.tier OR t.slug = s.tier
    WHERE s.user_id = _user_id
      AND s.status = 'active'
      AND s.access_expiry > now()
      AND t.slug IN ('pro_3m', 'pro_6m')
  )
$$;

CREATE POLICY "Pro users can read published tips"
  ON public.tips_articles FOR SELECT
  TO authenticated
  USING (is_published = true AND (has_pro_access(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admin can manage tips articles"
  ON public.tips_articles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_tips_articles_category ON public.tips_articles(category, display_order);