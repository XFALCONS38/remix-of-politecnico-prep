import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Flag, Send, Lock, ChevronLast, Globe, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MathText from "@/components/MathText";
import QuestionContent from "@/components/QuestionContent";

interface ExamQuestion {
  eaa_id: string;
  question_id: string;
  section: string;
  question_order: number;
  question_text_en: string;
  question_text_it: string | null;
  passage_text_en: string | null;
  passage_text_it: string | null;
  options: Record<string, string | { en: string; it: string | null }>;
  student_answer: string | null;
}

type Lang = "en" | "it";

const SECTION_LABELS: Record<string, Record<Lang, string>> = {
  mathematics: { en: "Mathematics", it: "Matematica" },
  logic: { en: "Comprehension & Logic", it: "Comprensione e Logica" },
  physics: { en: "Physics", it: "Fisica" },
  technical: { en: "Technical Knowledge", it: "Conoscenze Tecniche" },
};

const SECTION_ORDER = ["mathematics", "logic", "physics", "technical"];

const SECTION_TIMES: Record<string, number> = {
  mathematics: 36 * 60,
  logic: 20 * 60,
  physics: 22 * 60,
  technical: 12 * 60,
};

function getOptionText(opt: string | { en: string; it: string | null }, lang: Lang): string {
  if (typeof opt === "string") return opt;
  return (lang === "it" && opt.it) ? opt.it : opt.en;
}

function getQuestionText(q: ExamQuestion, lang: Lang): string {
  if (lang === "it" && q.question_text_it) return q.question_text_it;
  return q.question_text_en;
}

function getPassageText(q: ExamQuestion, lang: Lang): string | null {
  if (lang === "it" && q.passage_text_it) return q.passage_text_it;
  return q.passage_text_en;
}

function getSectionLabel(section: string, lang: Lang): string {
  return SECTION_LABELS[section]?.[lang] ?? section;
}

