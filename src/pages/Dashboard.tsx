import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow, isThisWeek, differenceInDays, isToday, isYesterday, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import SiteHeader from "@/components/SiteHeader";
import {
  Trophy, TrendingUp, BarChart3, CalendarDays, Play, Eye,
  ArrowUpRight, AlertTriangle, Flame, Target, Clock, Zap,
  BookOpen, Lightbulb,
} from "lucide-react";

interface Attempt {
  id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  status: string;
  is_free_attempt: boolean;
  lang: string | null;
  set_id: string | null;
  section_scores: Record<string, { correct: number; wrong: number; blank: number; score: number; total: number }> | null;
}

const SECTION_LABELS: Record<string, Record<string, string>> = {
  mathematics: { en: "Mathematics", it: "Matematica" },
  logic: { en: "Comprehension & Logic", it: "Comprensione e Logica" },
  physics: { en: "Physics", it: "Fisica" },
  technical: { en: "Technical Knowledge", it: "Conoscenze Tecniche" },
};

const UI = {
  en: {
    welcome: "Welcome back",
    proExpires: "Pro access expires",
    freePlan: "Free plan — limited to 1 simulation",
    startSim: "Start New Simulation",
    upgrade: "Upgrade to Pro",
    upgradeDesc: "Unlimited simulations, full solutions, section analytics.",
    upgradeBtn: "Upgrade — €19",
    totalExams: "Total Exams",
    bestScore: "Best Score",
    avgScore: "Avg Score",
    thisWeek: "This Week",
    scoreProgress: "Score Progress",
    moreExams: "Complete more exams to see your progress chart.",
    sectionStrengths: "Section Strengths",
    noSectionData: "No section data yet.",
    weakest: "Weakest",
    strongest: "Strongest",
    recentAttempts: "Recent Attempts",
    loading: "Loading...",
    noAttempts: "No attempts yet.",
    firstSim: "Start Your First Simulation",
    date: "Date",
    score: "Score",
    statusLabel: "Status",
    view: "View",
    continue: "Continue",
    inProgress: "In Progress",
    guaranteed: "Guaranteed",
    waitingList: "Waiting List",
    notRanked: "Not Ranked",
    streak: "Study Streak",
    days: "days",
    improvement: "Improvement",
    studyTip: "Study Tip",
    focusOn: "Focus on",
    toImprove: "to improve your overall score",
    lastExam: "Last exam",
    ago: "ago",
    keepGoing: "Keep the momentum going!",
    getStarted: "Take your first practice exam to start tracking progress!",
    quickStats: "Quick Stats",
    passRate: "Pass Rate",
    examsCompleted: "completed",
  },
  it: {
    welcome: "Bentornato",
    proExpires: "Accesso Pro scade",
    freePlan: "Piano gratuito — limitato a 1 simulazione",
    startSim: "Nuova Simulazione",
    upgrade: "Passa a Pro",
    upgradeDesc: "Simulazioni illimitate, soluzioni complete, analisi per sezione.",
    upgradeBtn: "Sblocca — €19",
    totalExams: "Esami Totali",
    bestScore: "Miglior Punteggio",
    avgScore: "Punteggio Medio",
    thisWeek: "Questa Settimana",
    scoreProgress: "Andamento Punteggio",
    moreExams: "Completa più esami per vedere il grafico.",
    sectionStrengths: "Punti di Forza per Sezione",
    noSectionData: "Nessun dato disponibile.",
    weakest: "Più debole",
    strongest: "Più forte",
    recentAttempts: "Tentativi Recenti",
    loading: "Caricamento...",
    noAttempts: "Nessun tentativo ancora.",
    firstSim: "Inizia la Prima Simulazione",
    date: "Data",
    score: "Punteggio",
    statusLabel: "Stato",
    view: "Vedi",
    continue: "Continua",
    inProgress: "In Corso",
    guaranteed: "Ammesso",
    waitingList: "Lista d'Attesa",
    notRanked: "Non in Graduatoria",
    streak: "Serie di Studio",
    days: "giorni",
    improvement: "Miglioramento",
    studyTip: "Consiglio di Studio",
    focusOn: "Concentrati su",
    toImprove: "per migliorare il punteggio",
    lastExam: "Ultimo esame",
    ago: "fa",
    keepGoing: "Continua così!",
    getStarted: "Fai il tuo primo esame per iniziare!",
    quickStats: "Statistiche Rapide",
    passRate: "Tasso Superamento",
    examsCompleted: "completati",
  },
};

