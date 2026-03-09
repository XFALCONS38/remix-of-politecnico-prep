import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronLeft, ChevronRight, Flag } from "lucide-react";

interface Section {
  name: string;
  label: string;
  question_count: number;
  time_minutes: number;
}

interface Question {
  id: string;
  section: string;
  question_text: string;
  image_url: string | null;
  options: string[];
  difficulty: string;
}

const SECTIONS: Section[] = [
  { name: "math", label: "Mathematics", question_count: 16, time_minutes: 36 },
  { name: "logic", label: "Comprehension & Logic", question_count: 10, time_minutes: 20 },
  { name: "physics", label: "Physics", question_count: 10, time_minutes: 22 },
  { name: "tech", label: "Technical Knowledge", question_count: 6, time_minutes: 12 },
];

const Simulation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [sectionStartTime, setSectionStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const questionStartRef = useRef(Date.now());

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentQuestionIdx < questions.length - 1) {
        setCurrentQuestionIdx((p) => p + 1);
        questionStartRef.current = Date.now();
      } else if (e.key === "ArrowLeft" && currentQuestionIdx > 0) {
        setCurrentQuestionIdx((p) => p - 1);
        questionStartRef.current = Date.now();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestionIdx, questions.length]);

  const currentSection = SECTIONS[currentSectionIdx];

  // Initialize attempt
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      // Check for existing in-progress attempt
      const { data: existing } = await supabase
        .from("attempts")
        .select("id, current_section, started_at")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (existing) {
        setAttemptId(existing.id);
        setCurrentSectionIdx((existing.current_section ?? 1) - 1);
        setSectionStartTime(new Date(existing.started_at));
      } else {
        // Get exam type
        const { data: examType } = await supabase
          .from("exam_types")
          .select("id")
          .eq("name", "TIL-I Engineering")
          .maybeSingle();

        if (!examType) { toast({ title: "Error", description: "Exam type not found", variant: "destructive" }); return; }

        // Check free attempt
        const { count } = await supabase
          .from("attempts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        const isFree = (count ?? 0) === 0;

        const { data: attempt, error } = await supabase
          .from("attempts")
          .insert({ user_id: user.id, exam_type_id: examType.id, is_free_attempt: isFree, current_section: 1 })
          .select("id, started_at")
          .single();

        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setAttemptId(attempt.id);
        setSectionStartTime(new Date(attempt.started_at));
      }
      setLoading(false);
    };
    init();
  }, [user]);

  // Load questions for current section
  useEffect(() => {
    if (!attemptId) return;
    const loadQuestions = async () => {
      const section = SECTIONS[currentSectionIdx];
      const { data } = await supabase
        .from("questions_public")
        .select("id, section, question_text, image_url, options, difficulty")
        .eq("section", section.name);

      if (data) {
        // Shuffle and take required count, cast options
        const shuffled = data
          .sort(() => Math.random() - 0.5)
          .slice(0, section.question_count)
          .map((q) => ({ ...q, options: q.options as unknown as string[] }));
        setQuestions(shuffled);
        setCurrentQuestionIdx(0);
        questionStartRef.current = Date.now();

        // Load existing answers for this section
        const qIds = shuffled.map((q) => q.id);
        const { data: existingAnswers } = await supabase
          .from("answers")
          .select("question_id, selected_option_index")
          .eq("attempt_id", attemptId)
          .in("question_id", qIds);

        if (existingAnswers) {
          const ansMap: Record<string, number | null> = {};
          existingAnswers.forEach((a) => { ansMap[a.question_id] = a.selected_option_index; });
          setAnswers(ansMap);
        }
      }

      // Set section start time
      setSectionStartTime(new Date());
    };
    loadQuestions();
  }, [attemptId, currentSectionIdx]);

  // Timer
  useEffect(() => {
    if (!sectionStartTime || !currentSection) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - sectionStartTime.getTime()) / 1000;
      const remaining = Math.max(0, currentSection.time_minutes * 60 - elapsed);
      setTimeLeft(Math.ceil(remaining));

      if (remaining <= 0) {
        clearInterval(interval);
        handleNextSection(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sectionStartTime, currentSectionIdx]);

  // Save answer
  const saveAnswer = useCallback(async (questionId: string, optionIndex: number | null) => {
    if (!attemptId) return;
    const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);

    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));

    await supabase.from("answers").upsert(
      { attempt_id: attemptId, question_id: questionId, selected_option_index: optionIndex, time_spent_seconds: timeSpent },
      { onConflict: "attempt_id,question_id" }
    );
  }, [attemptId]);

  // Next section
  const handleNextSection = useCallback(async (auto = false) => {
    if (!attemptId) return;

    // Save blank answers for unanswered questions
    for (const q of questions) {
      if (answers[q.id] === undefined) {
        await supabase.from("answers").upsert(
          { attempt_id: attemptId, question_id: q.id, selected_option_index: null, time_spent_seconds: 0 },
          { onConflict: "attempt_id,question_id" }
        );
      }
    }

    if (currentSectionIdx < SECTIONS.length - 1) {
      const nextSection = currentSectionIdx + 1;
      setCurrentSectionIdx(nextSection);
      setAnswers({});
      setFlagged(new Set());

      await supabase.from("attempts").update({ current_section: nextSection + 1 }).eq("id", attemptId);
      setSectionStartTime(new Date());

      if (auto) toast({ title: "Time's up!", description: `Moving to ${SECTIONS[nextSection].label}` });
    } else {
      handleSubmit();
    }
  }, [attemptId, currentSectionIdx, questions, answers]);

  // Submit
  const handleSubmit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("score-attempt", {
      body: { attempt_id: attemptId },
    });

    if (error) {
      toast({ title: "Scoring failed", description: "Please try again", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    navigate(`/results/${attemptId}`);
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Preparing your exam...</div>;

  const currentQuestion = questions[currentQuestionIdx];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor = timeLeft <= 30 ? "text-destructive animate-pulse-fast" : timeLeft <= 120 ? "text-destructive" : timeLeft <= 300 ? "text-warning" : "text-foreground";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{currentSection.label}</span>
            <span className="text-xs text-muted-foreground">
              Section {currentSectionIdx + 1}/4
            </span>
          </div>
          <div className={cn("text-2xl font-mono font-bold tabular-nums", timerColor)}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <div className="flex items-center gap-2">
            {currentSectionIdx < SECTIONS.length - 1 ? (
              <Button variant="outline" size="sm" onClick={() => handleNextSection(false)}>
                Next Section →
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Exam"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container flex gap-6 py-6">
        {/* Question nav sidebar */}
        <div className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-20 space-y-1">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">Questions</p>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => { setCurrentQuestionIdx(i); questionStartRef.current = Date.now(); }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded text-xs font-medium transition-colors",
                    i === currentQuestionIdx && "ring-2 ring-primary",
                    answers[q.id] !== undefined && answers[q.id] !== null
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                    flagged.has(q.id) && "ring-2 ring-warning"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary" /> Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-secondary" /> Unanswered
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded ring-2 ring-warning" /> Flagged
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1">
          {currentQuestion && (
            <Card>
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Question {currentQuestionIdx + 1} of {questions.length}
                  </span>
                  <Button
                    variant={flagged.has(currentQuestion.id) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className="gap-1"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {flagged.has(currentQuestion.id) ? "Flagged" : "Flag"}
                  </Button>
                </div>

                <p className="mb-6 text-lg font-medium leading-relaxed">{currentQuestion.question_text}</p>

                {currentQuestion.image_url && (
                  <img src={currentQuestion.image_url} alt="Question diagram" className="mb-6 max-h-64 rounded-lg" />
                )}

                <div className="space-y-2">
                  {(currentQuestion.options as string[]).map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => saveAnswer(currentQuestion.id, idx)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                        answers[currentQuestion.id] === idx
                          ? "border-primary bg-primary/10"
                          : "hover:bg-secondary"
                      )}
                    >
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                        answers[currentQuestion.id] === idx
                          ? "border-primary bg-primary text-primary-foreground"
                          : ""
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => { setCurrentQuestionIdx((p) => p - 1); questionStartRef.current = Date.now(); }}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <Button
                    disabled={currentQuestionIdx === questions.length - 1}
                    onClick={() => { setCurrentQuestionIdx((p) => p + 1); questionStartRef.current = Date.now(); }}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Simulation;
