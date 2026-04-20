import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SiteHeader from "@/components/SiteHeader";
import MathText from "@/components/MathText";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, RotateCw, Timer, CheckCircle2, XCircle, Lightbulb } from "lucide-react";

interface PracticeQ {
  id: string;
  set_id: string;
  section: string;
  topic: string;
  question_code: string;
  question_text_en: string;
  question_text_it: string | null;
  options: Record<string, { en: string; it: string | null }>;
  assigned_letter: string;
  solution_en: string;
  solution_it: string | null;
  passage: { en: string; it: string | null } | null;
}

interface TopicRow { section: string; topic: string; count: number }

const SECTION_LABELS: Record<string, Record<string, string>> = {
  mathematics: { en: "Mathematics", it: "Matematica" },
  logic: { en: "Logic", it: "Logica" },
  physics: { en: "Physics", it: "Fisica" },
  technical: { en: "Technical", it: "Tecnica" },
};

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Practice() {
  const { lang } = useTheme();
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [activeTopic, setActiveTopic] = useState<TopicRow | null>(null);
  const [q, setQ] = useState<PracticeQ | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const [stats, setStats] = useState({ done: 0, correct: 0 });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("practice-question", { body: { action: "topics" } });
      if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      else setTopics(data.topics || []);
      setLoadingTopics(false);
    })();
  }, []);

  useEffect(() => {
    if (!q || submitted) return;
    const i = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(i);
  }, [q, submitted]);

  const grouped = useMemo(() => {
    const m = new Map<string, TopicRow[]>();
    for (const t of topics) {
      const arr = m.get(t.section) || [];
      arr.push(t);
      m.set(t.section, arr);
    }
    return Array.from(m.entries());
  }, [topics]);

  const loadNext = async (topic: TopicRow) => {
    setActiveTopic(topic);
    setLoadingQ(true);
    setSelected(null);
    setSubmitted(false);
    setElapsed(0);
    startedAt.current = Date.now();
    const { data, error } = await supabase.functions.invoke("practice-question", {
      body: { action: "next", topic: topic.topic, section: topic.section },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      setQ(null);
    } else {
      setQ(data.question);
    }
    setLoadingQ(false);
  };

  const submit = async () => {
    if (!q || !selected || submitted) return;
    const time_spent_ms = Date.now() - startedAt.current;
    setSubmitted(true);
    const isCorrect = selected === q.assigned_letter;
    setStats((s) => ({ done: s.done + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
    await supabase.functions.invoke("practice-question", {
      body: {
        action: "submit",
        question_id: q.id,
        section: q.section,
        topic: q.topic,
        options_snapshot: q.options,
        assigned_letter: q.assigned_letter,
        student_answer: selected,
        time_spent_ms,
      },
    });
  };

  const exit = () => {
    setActiveTopic(null);
    setQ(null);
    setSelected(null);
    setSubmitted(false);
  };

  // Topic picker view
  if (!activeTopic) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader showDashboard={true} />
        <main className="container py-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{lang === "it" ? "Pratica" : "Practice"}</h1>
            <p className="text-muted-foreground mt-1">
              {lang === "it"
                ? "Domande casuali per argomento. Senza limite di tempo, ma il tempo è registrato."
                : "Randomized questions by topic. Untimed, but time is recorded."}
            </p>
          </div>
          {loadingTopics ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : grouped.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              {lang === "it" ? "Nessun argomento disponibile per il tuo piano." : "No topics available for your tier."}
            </CardContent></Card>
          ) : (
            <div className="space-y-6">
              {grouped.map(([section, ts]) => (
                <Card key={section}>
                  <CardHeader>
                    <CardTitle className="text-lg">{SECTION_LABELS[section]?.[lang] || section}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {ts.map((t) => (
                        <Button key={t.topic} variant="outline" className="justify-between" onClick={() => loadNext(t)}>
                          <span className="truncate">{t.topic.replace(/_/g, " ")}</span>
                          <Badge variant="secondary">{t.count}</Badge>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Runner view
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showDashboard={true} />
      <main className="container py-6 max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={exit} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {lang === "it" ? "Cambia argomento" : "Change topic"}
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-mono"><Timer className="h-4 w-4" /> {fmt(elapsed)}</span>
            <span className="text-muted-foreground">{stats.correct}/{stats.done}</span>
          </div>
        </div>

        {loadingQ || !q ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">{lang === "it" ? "Caricamento…" : "Loading…"}</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{SECTION_LABELS[q.section]?.[lang] || q.section}</Badge>
                <span>{q.topic.replace(/_/g, " ")}</span>
                <span>·</span>
                <span>{q.question_code}</span>
              </div>

              {q.passage && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <MathText>{(lang === "it" && q.passage.it) ? q.passage.it : q.passage.en}</MathText>
                </div>
              )}

              <div className="text-base">
                <MathText>{(lang === "it" && q.question_text_it) ? q.question_text_it : q.question_text_en}</MathText>
              </div>

              <div className="space-y-2">
                {Object.entries(q.options).map(([letter, opt]) => {
                  const isSel = selected === letter;
                  const isCorrect = letter === q.assigned_letter;
                  let cls = "border";
                  if (submitted) {
                    if (isCorrect) cls = "border-success bg-success/10";
                    else if (isSel) cls = "border-destructive bg-destructive/10";
                  } else if (isSel) cls = "border-primary bg-primary/10";
                  return (
                    <button
                      key={letter}
                      onClick={() => !submitted && setSelected(letter)}
                      disabled={submitted}
                      className={`w-full text-left rounded-md p-3 transition-colors ${cls}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm w-6">{letter}.</span>
                        <span className="flex-1 text-sm"><MathText>{(lang === "it" && opt.it) ? opt.it : opt.en}</MathText></span>
                        {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {submitted && isSel && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lightbulb className="h-4 w-4" /> {lang === "it" ? "Soluzione" : "Solution"}
                  </div>
                  <div className="text-sm">
                    <MathText>{(lang === "it" && q.solution_it) ? q.solution_it : q.solution_en}</MathText>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {!submitted ? (
                  <Button onClick={submit} disabled={!selected}>{lang === "it" ? "Invia" : "Submit"}</Button>
                ) : (
                  <Button onClick={() => loadNext(activeTopic)} className="gap-2">
                    <RotateCw className="h-4 w-4" /> {lang === "it" ? "Prossima" : "Next question"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