const Dashboard = () => {
  const { user, profile, hasActiveAccess } = useAuth();
  const { lang } = useTheme();
  const l = UI[lang];
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("attempts")
      .select("id, started_at, submitted_at, score, status, is_free_attempt, section_scores, lang, set_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setAttempts(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const completedAttempts = useMemo(
    () => attempts.filter((a) => a.status === "completed" || a.status === "auto_submitted"),
    [attempts]
  );

  const stats = useMemo(() => {
    if (completedAttempts.length === 0) return null;
    const scores = completedAttempts.map((a) => a.score ?? 0);
    const best = Math.max(...scores);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const thisWeek = completedAttempts.filter((a) =>
      a.submitted_at ? isThisWeek(new Date(a.submitted_at)) : false
    ).length;
    const passed = scores.filter(s => s >= 60).length;
    const passRate = ((passed / scores.length) * 100).toFixed(0);
    return { total: completedAttempts.length, best, avg, thisWeek, passRate };
  }, [completedAttempts]);

  // Calculate streak
  const streak = useMemo(() => {
    if (completedAttempts.length === 0) return 0;
    const dates = completedAttempts
      .filter(a => a.submitted_at)
      .map(a => new Date(a.submitted_at!).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i);
    
    let count = 0;
    let checkDate = new Date();
    // If no exam today, start from yesterday
    if (!dates.includes(checkDate.toDateString())) {
      checkDate = subDays(checkDate, 1);
    }
    while (dates.includes(checkDate.toDateString())) {
      count++;
      checkDate = subDays(checkDate, 1);
    }
    return count;
  }, [completedAttempts]);

  // Score improvement (last 3 vs first 3)
  const improvement = useMemo(() => {
    if (completedAttempts.length < 3) return null;
    const sorted = [...completedAttempts].reverse();
    const first3 = sorted.slice(0, 3).reduce((s, a) => s + (a.score ?? 0), 0) / 3;
    const last3 = sorted.slice(-3).reduce((s, a) => s + (a.score ?? 0), 0) / 3;
    return last3 - first3;
  }, [completedAttempts]);

  const sectionStrengths = useMemo(() => {
    const sectionTotals: Record<string, { score: number; maxScore: number; count: number }> = {};
    for (const a of completedAttempts) {
      if (!a.section_scores) continue;
      for (const [section, data] of Object.entries(a.section_scores)) {
        if (!sectionTotals[section]) sectionTotals[section] = { score: 0, maxScore: 0, count: 0 };
        sectionTotals[section].score += data.score;
        sectionTotals[section].maxScore += data.total;
        sectionTotals[section].count += 1;
      }
    }
    const sections = Object.entries(sectionTotals).map(([section, data]) => ({
      section,
      label: SECTION_LABELS[section]?.[lang] ?? section,
      pct: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
    }));
    sections.sort((a, b) => b.pct - a.pct);
    return sections;
  }, [completedAttempts, lang]);

  const weakestSection = sectionStrengths.length > 0 ? sectionStrengths[sectionStrengths.length - 1] : null;

  const chartData = useMemo(() => {
    const sorted = [...completedAttempts].reverse().slice(-10);
    const maxScore = 42;
    return sorted.map((a, i) => ({
      score: a.score ?? 0,
      pct: ((a.score ?? 0) / maxScore) * 100,
      index: i,
    }));
  }, [completedAttempts]);

  const getStatusBadge = (a: Attempt) => {
    if (a.status === "in_progress") return <Badge variant="secondary">{l.inProgress}</Badge>;
    const score = a.score ?? 0;
    if (score >= 60) return <Badge className="bg-success text-success-foreground">{l.guaranteed}</Badge>;
    if (score >= 30) return <Badge className="bg-warning text-warning-foreground">{l.waitingList}</Badge>;
    return <Badge variant="destructive">{l.notRanked}</Badge>;
  };

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Student";
  const lastExam = completedAttempts[0];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showDashboard={false} />
      <main className="container py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{l.welcome}, {displayName} 👋</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {hasActiveAccess && profile?.access_expiry && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {l.proExpires} {formatDistanceToNow(new Date(profile.access_expiry), { addSuffix: true })}
                </span>
              )}
              {!hasActiveAccess && <span>{l.freePlan}</span>}
              {streak > 0 && (
                <span className="flex items-center gap-1 text-orange-500 font-medium">
                  <Flame className="h-3.5 w-3.5" /> {streak} {l.days} {l.streak.toLowerCase()}
                </span>
              )}
            </div>
          </div>
          <Link to="/simulation">
            <Button size="lg" className="w-full gap-2 sm:w-auto">
              <Play className="h-4 w-4" /> {l.startSim}
            </Button>
          </Link>
        </div>

        {/* Upgrade CTA */}
        {!hasActiveAccess && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{l.upgrade}</p>
                  <p className="text-xs text-muted-foreground">{l.upgradeDesc}</p>
                </div>
              </div>
              <Link to="/pricing"><Button size="sm" className="w-full sm:w-auto">{l.upgradeBtn}</Button></Link>
            </CardContent>
          </Card>
        )}

        {/* Quick actions: Practice + Tips */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Link to="/practice" className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{lang === "en" ? "Practice by Topic" : "Pratica per Argomento"}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === "en" ? "Untimed, randomized — clock tracks your pace." : "Senza limiti, casuali — il cronometro registra il ritmo."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/tips" className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                  <Lightbulb className="h-5 w-5 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {lang === "en" ? "Tips & Formulas" : "Suggerimenti e Formule"}
                    {!hasActiveAccess && (
                      <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">Pro</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lang === "en" ? "Strategies, tactics and formula sheets." : "Strategie, tattiche e formulari."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* No attempts state */}
        {!loading && attempts.length === 0 && (
          <Card className="mb-6">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{l.firstSim}</h2>
              <p className="text-muted-foreground text-sm mb-6">{l.getStarted}</p>
              <Link to="/simulation">
                <Button size="lg" className="gap-2"><Play className="h-4 w-4" /> {l.startSim}</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatsCard icon={BarChart3} label={l.totalExams} value={String(stats.total)} sub={`${stats.thisWeek} ${l.thisWeek.toLowerCase()}`} />
            <StatsCard icon={Trophy} label={l.bestScore} value={`${stats.best.toFixed(1)}/42`} />
            <StatsCard icon={TrendingUp} label={l.avgScore} value={`${stats.avg.toFixed(1)}/42`} sub={improvement !== null ? `${improvement > 0 ? "+" : ""}${improvement.toFixed(1)} ${l.improvement.toLowerCase()}` : undefined} />
            <StatsCard icon={Target} label={l.passRate} value={`${stats.passRate}%`} sub={`${stats.total} ${l.examsCompleted}`} />
          </div>
        )}

        {/* Study tip */}
        {weakestSection && (
          <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Zap className="h-5 w-5 text-orange-500 shrink-0" />
              <p className="text-sm">
                <span className="font-medium">{l.studyTip}:</span>{" "}
                {l.focusOn} <span className="font-semibold">{weakestSection.label}</span> ({weakestSection.pct.toFixed(0)}%) {l.toImprove}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {completedAttempts.length > 0 && (
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{l.scoreProgress}</CardTitle></CardHeader>
              <CardContent>
                {chartData.length < 2 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{l.moreExams}</p>
                ) : (
                  <div className="relative h-44 w-full">
                    <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="none">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <line key={pct} x1="0" y1={150 - pct * 1.4} x2="400" y2={150 - pct * 1.4} className="stroke-border" strokeWidth="0.5" strokeDasharray="4 4" />
                      ))}
                      <polygon points={chartData.map((d, i) => `${(i / (chartData.length - 1)) * 380 + 10},${150 - d.pct * 1.4}`).join(" ") + " 390,150 10,150"} className="fill-primary/10" />
                      <polyline fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={chartData.map((d, i) => `${(i / (chartData.length - 1)) * 380 + 10},${150 - d.pct * 1.4}`).join(" ")} />
                      {chartData.map((d, i) => {
                        const x = (i / (chartData.length - 1)) * 380 + 10;
                        const y = 150 - d.pct * 1.4;
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="5" className="fill-primary" />
                            <circle cx={x} cy={y} r="3" className="fill-primary-foreground" />
                            <text x={x} y={y - 10} textAnchor="middle" className="fill-foreground text-[9px]">{d.score.toFixed(1)}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{l.sectionStrengths}</CardTitle>
              </CardHeader>
              <CardContent>
                {sectionStrengths.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{l.noSectionData}</p>
                ) : (
                  <div className="space-y-4">
                    {sectionStrengths.map((s, i) => (
                      <div key={s.section}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium">{s.label}</span>
                          <div className="flex items-center gap-2">
                            {i === 0 && sectionStrengths.length > 1 && (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <Trophy className="h-3 w-3" /> {l.strongest}
                              </span>
                            )}
                            {s.section === weakestSection?.section && sectionStrengths.length > 1 && (
                              <span className="flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3" /> {l.weakest}
                              </span>
                            )}
                            <span className="tabular-nums text-muted-foreground">{s.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <Progress value={s.pct} className={cn("h-2.5", i === 0 && "bg-green-100 [&>div]:bg-green-500")} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Attempts */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{l.recentAttempts}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{l.loading}</p>
            ) : attempts.length === 0 ? null : (
              <>
                <div className="hidden md:block">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b pb-2 text-xs font-medium text-muted-foreground">
                    <span>{l.date}</span><span>{l.score}</span><span>Set</span><span>{l.statusLabel}</span><span></span>
                  </div>
                  {attempts.map((a) => (
                    <div key={a.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 border-b py-3 last:border-0">
                      <span className="text-sm">{new Date(a.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                      <span className="text-sm tabular-nums font-medium">{a.status === "in_progress" ? "—" : `${(a.score ?? 0).toFixed(1)}/42`}</span>
                      <span className="text-xs text-muted-foreground">{a.set_id ?? "SET_01"}</span>
                      {getStatusBadge(a)}
                      <div>
                        {(a.status === "completed" || a.status === "auto_submitted") && (
                          <Link to={`/results/${a.id}`}><Button variant="outline" size="sm" className="gap-1"><Eye className="h-3.5 w-3.5" /> {l.view}</Button></Link>
                        )}
                        {a.status === "in_progress" && (
                          <Link to="/simulation"><Button size="sm" className="gap-1"><Play className="h-3.5 w-3.5" /> {l.continue}</Button></Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 md:hidden">
                  {attempts.map((a) => (
                    <div key={a.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{new Date(a.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        {getStatusBadge(a)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{a.set_id ?? "SET_01"}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-bold tabular-nums">{a.status === "in_progress" ? l.inProgress : `${(a.score ?? 0).toFixed(1)}/42`}</span>
                        {(a.status === "completed" || a.status === "auto_submitted") && (
                          <Link to={`/results/${a.id}`}><Button variant="outline" size="sm">{l.view}</Button></Link>
                        )}
                        {a.status === "in_progress" && (
                          <Link to="/simulation"><Button size="sm">{l.continue}</Button></Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

function StatsCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
          {sub && <p className="truncate text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
