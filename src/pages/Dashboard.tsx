import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Trophy,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Play,
  Eye,
  LogOut,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

interface Attempt {
  id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  status: string;
  is_free_attempt: boolean;
  section_scores: Record<string, { correct: number; wrong: number; blank: number; score: number; total: number }> | null;
}

const SECTION_LABELS: Record<string, string> = {
  mathematics: "Mathematics",
  logic: "Comprehension & Logic",
  physics: "Physics",
  technical: "Technical Knowledge",
};

const SECTION_COLORS: Record<string, string> = {
  mathematics: "bg-chart-1",
  logic: "bg-chart-2",
  physics: "bg-chart-3",
  technical: "bg-chart-4",
};

const Dashboard = () => {
  const { user, profile, hasActiveAccess, signOut } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("attempts")
      .select("id, started_at, submitted_at, score, status, is_free_attempt, section_scores")
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
      label: SECTION_LABELS[section] ?? section,
      pct: data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0,
      avgScore: data.count > 0 ? data.score / data.count : 0,
      color: SECTION_COLORS[section] ?? "bg-primary",
    }));
    sections.sort((a, b) => b.pct - a.pct);
    return sections;
  }, [completedAttempts]);

  const weakestSection = sectionStrengths.length > 0 ? sectionStrengths[sectionStrengths.length - 1] : null;

  // SVG chart data — last 10 completed attempts, oldest first
  const chartData = useMemo(() => {
    const sorted = [...completedAttempts].reverse().slice(-10);
    const maxScore = 42;
    return sorted.map((a, i) => ({
      score: a.score ?? 0,
      pct: ((a.score ?? 0) / maxScore) * 100,
      index: i,
      date: a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "",
    }));
  }, [completedAttempts]);

  const getStatusBadge = (a: Attempt) => {
    if (a.status === "in_progress") return <Badge variant="secondary">In Progress</Badge>;
    const score = a.score ?? 0;
    if (score >= 60) return <Badge className="bg-success text-success-foreground">Guaranteed</Badge>;
    if (score >= 30) return <Badge className="bg-warning text-warning-foreground">Waiting List</Badge>;
    return <Badge variant="destructive">Not Ranked</Badge>;
  };

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Student";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-foreground">
            TILPrep
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 sm:py-10">
        {/* Welcome + CTA */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {displayName}</h1>
            {hasActiveAccess && profile?.access_expiry && (
              <p className="mt-1 text-sm text-muted-foreground">
                Pro access expires {formatDistanceToNow(new Date(profile.access_expiry), { addSuffix: true })}
              </p>
            )}
            {!hasActiveAccess && (
              <p className="mt-1 text-sm text-muted-foreground">Free plan — limited to 1 simulation</p>
            )}
          </div>
          <Link to="/simulation">
            <Button size="lg" className="w-full gap-2 sm:w-auto">
              <Play className="h-4 w-4" /> Start New Simulation
            </Button>
          </Link>
        </div>

        {/* Upgrade banner (free users) */}
        {!hasActiveAccess && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Upgrade to Pro</p>
                  <p className="text-xs text-muted-foreground">Unlimited simulations, full solutions, section analytics.</p>
                </div>
              </div>
              <Link to="/pricing">
                <Button size="sm" className="w-full sm:w-auto">Upgrade — €19</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatsCard icon={BarChart3} label="Total Exams" value={String(stats.total)} />
            <StatsCard icon={Trophy} label="Best Score" value={`${stats.best.toFixed(1)}/42`} />
            <StatsCard icon={TrendingUp} label="Avg Score" value={`${stats.avg.toFixed(1)}/42`} />
            <StatsCard icon={CalendarDays} label="This Week" value={String(stats.thisWeek)} />
          </div>
        )}

        {/* Charts row */}
        {completedAttempts.length > 0 && (
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            {/* Score Progress Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length < 2 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Complete more exams to see your progress chart.
                  </p>
                ) : (
                  <div className="relative h-44 w-full">
                    <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="none">
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <line
                          key={pct}
                          x1="0"
                          y1={150 - pct * 1.4}
                          x2="400"
                          y2={150 - pct * 1.4}
                          className="stroke-border"
                          strokeWidth="0.5"
                          strokeDasharray="4 4"
                        />
                      ))}
                      {/* Area fill */}
                      <polygon
                        points={
                          chartData.map((d, i) => {
                            const x = (i / (chartData.length - 1)) * 380 + 10;
                            const y = 150 - d.pct * 1.4;
                            return `${x},${y}`;
                          }).join(" ") +
                          ` 390,150 10,150`
                        }
                        className="fill-primary/10"
                      />
                      {/* Line */}
                      <polyline
                        fill="none"
                        className="stroke-primary"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={chartData
                          .map((d, i) => {
                            const x = (i / (chartData.length - 1)) * 380 + 10;
                            const y = 150 - d.pct * 1.4;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                      {/* Dots */}
                      {chartData.map((d, i) => {
                        const x = (i / (chartData.length - 1)) * 380 + 10;
                        const y = 150 - d.pct * 1.4;
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="5" className="fill-primary" />
                            <circle cx={x} cy={y} r="3" className="fill-primary-foreground" />
                            <text
                              x={x}
                              y={y - 10}
                              textAnchor="middle"
                              className="fill-foreground text-[9px]"
                            >
                              {d.score.toFixed(1)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section Strengths */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Section Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                {sectionStrengths.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No section data yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sectionStrengths.map((s) => (
                      <div key={s.section}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium">{s.label}</span>
                          <div className="flex items-center gap-2">
                            {s.section === weakestSection?.section && (
                              <span className="flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3" /> Weakest
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

        {/* Recent Attempts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
            ) : attempts.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No attempts yet.</p>
                <Link to="/simulation">
                  <Button className="mt-4 gap-2">
                    <Play className="h-4 w-4" /> Start Your First Simulation
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b pb-2 text-xs font-medium text-muted-foreground">
                    <span>Date</span>
                    <span>Score</span>
                    <span>Status</span>
                    <span></span>
                  </div>
                  {attempts.map((a) => (
                    <div
                      key={a.id}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b py-3 last:border-0"
                    >
                      <span className="text-sm">
                        {new Date(a.started_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-sm tabular-nums font-medium">
                        {a.status === "in_progress" ? "—" : `${(a.score ?? 0).toFixed(1)}/42`}
                      </span>
                      {getStatusBadge(a)}
                      <div>
                        {(a.status === "completed" || a.status === "auto_submitted") && (
                          <Link to={`/results/${a.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          </Link>
                        )}
                        {a.status === "in_progress" && (
                          <Link to="/simulation">
                            <Button size="sm" className="gap-1">
                              <Play className="h-3.5 w-3.5" /> Continue
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {attempts.map((a) => (
                    <div key={a.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {new Date(a.started_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {getStatusBadge(a)}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-bold tabular-nums">
                          {a.status === "in_progress" ? "In progress" : `${(a.score ?? 0).toFixed(1)}/42`}
                        </span>
                        {(a.status === "completed" || a.status === "auto_submitted") && (
                          <Link to={`/results/${a.id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                        )}
                        {a.status === "in_progress" && (
                          <Link to="/simulation">
                            <Button size="sm">Continue</Button>
                          </Link>
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
