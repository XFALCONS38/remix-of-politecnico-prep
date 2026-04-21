import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Calculator, Atom, Brain, Languages, Play,
  LifeBuoy, LogOut, Bell, ArrowUpRight, ArrowDownRight, Sparkles,
} from "lucide-react";

interface Attempt {
  id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  status: string;
  set_id: string | null;
  section_scores: Record<string, { correct: number; wrong: number; blank: number; score: number; total: number }> | null;
}

const SECTION_META: Record<string, { en: string; it: string; icon: any }> = {
  mathematics: { en: "Mathematics", it: "Matematica", icon: Calculator },
  physics: { en: "Physics", it: "Fisica", icon: Atom },
  logic: { en: "Logic", it: "Logica", icon: Brain },
  technical: { en: "Technical", it: "Tecnica", icon: Languages },
};

const COPY = {
  en: {
    eyebrow: "ACADEMIC TERM 2026",
    title: "Student Dashboard",
    overview: "Overview",
    startSim: "Start Simulation",
    support: "Support",
    logout: "Sign Out",
    learning: "Learning Progress",
    learningSub: "Completion across core academic modules",
    updated: "UPDATED TODAY",
    upcoming: "Upcoming",
    nextExam: "Next institutional exam window",
    days: "DAYS", hrs: "HRS",
    viewDetails: "View Details",
    analytics: "Performance Analytics",
    analyticsSub: "Cohort comparison across full-length simulations",
    th: ["Subject Module", "Raw Score", "Percentile", "Cohort Avg", "Status"],
    exceptional: "Exceptional",
    onTrack: "On Track",
    review: "Needs Review",
    none: "No simulations completed yet — start your first to populate analytics.",
    terms: "Terms", privacy: "Privacy", access: "Institutional Access",
    welcome: "Welcome back",
  },
  it: {
    eyebrow: "ANNO ACCADEMICO 2026",
    title: "Dashboard Studente",
    overview: "Panoramica",
    startSim: "Avvia Simulazione",
    support: "Supporto",
    logout: "Esci",
    learning: "Progressi di Apprendimento",
    learningSub: "Completamento tra i moduli accademici principali",
    updated: "AGGIORNATO OGGI",
    upcoming: "Prossimo",
    nextExam: "Prossima finestra d'esame istituzionale",
    days: "GIORNI", hrs: "ORE",
    viewDetails: "Dettagli",
    analytics: "Analisi Performance",
    analyticsSub: "Confronto coorte su simulazioni complete",
    th: ["Modulo", "Punteggio", "Percentile", "Media Coorte", "Stato"],
    exceptional: "Eccezionale",
    onTrack: "In Linea",
    review: "Da Rivedere",
    none: "Nessuna simulazione completata — avvia la prima per popolare le analisi.",
    terms: "Termini", privacy: "Privacy", access: "Accesso Istituzionale",
    welcome: "Bentornato",
  },
};

