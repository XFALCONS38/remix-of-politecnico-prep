
-- Step 2: Full PolitoSim Database Schema

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'completed', 'auto_submitted');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled');

-- Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  access_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Exam types table
CREATE TABLE public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scoring_rules JSONB NOT NULL,
  is_free_tier BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions table (exact structure requested)
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0 AND correct_option_index <= 4),
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attempts table
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type_id UUID NOT NULL REFERENCES public.exam_types(id),
  current_section INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  section_scores JSONB,
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  is_free_attempt BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Answers table
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id),
  selected_option_index INTEGER,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  access_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_expiry TIMESTAMPTZ NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security View: questions_public (hides correct_option_index and explanation)
CREATE VIEW public.questions_public
WITH (security_invoker = on) AS
SELECT id, section, question_text, image_url, options, difficulty, created_at
FROM public.questions;

-- Helper function: has_role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: has_active_access (security definer)
CREATE OR REPLACE FUNCTION public.has_active_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND access_expiry > now()
  )
$$;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_attempts_user_id ON public.attempts(user_id);
CREATE INDEX idx_answers_attempt_id ON public.answers(attempt_id);
CREATE INDEX idx_questions_section ON public.questions(section);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_session ON public.subscriptions(stripe_session_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- RLS: Enable on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS: user_roles (admin only)
CREATE POLICY "Admin can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: exam_types (authenticated can read)
CREATE POLICY "Authenticated users can read exam types" ON public.exam_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage exam types" ON public.exam_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: questions (deny direct SELECT, use view; admin can write)
CREATE POLICY "No direct read for questions" ON public.questions FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admin can manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Service role bypasses RLS for edge function scoring

-- RLS: attempts
CREATE POLICY "Users can read own attempts" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create attempts" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own in-progress attempts" ON public.attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'in_progress');

-- RLS: answers
CREATE POLICY "Users can read own answers" ON public.answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attempts WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid()));
CREATE POLICY "Users can insert answers for own in-progress attempts" ON public.answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.attempts WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid() AND attempts.status = 'in_progress'));
CREATE POLICY "Users can update answers for own in-progress attempts" ON public.answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attempts WHERE attempts.id = answers.attempt_id AND attempts.user_id = auth.uid() AND attempts.status = 'in_progress'));

-- RLS: subscriptions (users read own; writes via edge functions only)
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Seed: TIL-I Engineering exam type
INSERT INTO public.exam_types (name, scoring_rules, is_free_tier) VALUES (
  'TIL-I Engineering',
  '{
    "correct": 1.0,
    "wrong": -0.25,
    "blank": 0.0,
    "sections": [
      {"name": "math", "label": "Mathematics", "question_count": 16, "time_minutes": 36},
      {"name": "logic", "label": "Comprehension & Logic", "question_count": 10, "time_minutes": 20},
      {"name": "physics", "label": "Physics", "question_count": 10, "time_minutes": 22},
      {"name": "tech", "label": "Technical Knowledge", "question_count": 6, "time_minutes": 12}
    ],
    "thresholds": {
      "fail": 30.0,
      "waitlist": 60.0
    }
  }'::jsonb,
  true
);

-- Seed: 42 sample questions

