import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttemptData {
  id: string;
  score: number;
  section_scores: Record<string, { correct: number; wrong: number; blank: number; score: number; total: number }>;
  status: string;
  submitted_at: string;
  is_free_attempt: boolean;
}

interface AnswerData {
  id: string;
  question_id: string;
  selected_option_index: number | null;
  is_correct: boolean | null;
  time_spent_seconds: number;
  question: {
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
    section: string;
  };
}

const SECTION_LABELS: Record<string, string> = {
  math: "Mathematics",
  logic: "Comprehension & Logic",
  physics: "Physics",
  tech: "Technical Knowledge",
};

const Results = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { hasActiveAccess } = useAuth();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    const load = async () => {
      const { data: attemptData } = await supabase
        .from("attempts")
        .select("id, score, section_scores, status, submitted_at, is_free_attempt")
        .eq("id", attemptId)
        .maybeSingle();

      if (attemptData) setAttempt(attemptData as any);

      const { data: answersData } = await supabase
        .from("answers")
        .select("id, question_id, selected_option_index, is_correct, time_spent_seconds")
        .eq("attempt_id", attemptId);

      if (answersData) {
        // Fetch question details (uses service-role indirectly — we just show what we have)
        // For free users, explanations are hidden client-side
        setAnswers(answersData as any);
      }
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
  const sectionScores = attempt.section_scores as Record<string, any> | null;

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
                {Object.entries(sectionScores).map(([section, data]: [string, any]) => (
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

        {/* Paywall CTA for free users */}
        {!hasActiveAccess && (
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

        {/* Question Review */}
        <Card>
          <CardHeader><CardTitle>Question Review</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {answers.map((a, i) => (
                <div key={a.id} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    {a.is_correct === true && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {a.is_correct === false && <XCircle className="h-5 w-5 text-destructive" />}
                    {a.is_correct === null && <MinusCircle className="h-5 w-5 text-muted-foreground" />}
                    <span className="text-sm font-medium">Question {i + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.selected_option_index !== null
                        ? `Selected: ${String.fromCharCode(65 + a.selected_option_index)}`
                        : "Blank"}
                    </span>
                  </div>

                  {/* Explanation — blurred for free users */}
                  {!hasActiveAccess && (
                    <div className="relative mt-3">
                      <p className="select-none text-sm blur-sm">
                        This is the detailed explanation for this question. Upgrade to see the full solution and understand the correct approach.
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Results;
