-- Recreate the view with SECURITY DEFINER so it bypasses the questions table RLS
CREATE OR REPLACE VIEW public.questions_public
WITH (security_invoker = false)
AS
SELECT id, section, question_text, image_url, options, difficulty, created_at
FROM public.questions;

-- Grant select on the view to authenticated and anon roles
GRANT SELECT ON public.questions_public TO authenticated;
GRANT SELECT ON public.questions_public TO anon;