-- MATH (16 questions)
INSERT INTO public.questions (section, question_text, options, correct_option_index, explanation, difficulty) VALUES
('math', 'What is the value of sin(30°)?', '["0", "1/2", "√2/2", "√3/2", "1"]', 1, 'sin(30°) = 1/2 is a standard trigonometric value from the unit circle.', 'easy'),
('math', 'What is log₁₀(1000)?', '["1", "2", "3", "4", "10"]', 2, 'log₁₀(1000) = log₁₀(10³) = 3.', 'easy'),
('math', 'Solve: 2^x = 32', '["3", "4", "5", "6", "8"]', 2, '2^5 = 32, so x = 5.', 'easy'),
('math', 'What is cos(60°)?', '["0", "1/2", "√2/2", "√3/2", "1"]', 1, 'cos(60°) = 1/2 from the unit circle.', 'easy'),
('math', 'What is the area of a circle with radius 3?', '["3π", "6π", "9π", "12π", "27π"]', 2, 'A = πr² = π(3²) = 9π.', 'easy'),
('math', 'If f(x) = 2x + 3, what is f(4)?', '["8", "9", "10", "11", "12"]', 3, 'f(4) = 2(4) + 3 = 11.', 'easy'),
('math', 'What is tan(45°)?', '["0", "1/2", "1", "√3", "undefined"]', 2, 'tan(45°) = sin(45°)/cos(45°) = 1.', 'medium'),
('math', 'Simplify: ln(e²)', '["0", "1", "2", "e", "e²"]', 2, 'ln(e²) = 2·ln(e) = 2.', 'medium'),
('math', 'What is the probability of rolling a 6 on a fair die?', '["1/2", "1/3", "1/4", "1/5", "1/6"]', 4, 'A fair die has 6 equally likely outcomes, so P(6) = 1/6.', 'easy'),
('math', 'What is the derivative of x³?', '["x²", "2x²", "3x²", "3x", "x⁴/4"]', 2, 'd/dx(x³) = 3x².', 'medium'),
('math', 'A triangle has sides 3, 4, 5. What is its area?', '["5", "6", "7", "10", "12"]', 1, 'This is a right triangle (3² + 4² = 5²). Area = (1/2)(3)(4) = 6.', 'medium'),
('math', 'What is sin²(x) + cos²(x)?', '["0", "1/2", "1", "2", "sin(2x)"]', 2, 'This is the Pythagorean identity: sin²(x) + cos²(x) = 1.', 'easy'),
('math', 'Solve: |x - 3| = 5', '["x = 8 only", "x = -2 only", "x = 8 or x = -2", "x = 2 or x = -8", "No solution"]', 2, '|x - 3| = 5 → x - 3 = 5 or x - 3 = -5 → x = 8 or x = -2.', 'medium'),
('math', 'What is the sum of interior angles of a hexagon?', '["360°", "540°", "720°", "900°", "1080°"]', 2, 'Sum = (n-2)×180° = (6-2)×180° = 720°.', 'medium'),
('math', 'If P(A) = 0.3 and P(B) = 0.4 and A,B are independent, what is P(A∩B)?', '["0.07", "0.12", "0.70", "0.10", "0.35"]', 1, 'For independent events, P(A∩B) = P(A)×P(B) = 0.3×0.4 = 0.12. Wait, let me recalculate: 0.3 × 0.4 = 0.12.', 'hard'),
('math', 'What is the integral of 1/x dx?', '["x", "x²/2", "ln|x| + C", "1/x² + C", "e^x + C"]', 2, '∫(1/x)dx = ln|x| + C.', 'medium');

-- LOGIC (10 questions)
INSERT INTO public.questions (section, question_text, options, correct_option_index, explanation, difficulty) VALUES
('logic', 'All roses are flowers. Some flowers fade quickly. Which conclusion is valid?', '["All roses fade quickly", "Some roses fade quickly", "No roses fade quickly", "Some roses may fade quickly", "Roses never fade"]', 3, 'We can only conclude that some roses MAY fade quickly since some flowers do, but not all flowers.', 'medium'),
('logic', 'If it rains, the ground is wet. The ground is wet. What can we conclude?', '["It rained", "It did not rain", "It may or may not have rained", "The ground is always wet", "Rain is impossible"]', 2, 'This is the fallacy of affirming the consequent. The ground could be wet for other reasons.', 'medium'),
('logic', 'Complete the sequence: 2, 6, 18, 54, ...', '["108", "162", "72", "128", "216"]', 1, 'Each term is multiplied by 3: 2×3=6, 6×3=18, 18×3=54, 54×3=162.', 'easy'),
('logic', 'If A → B and B → C, then:', '["C → A", "A → C", "¬A → ¬C", "¬C → A", "B → A"]', 1, 'By transitivity: if A implies B and B implies C, then A implies C.', 'easy'),
('logic', 'Which number does not belong: 2, 3, 5, 7, 9, 11?', '["2", "3", "9", "7", "11"]', 2, '9 is the only composite number; all others are prime.', 'easy'),
('logic', '"No students are lazy. John is a student." What follows?', '["John is lazy", "John is not lazy", "John may be lazy", "Some students are lazy", "Nothing follows"]', 1, 'If no students are lazy and John is a student, then John is not lazy.', 'easy'),
('logic', 'A scientific text states: "All metals expand when heated." Which is a valid deduction?', '["Non-metals do not expand", "Iron expands when heated", "All things that expand are metals", "Heating always causes expansion", "Metals contract when cooled"]', 1, 'Iron is a metal, so it expands when heated. The others are invalid generalizations.', 'medium'),
('logic', 'If ¬P → Q and ¬Q, what can we conclude?', '["P", "¬P", "Q", "¬P and Q", "Nothing"]', 0, 'By modus tollens on ¬P → Q: if ¬Q then ¬(¬P) = P.', 'hard'),
('logic', 'In a group of 30 people, 18 speak English and 15 speak French. At least how many speak both?', '["0", "1", "2", "3", "5"]', 3, 'By inclusion-exclusion: at least 18 + 15 - 30 = 3 speak both.', 'medium'),
('logic', 'Statement: "If it is Sunday, the shop is closed." The shop is open. What day is it?', '["Sunday", "Not Sunday", "Monday", "Saturday", "Cannot determine the exact day"]', 4, 'By contrapositive, if the shop is open it is not Sunday. But we cannot determine the exact day.', 'medium');