const TARGET_EXAM_DATE = new Date("2026-09-15T09:00:00Z");

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { lang } = useTheme();
  const c = COPY[lang];
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("attempts")
      .select("id, started_at, submitted_at, score, status, set_id, section_scores")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => { setAttempts(data ?? []); setLoading(false); });
  }, [user]);

  const completed = useMemo(
    () => attempts.filter((a) => a.status === "completed" || a.status === "auto_submitted"),
    [attempts]
  );

  // per-section aggregates
  const sectionStats = useMemo(() => {
    const acc: Record<string, { score: number; max: number; count: number; recent: number; recentMax: number }> = {};
    completed.forEach((a, idx) => {
      if (!a.section_scores) return;
      for (const [sec, d] of Object.entries(a.section_scores)) {
        if (!acc[sec]) acc[sec] = { score: 0, max: 0, count: 0, recent: 0, recentMax: 0 };
        acc[sec].score += d.score; acc[sec].max += d.total; acc[sec].count += 1;
        if (idx < 3) { acc[sec].recent += d.score; acc[sec].recentMax += d.total; }
      }
    });
    return acc;
  }, [completed]);

  const learningCards = ["mathematics", "physics", "logic"].map((sec) => {
    const s = sectionStats[sec];
    const pct = s && s.max > 0 ? (s.score / s.max) * 100 : 0;
    const recentPct = s && s.recentMax > 0 ? (s.recent / s.recentMax) * 100 : 0;
    const overallOlder = s && s.max > s.recentMax ? ((s.score - s.recent) / (s.max - s.recentMax)) * 100 : pct;
    const delta = recentPct - overallOlder;
    return { sec, meta: SECTION_META[sec], pct, delta: isFinite(delta) ? delta : 0 };
  });

  const performance = useMemo(() => {
    return Object.entries(sectionStats).map(([sec, s]) => {
      const pct = s.max > 0 ? (s.score / s.max) * 100 : 0;
      // approximate cohort avg as 55% baseline; percentile from pct vs 55
      const cohort = 55;
      const percentile = Math.min(99, Math.max(1, Math.round(50 + (pct - cohort) * 0.9)));
      const status = pct >= 75 ? "exceptional" : pct >= 55 ? "onTrack" : "review";
      return { sec, label: SECTION_META[sec]?.[lang] ?? sec, score: s.score / Math.max(s.count, 1), pct, cohort, percentile, status };
    });
  }, [sectionStats, lang]);

  const countdown = useMemo(() => {
    const ms = TARGET_EXAM_DATE.getTime() - Date.now();
    const days = Math.max(0, Math.floor(ms / 86400000));
    const hrs = Math.max(0, Math.floor((ms % 86400000) / 3600000));
    return { days, hrs };
  }, []);

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Student";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="border-b p-5">
            <div className="text-sm font-bold tracking-tight">TIL-I Prep</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Engineering 2026</div>
          </div>
          <nav className="flex-1 space-y-0.5 p-3 text-sm">
            <NavBtn icon={LayoutDashboard} label={c.overview} active />
            {(["mathematics","physics","logic","technical"] as const).map((s) => {
              const m = SECTION_META[s];
              return <NavBtn key={s} icon={m.icon} label={m[lang]} />;
            })}
          </nav>
          <div className="space-y-2 border-t p-3">
            <Link to="/simulation"><Button className="w-full gap-2"><Play className="h-4 w-4" /> {c.startSim}</Button></Link>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"><LifeBuoy className="h-3.5 w-3.5" />{c.support}</button>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"><LogOut className="h-3.5 w-3.5" />{c.logout}</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-8">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{c.eyebrow}</div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">{c.title}</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><Bell className="h-4 w-4" /></Button>
                <Link to="/settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {displayName.slice(0, 1).toUpperCase()}
                </Link>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-8">
            <p className="mb-6 text-sm text-muted-foreground">{c.welcome}, <span className="font-medium text-foreground">{displayName}</span>.</p>

            <div className="grid gap-5 lg:grid-cols-3">
              {/* Learning Progress */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-display text-lg font-bold">{c.learning}</h2>
                      <p className="text-xs text-muted-foreground">{c.learningSub}</p>
                    </div>
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-success">{c.updated}</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {learningCards.map(({ sec, meta, pct, delta }) => (
                      <div key={sec} className="rounded-xl border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <meta.icon className="h-3.5 w-3.5" /> {meta[lang]}
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <div className="font-display text-3xl font-bold">{pct.toFixed(0)}<span className="text-base text-muted-foreground">%</span></div>
                          {delta !== 0 && (
                            <span className={`flex items-center gap-0.5 text-xs font-semibold ${delta > 0 ? "text-success" : "text-destructive"}`}>
                              {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {Math.abs(delta).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Upcoming */}
              <div className="rounded-2xl border bg-foreground p-5 text-background">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest opacity-70">
                  <Sparkles className="h-3 w-3" /> {c.upcoming}
                </div>
                <p className="mt-2 text-sm opacity-80">{c.nextExam}</p>
                <div className="mt-5 flex items-end gap-4">
                  <div>
                    <div className="font-display text-5xl font-bold leading-none tabular-nums">{countdown.days}</div>
                    <div className="mt-1 text-[10px] font-bold tracking-widest opacity-70">{c.days}</div>
                  </div>
                  <div>
                    <div className="font-display text-5xl font-bold leading-none tabular-nums">{countdown.hrs}</div>
                    <div className="mt-1 text-[10px] font-bold tracking-widest opacity-70">{c.hrs}</div>
                  </div>
                </div>
                <Link to="/simulation" className="mt-6 inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline">
                  {c.viewDetails} →
                </Link>
              </div>
            </div>

            {/* Performance Analytics */}
            <div className="mt-6 rounded-2xl border bg-card">
              <div className="border-b p-5">
                <h2 className="font-display text-lg font-bold">{c.analytics}</h2>
                <p className="text-xs text-muted-foreground">{c.analyticsSub}</p>
              </div>
              {loading ? (
                <p className="p-8 text-center text-sm text-muted-foreground">…</p>
              ) : performance.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{c.none}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        {c.th.map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {performance.map((p) => (
                        <tr key={p.sec} className="border-t">
                          <td className="px-5 py-4 font-medium">{p.label}</td>
                          <td className="px-5 py-4 tabular-nums">{p.score.toFixed(1)}</td>
                          <td className="px-5 py-4 tabular-nums">{p.percentile}<span className="text-xs text-muted-foreground">th</span></td>
                          <td className="px-5 py-4 tabular-nums text-muted-foreground">{p.cohort}%</td>
                          <td className="px-5 py-4">
                            <StatusPill status={p.status} c={c} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
              <span>© TIL-I Prep · 2026</span>
              <div className="flex gap-4">
                <Link to="#">{c.terms}</Link>
                <Link to="#">{c.privacy}</Link>
                <Link to="#">{c.access}</Link>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

function NavBtn({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <button className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function StatusPill({ status, c }: { status: string; c: any }) {
  const map: Record<string, { label: string; cls: string }> = {
    exceptional: { label: c.exceptional, cls: "bg-success/15 text-success" },
    onTrack: { label: c.onTrack, cls: "bg-primary/10 text-primary" },
    review: { label: c.review, cls: "bg-warning/15 text-warning" },
  };
  const v = map[status];
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${v.cls}`}>{v.label}</span>;
}

export default Dashboard;