import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";
import SiteHeader from "@/components/SiteHeader";
import {
  Trophy, TrendingUp, BarChart3, CalendarDays, Play, Eye,
  ArrowUpRight, AlertTriangle,
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
    return { total: completedAttempts.length, best, avg, thisWeek };
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showDashboard={false} />
      <main className="container py-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{l.welcome}, {displayName}</h1>
            {hasActiveAccess && profile?.access_expiry && (
              <p className="mt-1 text-sm text-muted-foreground">
                {l.proExpires} {formatDistanceToNow(new Date(profile.access_expiry), { addSuffix: true })}
              </p>
            )}
            {!hasActiveAccess && <p className="mt-1 text-sm text-muted-foreground">{l.freePlan}</p>}
          </div>
          <Link to="/simulation">
            <Button size="lg" className="w-full gap-2 sm:w-auto">
              <Play className="h-4 w-4" /> {l.startSim}
            </Button>
          </Link>
        </div>

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

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatsCard icon={BarChart3} label={l.totalExams} value={String(stats.total)} />
            <StatsCard icon={Trophy} label={l.bestScore} value={`${stats.best.toFixed(1)}/42`} />
            <StatsCard icon={TrendingUp} label={l.avgScore} value={`${stats.avg.toFixed(1)}/42`} />
            <StatsCard icon={CalendarDays} label={l.thisWeek} value={String(stats.thisWeek)} />
          </div>
        )}

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
              <CardHeader className="pb-2"><CardTitle className="text-base">{l.sectionStrengths}</CardTitle></CardHeader>
              <CardContent>
                {sectionStrengths.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{l.noSectionData}</p>
                ) : (
                  <div className="space-y-4">
                    {sectionStrengths.map((s) => (
                      <div key={s.section}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium">{s.label}</span>
                          <div className="flex items-center gap-2">
                            {s.section === weakestSection?.section && (
                              <span className="flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3" /> {l.weakest}
                              </span>
                            )}
                            <span className="tabular-nums text-muted-foreground">{s.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <Progress value={s.pct} className="h-2.5" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{l.recentAttempts}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{l.loading}</p>
            ) : attempts.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">{l.noAttempts}</p>
                <Link to="/simulation"><Button className="mt-4 gap-2"><Play className="h-4 w-4" /> {l.firstSim}</Button></Link>
              </div>
            ) : (
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

function StatsCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
