import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "@/components/MathText";

interface ReviewQuestion {
  eaa_id: string;
  question_id: string;
  section: string;
  question_order: number;
  question_text_en: string;
  topic: string;
  passage_text_en: string | null;
  options: Record<string, string>;
  assigned_letter: string;
  student_answer: string | null;
  solution_en: string | null;
}

interface AttemptData {
  id: string;
  score: number;
  section_scores: Record<string, { correct: number; wrong: number; blank: number; score: number; total: number }>;
  status: string;
  submitted_at: string;
  is_free_attempt: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  mathematics: "Mathematics",
  logic: "Comprehension & Logic",
  physics: "Physics",
  technical: "Technical Knowledge",
};

const Results = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { hasActiveAccess } = useAuth();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    const load = async () => {
      const { data, error } = await supabase.functions.invoke("get-exam-review", {
        body: { attempt_id: attemptId },
      });

      if (error || data?.error) {
        setLoading(false);
        return;
      }

      setAttempt(data.attempt);
      setQuestions(data.questions);
      setHasPaidAccess(data.has_paid_access);
      setLoading(false);
    };
    load();
  }, [attemptId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading results...</div>;
  if (!attempt) return <div className="flex min-h-screen items-center justify-center">Attempt not found</div>;

  const score = attempt.score ?? 0;
  const getVerdict = () => {
    if (score >= 60) return { label: "GUARANTEED ADMISSION", color: "bg-success text-success-foreground", message: "You are safe. Prepare your documents." };
    if (score >= 30) return { label: "WAITING LIST", color: "bg-warning text-warning-foreground", message: "Admission uncertain — depends on ranking. Keep practicing!" };
    return { label: "NOT RANKED", color: "bg-destructive text-destructive-foreground", message: `You need ${(60 - score).toFixed(2)} more points to be safe. Unlock detailed solutions now.` };
  };

  const verdict = getVerdict();
  const sectionScores = attempt.section_scores;

  // Group questions by section
  const sectionOrder = ["mathematics", "logic", "physics", "technical"];
  const groupedQuestions = sectionOrder
    .map((section) => ({
      section,
      label: SECTION_LABELS[section],
      questions: questions.filter((q) => q.section === section),
    }))
    .filter((g) => g.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">PolitoSim</Link>
          <div className="flex gap-3">
            <Link to="/dashboard"><Button variant="outline" size="sm">Dashboard</Button></Link>
            <Link to="/simulation"><Button size="sm">New Simulation</Button></Link>
          </div>
        </div>
      </header>

      <main className="container py-10">
        {/* Score Badge */}
        <div className="mb-10 text-center">
          <div className={cn("mx-auto inline-block rounded-2xl px-10 py-6", verdict.color)}>
            <p className="text-3xl font-extrabold">{verdict.label}</p>
            <p className="mt-2 text-5xl font-black">{score.toFixed(2)} / 42</p>
          </div>
          <p className="mt-4 text-lg text-muted-foreground">{verdict.message}</p>
        </div>

        {/* Section Breakdown */}
        {sectionScores && (
          <Card className="mb-8">
            <CardHeader><CardTitle>Section Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(sectionScores).map(([section, data]) => (
                  <div key={section}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{SECTION_LABELS[section] ?? section}</span>
                      <span>{data.score?.toFixed(2)} / {data.total}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(0, (data.score / data.total) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> {data.correct} correct</span>
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> {data.wrong} wrong</span>
                      <span className="flex items-center gap-1"><MinusCircle className="h-3 w-3" /> {data.blank} blank</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paywall CTA */}
        {!hasPaidAccess && (
          <Card className="mb-8 border-primary">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">Unlock Full Solutions & More Tests</p>
                  <p className="text-sm text-muted-foreground">Get detailed explanations for every question</p>
                </div>
              </div>
              <Link to="/pricing"><Button>Unlock for €19</Button></Link>
            </CardContent>
          </Card>
        )}

        {/* Question Review by Section */}
        {groupedQuestions.map((group) => (
          <Card key={group.section} className="mb-6">
            <CardHeader>
              <CardTitle>{group.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {group.questions.map((q, i) => {
                  const isCorrect = q.student_answer === q.assigned_letter;
                  const isBlank = !q.student_answer;
                  return (
                    <div key={q.eaa_id} className="rounded-lg border p-4">
                      {/* Passage */}
                      {q.passage_text_en && i === 0 && (
                        <div className="mb-4 rounded bg-muted/30 p-4">
                          <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">Reading Passage</p>
                          <p className="text-sm whitespace-pre-wrap"><MathText text={q.passage_text_en} /></p>
                        </div>
                      )}

                      <div className="mb-3 flex items-center gap-2">
                        {isBlank ? (
                          <MinusCircle className="h-5 w-5 text-muted-foreground" />
                        ) : isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <span className="text-sm font-medium">Q{q.question_order}</span>
                      </div>

                      <p className="mb-4 text-sm font-medium"><MathText text={q.question_text_en} /></p>

                      {/* Options with highlighting */}
                      <div className="space-y-1.5">
                        {["A", "B", "C", "D", "E"].map((letter) => {
                          const text = q.options[letter];
                          if (!text) return null;
                          const isCorrectOption = letter === q.assigned_letter;
                          const isStudentPick = letter === q.student_answer;
                          const isWrongPick = isStudentPick && !isCorrectOption;

                          return (
                            <div
                              key={letter}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                                isCorrectOption && "bg-success/15 text-success font-medium",
                                isWrongPick && "bg-destructive/15 text-destructive line-through",
                                !isCorrectOption && !isWrongPick && "text-muted-foreground"
                              )}
                            >
                              <span className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                                isCorrectOption && "border-success bg-success text-success-foreground",
                                isWrongPick && "border-destructive bg-destructive text-destructive-foreground"
                              )}>
                                {letter}
                              </span>
                              <span><MathText text={text} /></span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Solution */}
                      {hasPaidAccess && q.solution_en && (
                        <div className="mt-4 rounded bg-muted/30 p-3">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Solution</p>
                          <p className="text-sm whitespace-pre-wrap">{q.solution_en}</p>
                        </div>
                      )}

                      {!hasPaidAccess && (
                        <div className="relative mt-4">
                          <p className="select-none text-sm blur-sm">
                            This is the detailed explanation for this question. Upgrade to see the full solution and understand the correct approach.
                          </p>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default Results;
