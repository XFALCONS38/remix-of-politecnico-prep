
-- Drop old schema
DROP VIEW IF EXISTS public.questions_public CASCADE;
DROP TABLE IF EXISTS public.answers CASCADE;
DROP TABLE IF EXISTS public.attempts CASCADE;
DROP TABLE IF EXISTS public.exam_types CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;

-- Create passages
CREATE TABLE public.passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id TEXT NOT NULL,
  title TEXT,
  passage_text_en TEXT NOT NULL,
  passage_text_it TEXT,
  it_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create questions (new schema)
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id TEXT NOT NULL,
  section TEXT NOT NULL,
  question_code TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT NOT NULL,
  question_text_en TEXT NOT NULL,
  question_text_it TEXT,
  passage_id UUID REFERENCES public.passages(id),
  passage_order INTEGER,
  correct_answers JSONB NOT NULL,
  wrong_answers JSONB NOT NULL,
  solution_en TEXT NOT NULL,
  solution_it TEXT,
  it_ready BOOLEAN DEFAULT FALSE,
  times_served INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Recreate attempts without exam_type_id
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_section INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  section_scores JSONB,
  status attempt_status DEFAULT 'in_progress',
  is_free_attempt BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_question_history
CREATE TABLE public.user_question_history (
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  exam_attempt_id UUID NOT NULL REFERENCES public.attempts(id),
  PRIMARY KEY (user_id, question_id, exam_attempt_id)
);

-- Create exam_attempt_answers
CREATE TABLE public.exam_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_attempt_id UUID NOT NULL REFERENCES public.attempts(id),
  question_id UUID REFERENCES public.questions(id),
  section TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  assigned_letter TEXT NOT NULL,
  student_answer TEXT,
  options_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Passages policies
CREATE POLICY "Authenticated can read passages" ON public.passages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage passages" ON public.passages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Questions policies
CREATE POLICY "No direct read for questions" ON public.questions FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin can manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_question_history policies
CREATE POLICY "Users can read own history" ON public.user_question_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.user_question_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- exam_attempt_answers policies
CREATE POLICY "Users can read own exam answers" ON public.exam_attempt_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attempts WHERE attempts.id = exam_attempt_answers.exam_attempt_id AND attempts.user_id = auth.uid()));
CREATE POLICY "Users can insert own exam answers" ON public.exam_attempt_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.attempts WHERE attempts.id = exam_attempt_answers.exam_attempt_id AND attempts.user_id = auth.uid()));
CREATE POLICY "Users can update own exam answers" ON public.exam_attempt_answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attempts WHERE attempts.id = exam_attempt_answers.exam_attempt_id AND attempts.user_id = auth.uid()));

-- Attempts policies
CREATE POLICY "Users can create attempts" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own attempts" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own in-progress attempts" ON public.attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'in_progress');
