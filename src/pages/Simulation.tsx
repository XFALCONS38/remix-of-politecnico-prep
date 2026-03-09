import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Flag, Send } from "lucide-react";

interface ExamQuestion {
  eaa_id: string;
  question_id: string;
  section: string;
  question_order: number;
  question_text_en: string;
  passage_text_en: string | null;
  options: Record<string, string>;
  student_answer: string | null;
}

const SECTION_LABELS: Record<string, string> = {
  mathematics: "Mathematics",
  logic: "Comprehension & Logic",
  physics: "Physics",
  technical: "Technical Knowledge",
};

const SECTION_ORDER = ["mathematics", "logic", "physics", "technical"];

const Simulation = () => {
  const { user, hasActiveAccess } = useAuth();
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Arrow key + number key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentIdx < questions.length - 1) {
        setCurrentIdx((p) => p + 1);
      } else if (e.key === "ArrowLeft" && currentIdx > 0) {
        setCurrentIdx((p) => p - 1);
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        const letters = ["A", "B", "C", "D", "E"];
        const letter = letters[parseInt(e.key) - 1];
        const q = questions[currentIdx];
        if (q && q.options[letter]) {
          saveAnswer(q.eaa_id, letter);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIdx, questions]);

  // Load exam
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("generate-exam", {
          body: { is_free: !hasActiveAccess },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        setAttemptId(data.attempt_id);
        setQuestions(data.questions);
        setStartedAt(new Date(data.started_at));

        // Restore position if resuming
        if (data.resumed) {
          const firstUnanswered = data.questions.findIndex((q: ExamQuestion) => !q.student_answer);
          if (firstUnanswered >= 0) setCurrentIdx(firstUnanswered);
        }
      } catch (err: any) {
        setError(err.message);
        toast({ title: "Error loading exam", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, hasActiveAccess]);

  // 90-minute timer
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt.getTime()) / 1000;
      const remaining = Math.max(0, 90 * 60 - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmit(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Save answer
  const saveAnswer = useCallback(async (eaaId: string, letter: string | null) => {
    setQuestions((prev) =>
      prev.map((q) => (q.eaa_id === eaaId ? { ...q, student_answer: letter } : q))
    );
    await (supabase as any).from("exam_attempt_answers").update({ student_answer: letter }).eq("id", eaaId);
  }, []);

  // Submit exam
  const handleSubmit = async (auto = false) => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    if (auto) {
      toast({ title: "Time's up!", description: "Your exam has been automatically submitted." });
    }

    const { data, error: fnError } = await supabase.functions.invoke("score-attempt", {
      body: { attempt_id: attemptId },
    });

    if (fnError || data?.error) {
      toast({ title: "Scoring failed", description: data?.error || fnError?.message, variant: "destructive" });
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

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Preparing your exam...</div>;
  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-destructive">{error}</p>
      <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
    </div>
  );

  const currentQuestion = questions[currentIdx];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor = timeLeft <= 30 ? "text-destructive animate-pulse" : timeLeft <= 120 ? "text-destructive" : timeLeft <= 300 ? "text-warning" : "text-foreground";

  // Group questions by section for sidebar
  const sectionGroups = SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    questions: questions.filter((q) => q.section === section),
    startIdx: questions.findIndex((q) => q.section === section),
  })).filter((g) => g.questions.length > 0);

  const answeredCount = questions.filter((q) => q.student_answer).length;

  // Current passage (if any)
  const currentPassage = currentQuestion?.passage_text_en;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {SECTION_LABELS[currentQuestion?.section] ?? "Exam"}
            </span>
            <span className="text-xs text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </span>
          </div>
          <div className={cn("text-2xl font-mono font-bold tabular-nums", timerColor)}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <Button size="sm" onClick={() => handleSubmit(false)} disabled={submitting} className="gap-1">
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Submitting..." : "Submit Exam"}
          </Button>
        </div>
      </header>

      <div className="container flex gap-6 py-6">
        {/* Question nav sidebar */}
        <div className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-20 space-y-4">
            {sectionGroups.map((group) => (
              <div key={group.section}>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                  {group.label}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {group.questions.map((q, i) => {
                    const globalIdx = group.startIdx + i;
                    return (
                      <button
                        key={q.eaa_id}
                        onClick={() => setCurrentIdx(globalIdx)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors",
                          globalIdx === currentIdx && "ring-2 ring-primary",
                          q.student_answer
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground",
                          flagged.has(q.eaa_id) && "ring-2 ring-warning"
                        )}
                      >
                        {globalIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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

        {/* Question area */}
        <div className="flex-1">
          {currentQuestion && (
            <>
              {/* Passage block */}
              {currentPassage && (
                <Card className="mb-4">
                  <CardContent className="p-6">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Reading Passage</p>
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      {currentPassage}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Question {currentIdx + 1} of {questions.length}
                    </span>
                    <div className="flex items-center gap-2">
                      {currentQuestion.student_answer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveAnswer(currentQuestion.eaa_id, null)}
                          className="text-xs text-muted-foreground"
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        variant={flagged.has(currentQuestion.eaa_id) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleFlag(currentQuestion.eaa_id)}
                        className="gap-1"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        {flagged.has(currentQuestion.eaa_id) ? "Flagged" : "Flag"}
                      </Button>
                    </div>
                  </div>

                  <p className="mb-6 text-lg font-medium leading-relaxed">
                    {currentQuestion.question_text_en}
                  </p>

                  <div className="space-y-2">
                    {["A", "B", "C", "D", "E"].map((letter) => {
                      const text = currentQuestion.options[letter];
                      if (!text) return null;
                      const isSelected = currentQuestion.student_answer === letter;
                      return (
                        <button
                          key={letter}
                          onClick={() => saveAnswer(currentQuestion.eaa_id, letter)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "hover:bg-secondary"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : ""
                            )}
                          >
                            {letter}
                          </span>
                          <span>{text}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <Button
                      variant="outline"
                      disabled={currentIdx === 0}
                      onClick={() => setCurrentIdx((p) => p - 1)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <Button
                      disabled={currentIdx === questions.length - 1}
                      onClick={() => setCurrentIdx((p) => p + 1)}
                    >
                      Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Simulation;