const Simulation = () => {
  const { user, hasActiveAccess, profile } = useAuth();
  const { lang: uiLang } = useTheme();
  const navigate = useNavigate();

  const [lang, setLang] = useState<Lang | null>(null);
  const [selectedPreLang, setSelectedPreLang] = useState<string>((profile as any)?.preferred_lang === "it" ? "it" : "en");
  const [selectedSet, setSelectedSet] = useState<string>("SET_01");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Kill-switch section state
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [sectionStartedAt, setSectionStartedAt] = useState<Date | null>(null);
  const [sectionTimeLeft, setSectionTimeLeft] = useState(SECTION_TIMES[SECTION_ORDER[0]]);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());

  // Group questions by section
  const sectionGroups = SECTION_ORDER.map((section, idx) => ({
    section,
    idx,
    label: getSectionLabel(section, lang ?? "en"),
    questions: questions.filter((q) => q.section === section),
  })).filter((g) => g.questions.length > 0);

  const activeSection = SECTION_ORDER[activeSectionIdx];
  const activeSectionQuestions = questions.filter((q) => q.section === activeSection);
  const currentLocalIdx = activeSectionQuestions.findIndex(
    (q) => q.eaa_id === questions[currentIdx]?.eaa_id
  );

  // Save answer
  const saveAnswer = useCallback(async (eaaId: string, letter: string | null) => {
    setQuestions((prev) =>
      prev.map((q) => (q.eaa_id === eaaId ? { ...q, student_answer: letter } : q))
    );
    await (supabase as any).from("exam_attempt_answers").update({ student_answer: letter }).eq("id", eaaId);
  }, []);

  // Arrow key + number key navigation (within current section only)
  useEffect(() => {
    if (!lang) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const globalIndices = activeSectionQuestions.map((q) =>
        questions.findIndex((gq) => gq.eaa_id === q.eaa_id)
      );
      const posInSection = globalIndices.indexOf(currentIdx);

      if (e.key === "ArrowRight" && posInSection < globalIndices.length - 1) {
        e.preventDefault();
        setCurrentIdx(globalIndices[posInSection + 1]);
      } else if (e.key === "ArrowLeft" && posInSection > 0) {
        e.preventDefault();
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
  }, [currentIdx, questions, activeSectionIdx, lang, activeSectionQuestions, saveAnswer]);

  // Load exam when language is selected
  useEffect(() => {
    if (!user || !lang) return;
    setLoading(true);
    const load = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("generate-exam", {
          body: { is_free: !hasActiveAccess, lang, set_id: selectedSet },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        setAttemptId(data.attempt_id);
        setQuestions(data.questions);
        setSectionStartedAt(new Date());

        if (data.resumed) {
          const firstUnanswered = data.questions.findIndex((q: ExamQuestion) => !q.student_answer);
          if (firstUnanswered >= 0) {
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
  }, [user, hasActiveAccess, lang]);

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
        title: lang === "it"
          ? `Tempo scaduto per ${getSectionLabel(SECTION_ORDER[activeSectionIdx], "it")}!`
          : `Time's up for ${getSectionLabel(SECTION_ORDER[activeSectionIdx], "en")}!`,
        description: nextIdx < SECTION_ORDER.length
          ? (lang === "it"
            ? `Passaggio a ${getSectionLabel(SECTION_ORDER[nextIdx], "it")}.`
            : `Moving to ${getSectionLabel(SECTION_ORDER[nextIdx], "en")}.`)
          : (lang === "it" ? "Consegna dell'esame..." : "Submitting your exam..."),
      });
    }

    setCompletedSections((prev) => new Set([...prev, activeSectionIdx]));

    if (nextIdx >= SECTION_ORDER.length) {
      handleSubmit(true);
      return;
    }

    setActiveSectionIdx(nextIdx);
    setSectionStartedAt(new Date());
    setSectionTimeLeft(SECTION_TIMES[SECTION_ORDER[nextIdx]]);

    const nextSection = SECTION_ORDER[nextIdx];
    const firstQ = questions.findIndex((q) => q.section === nextSection);
    if (firstQ >= 0) setCurrentIdx(firstQ);
  }, [activeSectionIdx, questions, lang]);

  // (saveAnswer moved above keyboard handler)

  // Submit exam
  const handleSubmit = async (auto = false) => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

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

  // Language + Set selection screen
  if (!lang) {
    const defaultLang = (profile as any)?.preferred_lang === "it" ? "it" : "en";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <Globe className="h-12 w-12 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              {uiLang === "it" ? "Configura il Tuo Esame" : "Configure Your Exam"}
            </h2>

            {/* Language */}
            <div className="w-full">
              <p className="mb-2 text-sm font-medium text-foreground">
                {uiLang === "it" ? "Lingua dell'esame" : "Exam Language"}
              </p>
              <div className="flex w-full gap-3">
                <Button
                  className="flex-1"
                  variant={selectedPreLang === "en" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSelectedPreLang("en")}
                >
                  🇬🇧 English
                </Button>
                <Button
                  className="flex-1"
                  variant={selectedPreLang === "it" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSelectedPreLang("it")}
                >
                  🇮🇹 Italiano
                </Button>
              </div>
            </div>

            {/* Set selection */}
            <div className="w-full">
              <p className="mb-2 text-sm font-medium text-foreground">
                {uiLang === "it" ? "Set di Domande" : "Question Set"}
              </p>
              <div className="flex w-full gap-3">
                <Button
                  className="flex-1"
                  variant={selectedSet === "SET_01" ? "default" : "outline"}
                  onClick={() => setSelectedSet("SET_01")}
                >
                  Set 1 {!hasActiveAccess ? "" : ""}
                </Button>
                <Button
                  className="flex-1"
                  variant={selectedSet === "SET_02" ? "default" : "outline"}
                  onClick={() => hasActiveAccess && setSelectedSet("SET_02")}
                  disabled={!hasActiveAccess}
                >
                  Set 2 {!hasActiveAccess && <Lock className="ml-1 h-3 w-3" />}
                </Button>
                <Button
                  className="flex-1"
                  variant={selectedSet === "SET_03" ? "default" : "outline"}
                  onClick={() => hasActiveAccess && setSelectedSet("SET_03")}
                  disabled={!hasActiveAccess}
                >
                  Set 3 {!hasActiveAccess && <Lock className="ml-1 h-3 w-3" />}
                </Button>
              </div>
              {!hasActiveAccess && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {uiLang === "it" ? "Set 2 e 3 richiedono l'accesso Pro." : "Sets 2 & 3 require Pro access."}
                </p>
              )}
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => setLang(selectedPreLang as Lang)}
            >
              {uiLang === "it" ? "Inizia Esame" : "Start Exam"}
            </Button>

            <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> {uiLang === "it" ? "Torna alla Dashboard" : "Back to Dashboard"}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{lang === "it" ? "Preparazione dell'esame..." : "Preparing your exam..."}</div>;
  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-destructive">{error}</p>
      <Button onClick={() => navigate("/dashboard")}>{lang === "it" ? "Torna alla Dashboard" : "Back to Dashboard"}</Button>
    </div>
  );

  const currentQuestion = questions[currentIdx];
  const minutes = Math.floor(sectionTimeLeft / 60);
  const seconds = sectionTimeLeft % 60;
  const timerColor = sectionTimeLeft <= 30 ? "text-destructive animate-pulse" : sectionTimeLeft <= 120 ? "text-destructive" : sectionTimeLeft <= 300 ? "text-warning" : "text-foreground";

  const answeredInSection = activeSectionQuestions.filter((q) => q.student_answer).length;

  const globalIndices = activeSectionQuestions.map((q) =>
    questions.findIndex((gq) => gq.eaa_id === q.eaa_id)
  );
  const posInSection = globalIndices.indexOf(currentIdx);
  const canGoPrev = posInSection > 0;
  const canGoNext = posInSection < globalIndices.length - 1;

  const currentPassage = currentQuestion ? getPassageText(currentQuestion, lang) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {getSectionLabel(activeSection, lang)}
            </span>
            <span className="text-xs text-muted-foreground">
              {answeredInSection}/{activeSectionQuestions.length} {lang === "it" ? "risposte" : "answered"}
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
                {lang === "it" ? "Sezione Successiva" : "Next Section"}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowSubmitDialog(true)} disabled={submitting} className="gap-1">
                <Send className="h-3.5 w-3.5" />
                {submitting ? (lang === "it" ? "Invio..." : "Submitting...") : (lang === "it" ? "Consegna Esame" : "Submit Exam")}
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
              {getSectionLabel(activeSection, lang)}
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
                <div className="h-3 w-3 rounded bg-primary" /> {lang === "it" ? "Risposta data" : "Answered"}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-secondary" /> {lang === "it" ? "Senza risposta" : "Unanswered"}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded ring-2 ring-warning" /> {lang === "it" ? "Contrassegnata" : "Flagged"}
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
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                      {lang === "it" ? "Brano di Lettura" : "Reading Passage"}
                    </p>
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                      <QuestionContent text={currentPassage} />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {lang === "it"
                        ? `Domanda ${posInSection + 1} di ${activeSectionQuestions.length}`
                        : `Question ${posInSection + 1} of ${activeSectionQuestions.length}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {currentQuestion.student_answer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveAnswer(currentQuestion.eaa_id, null)}
                          className="text-xs text-muted-foreground"
                        >
                          {lang === "it" ? "Cancella" : "Clear"}
                        </Button>
                      )}
                      <Button
                        variant={flagged.has(currentQuestion.eaa_id) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleFlag(currentQuestion.eaa_id)}
                        className="gap-1"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        {flagged.has(currentQuestion.eaa_id)
                          ? (lang === "it" ? "Contrassegnata" : "Flagged")
                          : (lang === "it" ? "Segna" : "Flag")}
                      </Button>
                    </div>
                  </div>

                  <div className="mb-6 text-lg font-medium leading-relaxed">
                    <QuestionContent text={getQuestionText(currentQuestion, lang)} />
                  </div>

                  <div className="space-y-2">
                    {["A", "B", "C", "D", "E"].map((letter) => {
                      const optVal = currentQuestion.options[letter];
                      if (!optVal) return null;
                      const text = getOptionText(optVal, lang);
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
                          <span><MathText text={text} /></span>
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
                      <ChevronLeft className="mr-1 h-4 w-4" /> {lang === "it" ? "Precedente" : "Previous"}
                    </Button>
                    <Button
                      disabled={!canGoNext}
                      onClick={() => setCurrentIdx(globalIndices[posInSection + 1])}
                    >
                      {lang === "it" ? "Successiva" : "Next"} <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "it" ? "Sei sicuro di voler consegnare?" : "Are you sure you want to submit?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const unanswered = questions.filter((q) => !q.student_answer).length;
                if (unanswered > 0) {
                  return lang === "it"
                    ? `Hai ancora ${unanswered} domande senza risposta. Le domande senza risposta non riceveranno penalità ma nemmeno punti.`
                    : `You still have ${unanswered} unanswered questions. Unanswered questions won't receive a penalty but won't earn points either.`;
                }
                return lang === "it"
                  ? "Hai risposto a tutte le domande. Vuoi consegnare l'esame?"
                  : "You've answered all questions. Ready to submit your exam?";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {lang === "it" ? "Continua Esame" : "Continue Exam"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)}>
              {lang === "it" ? "Consegna" : "Submit Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Simulation;