-- PHYSICS (10 questions)
INSERT INTO public.questions (section, question_text, options, correct_option_index, explanation, difficulty) VALUES
('physics', 'A car accelerates from rest at 2 m/s². What is its speed after 5 seconds?', '["5 m/s", "7 m/s", "10 m/s", "15 m/s", "25 m/s"]', 2, 'v = u + at = 0 + 2(5) = 10 m/s.', 'easy'),
('physics', 'What is the SI unit of force?', '["Joule", "Watt", "Newton", "Pascal", "Kelvin"]', 2, 'Force is measured in Newtons (N) = kg·m/s².', 'easy'),
('physics', 'A 5 kg object experiences a net force of 20 N. What is its acceleration?', '["2 m/s²", "4 m/s²", "5 m/s²", "10 m/s²", "100 m/s²"]', 1, 'F = ma → a = F/m = 20/5 = 4 m/s².', 'easy'),
('physics', 'What is the pressure at a depth of 10 m in water? (ρ=1000 kg/m³, g=10 m/s²)', '["1000 Pa", "10000 Pa", "100000 Pa", "1000000 Pa", "50000 Pa"]', 2, 'P = ρgh = 1000 × 10 × 10 = 100000 Pa.', 'medium'),
('physics', 'In an ideal gas, if temperature doubles (in Kelvin) at constant volume, pressure:', '["Halves", "Stays same", "Doubles", "Quadruples", "Triples"]', 2, 'From PV = nRT, at constant V: P ∝ T. If T doubles, P doubles.', 'medium'),
('physics', 'What is the kinetic energy of a 2 kg object moving at 3 m/s?', '["3 J", "6 J", "9 J", "12 J", "18 J"]', 2, 'KE = ½mv² = ½(2)(3²) = 9 J.', 'easy'),
('physics', 'Two charges of +1C and -1C are 1m apart. The force between them is:', '["Attractive, 9×10⁹ N", "Repulsive, 9×10⁹ N", "Attractive, 9×10⁸ N", "Zero", "Repulsive, 1 N"]', 0, 'Opposite charges attract. F = kq₁q₂/r² = 9×10⁹(1)(1)/1² = 9×10⁹ N.', 'medium'),
('physics', 'A ball is thrown upward with v₀ = 20 m/s. Maximum height? (g = 10 m/s²)', '["10 m", "15 m", "20 m", "25 m", "40 m"]', 2, 'h = v₀²/(2g) = 400/20 = 20 m.', 'medium'),
('physics', 'What happens to the period of a pendulum if its length is quadrupled?', '["Halves", "Doubles", "Stays same", "Quadruples", "Triples"]', 1, 'T = 2π√(L/g). If L → 4L, T → 2T. Period doubles.', 'hard'),
('physics', 'According to Bernoulli''s principle, as fluid speed increases:', '["Pressure increases", "Pressure decreases", "Pressure stays same", "Density increases", "Temperature increases"]', 1, 'Bernoulli: P + ½ρv² + ρgh = const. Higher speed → lower pressure.', 'medium');

-- TECH (6 questions)
INSERT INTO public.questions (section, question_text, options, correct_option_index, explanation, difficulty) VALUES
('tech', 'What is the binary representation of decimal 13?', '["1011", "1101", "1110", "1010", "1111"]', 1, '13 = 8+4+1 = 1101 in binary.', 'easy'),
('tech', 'What does an AND logic gate output when both inputs are 1?', '["0", "1", "Undefined", "Depends on clock", "Alternating"]', 1, 'AND gate: output is 1 only when ALL inputs are 1.', 'easy'),
('tech', 'In orthographic projection, which view shows the object from the front?', '["Plan view", "Front elevation", "Side elevation", "Section view", "Isometric view"]', 1, 'Front elevation is the view of the object as seen from the front.', 'easy'),
('tech', 'What is the hexadecimal equivalent of binary 11111111?', '["EF", "FE", "FF", "F0", "0F"]', 2, '11111111 = FF in hexadecimal (1111 = F, 1111 = F).', 'medium'),
('tech', 'A NOT gate (inverter) with input 0 produces:', '["0", "1", "Undefined", "High impedance", "Error"]', 1, 'NOT gate inverts: input 0 → output 1.', 'easy'),
('tech', 'In technical drawing, a dashed line typically represents:', '["Visible edge", "Hidden edge", "Center line", "Dimension line", "Cutting plane"]', 1, 'Dashed lines indicate hidden or non-visible edges in technical drawings.', 'easy');
