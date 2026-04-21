import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MathText from "@/components/MathText";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, RotateCw, Timer, CheckCircle2, XCircle, Lightbulb,
  Search, Bell, Settings as SettingsIcon, BookOpen, GraduationCap,
  ClipboardList, Sigma, FolderClock, Lock, Sparkles, ArrowRight, LayoutDashboard,
} from "lucide-react";

interface PracticeQ {
  id: string; set_id: string; section: string; topic: string;
  question_code: string;
  question_text_en: string; question_text_it: string | null;
  options: Record<string, { en: string; it: string | null }>;
  assigned_letter: string;
  solution_en: string; solution_it: string | null;
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
  const { hasActiveAccess, profile } = useAuth();
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [stats, setStats] = useState<Record<string, { done: number; correct: number }>>({});
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [activeTopic, setActiveTopic] = useState<TopicRow | null>(null);
  const [q, setQ] = useState<PracticeQ | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: tData, error: tErr }, sRes] = await Promise.all([
        supabase.functions.invoke("practice-question", { body: { action: "topics" } }),
        (supabase as any).from("practice_attempts").select("topic, is_correct"),
      ]);
      if (tErr || tData?.error) toast({ title: "Error", description: tData?.error || tErr?.message, variant: "destructive" });
      else setTopics(tData.topics || []);
      const acc: Record<string, { done: number; correct: number }> = {};
      ((sRes as any).data || []).forEach((r: any) => {
        if (!r.topic) return;
        if (!acc[r.topic]) acc[r.topic] = { done: 0, correct: 0 };
        acc[r.topic].done += 1;
        if (r.is_correct) acc[r.topic].correct += 1;
      });
      setStats(acc);
      setLoadingTopics(false);
    })();
  }, []);

  useEffect(() => {
    if (!q || submitted) return;
    const i = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(i);
  }, [q, submitted]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return topics;
    return topics.filter((t) => t.topic.toLowerCase().includes(s) || t.section.toLowerCase().includes(s));
  }, [topics, search]);

  const sectionTotals = useMemo(() => {
    const m: Record<string, { count: number; done: number; correct: number }> = {};
    topics.forEach((t) => {
      if (!m[t.section]) m[t.section] = { count: 0, done: 0, correct: 0 };
      m[t.section].count += t.count;
      const s = stats[t.topic];
      if (s) { m[t.section].done += s.done; m[t.section].correct += s.correct; }
    });
    return m;
  }, [topics, stats]);

  // Auto-pick weakest section (lowest accuracy among those with attempts; else first)
  const featured = useMemo(() => {
    const sections = Object.entries(sectionTotals);
    if (!sections.length) return null;
    const withDone = sections.filter(([, s]) => s.done > 0);
    const pool = withDone.length ? withDone : sections;
    const [section, st] = pool.sort((a, b) => {
      const accA = a[1].done ? a[1].correct / a[1].done : 0;
      const accB = b[1].done ? b[1].correct / b[1].done : 0;
      return accA - accB;
    })[0];
    const completion = st.count ? Math.min(100, (st.done / st.count) * 100) : 0;
    const firstTopic = topics.find((t) => t.section === section);
    return { section, completion, count: st.count, firstTopic };
  }, [sectionTotals, topics]);

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
    } else { setQ(data.question); }
    setLoadingQ(false);
  };

  const submit = async () => {
    if (!q || !selected || submitted) return;
    const time_spent_ms = Date.now() - startedAt.current;
    setSubmitted(true);
    const isCorrect = selected === q.assigned_letter;
    setStats((s) => ({ ...s, [q.topic]: { done: (s[q.topic]?.done || 0) + 1, correct: (s[q.topic]?.correct || 0) + (isCorrect ? 1 : 0) } }));
    await supabase.functions.invoke("practice-question", {
      body: { action: "submit", question_id: q.id, section: q.section, topic: q.topic, options_snapshot: q.options, assigned_letter: q.assigned_letter, student_answer: selected, time_spent_ms },
    });
  };

  const exit = () => { setActiveTopic(null); setQ(null); setSelected(null); setSubmitted(false); };
  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Student";

  // ============ RUNNER VIEW ============
  if (activeTopic) {
    return (
      <div className="min-h-screen bg-muted/30">
        <main className="container max-w-3xl py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button onClick={exit} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {lang === "it" ? "Cambia argomento" : "Change topic"}
            </button>
            <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1 font-mono text-sm shadow-sm">
              <Timer className="h-4 w-4" /> {fmt(elapsed)}
            </span>
          </div>

          {loadingQ || !q ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{lang === "it" ? "Caricamento…" : "Loading…"}</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{SECTION_LABELS[q.section]?.[lang] || q.section}</Badge>
                  <span>{q.topic.replace(/_/g, " ")}</span>
                  <span>·</span>
                  <span>{q.question_code}</span>
                </div>
                {q.passage && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <MathText text={(lang === "it" && q.passage.it) ? q.passage.it : q.passage.en} />
                  </div>
                )}
                <div className="text-base">
                  <MathText text={(lang === "it" && q.question_text_it) ? q.question_text_it : q.question_text_en} />
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
                      <button key={letter} onClick={() => !submitted && setSelected(letter)} disabled={submitted}
                        className={`w-full rounded-md p-3 text-left transition-colors ${cls}`}>
                        <div className="flex items-start gap-3">
                          <span className="w-6 text-sm font-bold">{letter}.</span>
                          <span className="flex-1 text-sm"><MathText text={(lang === "it" && opt.it) ? opt.it : opt.en} /></span>
                          {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                          {submitted && isSel && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4" /> {lang === "it" ? "Soluzione" : "Solution"}</div>
                    <div className="text-sm"><MathText text={(lang === "it" && q.solution_it) ? q.solution_it : q.solution_en} /></div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  {!submitted ? (
                    <Button onClick={submit} disabled={!selected}>{lang === "it" ? "Invia" : "Submit"}</Button>
                  ) : (
                    <Button onClick={() => loadNext(activeTopic)} className="gap-2"><RotateCw className="h-4 w-4" /> {lang === "it" ? "Prossima" : "Next"}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  // ============ LIBRARY VIEW ============
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="border-b p-5">
            <div className="text-sm font-bold tracking-tight">Academic Architect</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Exam Prep 2026</div>
          </div>
          <nav className="flex-1 space-y-0.5 p-3 text-sm">
            <SideBtn icon={LayoutDashboard} label={lang === "it" ? "Dashboard" : "Dashboard"} to="/dashboard" />
            <SideBtn icon={GraduationCap} label={lang === "it" ? "Materie" : "Subjects"} to="/dashboard" />
            <SideBtn icon={ClipboardList} label={lang === "it" ? "Test di Pratica" : "Practice Tests"} active />
            <SideBtn icon={Sigma} label={lang === "it" ? "Banca Formule" : "Formula Bank"} to="/tips" />
            <SideBtn icon={FolderClock} label={lang === "it" ? "Archivio" : "Scholar Records"} to="/dashboard" />
          </nav>
          <div className="border-t p-3">
            <div className="mb-3 flex items-center gap-2 rounded-md bg-muted/40 p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{displayName}</div>
                <div className="text-[10px] text-muted-foreground">{hasActiveAccess ? "Pro" : "Free"}</div>
              </div>
            </div>
            {featured?.firstTopic && (
              <Button onClick={() => loadNext(featured.firstTopic!)} className="w-full gap-2"><Sparkles className="h-4 w-4" /> {lang === "it" ? "Drill Giornaliero" : "Daily Drill"}</Button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={lang === "it" ? "Cerca argomenti…" : "Search topics…"}
                  className="w-full rounded-full border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><Bell className="h-4 w-4" /></Button>
                <Link to="/settings"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><SettingsIcon className="h-4 w-4" /></Button></Link>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-8">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold sm:text-4xl">{lang === "it" ? "Libreria di Pratica" : "Practice Library"}</h1>
              <span className="mt-2 inline-block h-2.5 w-2.5 rounded-full bg-success" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {lang === "it" ? "Domande casuali per argomento. Senza limite di tempo, ma il tempo è registrato." : "Randomized questions by topic. Untimed — but every second is logged."}
            </p>

            {/* Featured */}
            {featured && (
              <Card className="mt-6 overflow-hidden border-2 border-primary/20">
                <CardContent className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <span className="inline-block rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-warning">
                      {lang === "it" ? "AVANZATO" : "ADVANCED"}
                    </span>
                    <h3 className="mt-2 font-display text-2xl font-bold">{SECTION_LABELS[featured.section]?.[lang] ?? featured.section}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lang === "it" ? "La tua sezione più debole. Inizia da qui." : "Your weakest section. Start here."}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/60">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${featured.completion}%` }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{featured.completion.toFixed(0)}%</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{featured.count} {lang === "it" ? "domande disponibili" : "questions available"}</p>
                  </div>
                  {featured.firstTopic && (
                    <Button size="lg" className="gap-2" onClick={() => loadNext(featured.firstTopic!)}>
                      {lang === "it" ? "Inizia" : "Start Drill"} <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
              {/* Topic grid */}
              <div>
                {loadingTopics ? (
                  <p className="text-sm text-muted-foreground">…</p>
                ) : filtered.length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                    {lang === "it" ? "Nessun argomento corrisponde." : "No topics match."}
                  </CardContent></Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((t) => {
                      const s = stats[t.topic];
                      const pct = s && t.count ? Math.min(100, (s.done / t.count) * 100) : 0;
                      return (
                        <div key={`${t.section}-${t.topic}`} className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
                          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {SECTION_LABELS[t.section]?.[lang] ?? t.section}
                          </span>
                          <h4 className="mt-2 font-semibold capitalize">{t.topic.replace(/_/g, " ")}</h4>
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.count} {lang === "it" ? "domande" : "questions"}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                          <Button onClick={() => loadNext(t)} variant="outline" size="sm" className="mt-3 w-full">
                            {lang === "it" ? "Inizia" : "Start Drill"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Formula Bank */}
              <div className="relative overflow-hidden rounded-2xl bg-foreground p-5 text-background">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest opacity-70">
                  <Sigma className="h-3 w-3" /> {lang === "it" ? "Banca Formule" : "Formula Bank"}
                </div>
                <h3 className="mt-2 font-display text-xl font-bold">{lang === "it" ? "Repertorio Pro" : "Pro Repository"}</h3>
                <p className="mt-1 text-xs opacity-70">{lang === "it" ? "Formule chiave, scorciatoie e tattiche d'esame." : "Key formulas, shortcuts and exam tactics."}</p>
                <ul className="mt-5 space-y-3 text-sm">
                  <li className="rounded-lg bg-background/10 p-3 font-mono text-xs">v² = u² + 2as</li>
                  <li className="rounded-lg bg-background/10 p-3 font-mono text-xs">∫ xⁿ dx = xⁿ⁺¹/(n+1)</li>
                  <li className="rounded-lg bg-background/10 p-3 font-mono text-xs">F = ma</li>
                </ul>
                <Link to="/tips" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline">
                  {lang === "it" ? "Apri Repertorio" : "Open Repository"} →
                </Link>
                {!hasActiveAccess && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/95 p-6 text-center">
                    <Lock className="mb-3 h-6 w-6 opacity-80" />
                    <p className="text-sm font-semibold">{lang === "it" ? "Solo per Pro" : "Pro members only"}</p>
                    <Link to="/pricing"><Button variant="secondary" size="sm" className="mt-3">{lang === "it" ? "Sblocca" : "Unlock Pro"}</Button></Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SideBtn({ icon: Icon, label, active, to }: { icon: any; label: string; active?: boolean; to?: string }) {
  const cls = `flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`;
  if (to && !active) return <Link to={to} className={cls}><Icon className="h-4 w-4" /> {label}</Link>;
  return <button className={cls}><Icon className="h-4 w-4" /> {label}</button>;
}