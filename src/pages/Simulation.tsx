import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Flag, Send, Lock, ChevronLast } from "lucide-react";
import MathText from "@/components/MathText";

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

const SECTION_TIMES: Record<string, number> = {
  mathematics: 36 * 60,
  logic: 20 * 60,
  physics: 22 * 60,
  technical: 12 * 60,
};

const Simulation = () => {
  const { user, hasActiveAccess } = useAuth();
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kill-switch section state
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [sectionStartedAt, setSectionStartedAt] = useState<Date | null>(null);
  const [sectionTimeLeft, setSectionTimeLeft] = useState(SECTION_TIMES[SECTION_ORDER[0]]);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

  // Group questions by section
  const sectionGroups = SECTION_ORDER.map((section, idx) => ({
    section,
    idx,
    label: SECTION_LABELS[section],
    questions: questions.filter((q) => q.section === section),
  })).filter((g) => g.questions.length > 0);

  const activeSection = SECTION_ORDER[activeSectionIdx];
  const activeSectionQuestions = questions.filter((q) => q.section === activeSection);
  const currentLocalIdx = activeSectionQuestions.findIndex(
    (q) => q.eaa_id === questions[currentIdx]?.eaa_id
  );

  // Arrow key + number key navigation (within current section only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const globalIndices = activeSectionQuestions.map((q) =>
        questions.findIndex((gq) => gq.eaa_id === q.eaa_id)
      );
      const posInSection = globalIndices.indexOf(currentIdx);

      if (e.key === "ArrowRight" && posInSection < globalIndices.length - 1) {
        setCurrentIdx(globalIndices[posInSection + 1]);
      } else if (e.key === "ArrowLeft" && posInSection > 0) {
        setCurrentIdx(globalIndices[posInSection - 1]);
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
  }, [currentIdx, questions, activeSectionIdx]);

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
        setSectionStartedAt(new Date());

        if (data.resumed) {
          const firstUnanswered = data.questions.findIndex((q: ExamQuestion) => !q.student_answer);
          if (firstUnanswered >= 0) {
            // Determine which section that question belongs to
            const resumeSection = data.questions[firstUnanswered].section;
            const sectionIdx = SECTION_ORDER.indexOf(resumeSection);
            if (sectionIdx > 0) {
              setActiveSectionIdx(sectionIdx);
              setSectionTimeLeft(SECTION_TIMES[SECTION_ORDER[sectionIdx]]);
              const completed = new Set<number>();
              for (let i = 0; i < sectionIdx; i++) completed.add(i);
              setCompletedSections(completed);
            }
            setCurrentIdx(firstUnanswered);
          }
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

  // Per-section timer
  useEffect(() => {
    if (!sectionStartedAt) return;
    const sectionKey = SECTION_ORDER[activeSectionIdx];
    const totalTime = SECTION_TIMES[sectionKey];

    const interval = setInterval(() => {
      const elapsed = (Date.now() - sectionStartedAt.getTime()) / 1000;
      const remaining = Math.max(0, totalTime - elapsed);
      setSectionTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        advanceSection(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sectionStartedAt, activeSectionIdx]);

  // Advance to next section (or submit if last)
  const advanceSection = useCallback((auto = false) => {
    const nextIdx = activeSectionIdx + 1;
    if (auto) {
      toast({
        title: `Time's up for ${SECTION_LABELS[SECTION_ORDER[activeSectionIdx]]}!`,
        description: nextIdx < SECTION_ORDER.length
          ? `Moving to ${SECTION_LABELS[SECTION_ORDER[nextIdx]]}.`
          : "Submitting your exam...",
      });
    }

    setCompletedSections((prev) => new Set([...prev, activeSectionIdx]));

    if (nextIdx >= SECTION_ORDER.length) {
      // Last section done — submit
      handleSubmit(true);
      return;
    }

    setActiveSectionIdx(nextIdx);
    setSectionStartedAt(new Date());
    setSectionTimeLeft(SECTION_TIMES[SECTION_ORDER[nextIdx]]);

    // Jump to first question of next section
    const nextSection = SECTION_ORDER[nextIdx];
    const firstQ = questions.findIndex((q) => q.section === nextSection);
    if (firstQ >= 0) setCurrentIdx(firstQ);
  }, [activeSectionIdx, questions]);

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

    if (auto && activeSectionIdx >= SECTION_ORDER.length - 1) {
      toast({ title: "Exam complete!", description: "Your exam has been automatically submitted." });
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
  const minutes = Math.floor(sectionTimeLeft / 60);
  const seconds = sectionTimeLeft % 60;
  const timerColor = sectionTimeLeft <= 30 ? "text-destructive animate-pulse" : sectionTimeLeft <= 120 ? "text-destructive" : sectionTimeLeft <= 300 ? "text-warning" : "text-foreground";

  const answeredInSection = activeSectionQuestions.filter((q) => q.student_answer).length;

  // Navigation helpers within current section
  const globalIndices = activeSectionQuestions.map((q) =>
    questions.findIndex((gq) => gq.eaa_id === q.eaa_id)
  );
  const posInSection = globalIndices.indexOf(currentIdx);
  const canGoPrev = posInSection > 0;
  const canGoNext = posInSection < globalIndices.length - 1;

  const currentPassage = currentQuestion?.passage_text_en;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {SECTION_LABELS[activeSection] ?? "Exam"}
            </span>
            <span className="text-xs text-muted-foreground">
              {answeredInSection}/{activeSectionQuestions.length} answered
            </span>
          </div>
          <div className={cn("text-2xl font-mono font-bold tabular-nums", timerColor)}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <div className="flex items-center gap-2">
            {activeSectionIdx < SECTION_ORDER.length - 1 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => advanceSection(false)}
                className="gap-1"
              >
                <ChevronLast className="h-3.5 w-3.5" />
                Next Section
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleSubmit(false)} disabled={submitting} className="gap-1">
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Submitting..." : "Submit Exam"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Section tabs */}
      <div className="border-b bg-card/50">
        <div className="container flex gap-1 py-1.5 overflow-x-auto">
          {sectionGroups.map((group) => {
            const isActive = group.idx === activeSectionIdx;
            const isCompleted = completedSections.has(group.idx);
            const isLocked = group.idx > activeSectionIdx;
            const sectionAnswered = group.questions.filter((q) => q.student_answer).length;

            return (
              <button
                key={group.section}
                disabled={isLocked || isCompleted}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-muted text-muted-foreground",
                  isLocked && "text-muted-foreground/50 cursor-not-allowed",
                  !isActive && !isCompleted && !isLocked && "hover:bg-secondary"
                )}
              >
                {isLocked && <Lock className="h-3 w-3" />}
                {group.label}
                <span className="text-[10px] opacity-70">
                  ({sectionAnswered}/{group.questions.length})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="container flex gap-6 py-6">
        {/* Question nav sidebar — current section only */}
        <div className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-28 space-y-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
              {SECTION_LABELS[activeSection]}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {activeSectionQuestions.map((q, i) => {
                const globalIdx = globalIndices[i];
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
                    {i + 1}
                  </button>
                );
              })}
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

        {/* Question area */}
        <div className="flex-1">
          {currentQuestion && currentQuestion.section === activeSection && (
            <>
              {currentPassage && (
                <Card className="mb-4">
                  <CardContent className="p-6">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Reading Passage</p>
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      <MathText text={currentPassage} />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Question {posInSection + 1} of {activeSectionQuestions.length}
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
                    <MathText text={currentQuestion.question_text_en} />
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
                      disabled={!canGoPrev}
                      onClick={() => setCurrentIdx(globalIndices[posInSection - 1])}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <Button
                      disabled={!canGoNext}
                      onClick={() => setCurrentIdx(globalIndices[posInSection + 1])}
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
