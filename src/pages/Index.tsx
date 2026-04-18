import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Target, Shield, Sparkles, GraduationCap, BarChart3, Star } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const t = {
  en: {
    badge: "TIL-I PoliTo Preparation",
    h1a: "Master the TIL-I.",
    h1b: " Know exactly where you'll score.",
    accent: "exactly",
    sub: "The only platform that simulates the real TIL-I exam — 42 questions, 90 minutes, official scoring — and tells you precisely where you stand against 3 years of PoliTo admission data.",
    primaryCta: "Get Started Free",
    secondaryCta: "Start Free Mock",
    statsLabel: ["Students", "Success Rate", "Complete Sets", "Years of Data"],
    statsValue: ["12,000+", "92%", "5+", "3"],
    f1t: "Question Bank",
    f1d: "Hundreds of TIL-I-calibrated questions across math, logic, physics, and technical knowledge.",
    f2t: "Real-time Analytics",
    f2d: "Per-section accuracy, weak-topic flags, and admission probability based on official thresholds.",
    f3t: "Expert Solutions",
    f3d: "Step-by-step LaTeX-rendered solutions for every question — written by PoliTo tutors.",
    bannerH: "92% of our students score above the admission threshold.",
    bannerS: "Train where you're weak. Confirm what you know. Walk into the TIL-I confident.",
    finalH: "Ready to know your real TIL-I score?",
    finalCtaA: "Start Free Mock",
    finalCtaB: "Go Pro",
  },
  it: {
    badge: "Preparazione TIL-I PoliTo",
    h1a: "Padroneggia il TIL-I.",
    h1b: " Sai esattamente quanto otterrai.",
    accent: "esattamente",
    sub: "L'unica piattaforma che simula il vero esame TIL-I — 42 domande, 90 minuti, punteggio ufficiale — e ti dice precisamente dove ti collochi rispetto a 3 anni di dati di ammissione PoliTo.",
    primaryCta: "Inizia Gratis",
    secondaryCta: "Prova Mock Gratis",
    statsLabel: ["Studenti", "Successo", "Set Completi", "Anni di Dati"],
    statsValue: ["12,000+", "92%", "5+", "3"],
    f1t: "Banca Domande",
    f1d: "Centinaia di domande calibrate sul TIL-I tra matematica, logica, fisica e cultura tecnica.",
    f2t: "Analisi in Tempo Reale",
    f2d: "Accuratezza per sezione, segnalazioni argomenti deboli e probabilità di ammissione.",
    f3t: "Soluzioni Esperte",
    f3d: "Soluzioni passo-passo con LaTeX per ogni domanda — scritte da tutor PoliTo.",
    bannerH: "92% dei nostri studenti supera la soglia di ammissione.",
    bannerS: "Allenati dove sei debole. Conferma ciò che sai. Entra nel TIL-I con sicurezza.",
    finalH: "Pronto a conoscere il tuo vero punteggio TIL-I?",
    finalCtaA: "Mock Gratis",
    finalCtaB: "Passa a Pro",
  },
};

const Index = () => {
  const { user } = useAuth();
  const { lang } = useTheme();
  const l = t[lang];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-12">
          {/* Left dark panel */}
          <div className="lg:col-span-7 rounded-[10px] bg-primary text-primary-foreground p-8 md:p-12 relative overflow-hidden">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5 text-emerald" />
              <span className="tracking-wide uppercase">{l.badge}</span>
            </div>
            <h1 className="font-['Poppins'] text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight">
              {l.h1a}
              <br />
              <span>{l.h1b.split(l.accent)[0]}</span>
              <span className="text-emerald">{l.accent}</span>
              <span>{l.h1b.split(l.accent)[1]}</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-primary-foreground/70 max-w-xl">{l.sub}</p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link to={user ? "/exams" : "/register"}>
                <Button variant="emerald" size="lg" className="gap-2 w-full sm:w-auto">
                  {l.primaryCta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/exam/guest">
                <Button size="lg" className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 w-full sm:w-auto">
                  {l.secondaryCta}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right panel — floating product preview */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="rounded-[10px] bg-card p-6 shadow-float-lg w-full max-w-md transform rotate-[-2deg]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mock Exam</span>
                <span className="rounded-full bg-emerald/10 text-emerald px-2 py-0.5 text-[10px] font-semibold">SET_01</span>
              </div>
              <p className="font-['Poppins'] text-lg font-semibold text-foreground">Question 12 of 42</p>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald rounded-full" style={{ width: "28%" }} />
              </div>
              <div className="mt-5 space-y-2">
                {["A", "B", "C"].map((L, i) => (
                  <div key={L} className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm ${i === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    <span className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-semibold ${i === 1 ? "bg-primary-foreground/15" : "bg-background"}`}>{L}</span>
                    <span>Option {L}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Section 1 · Math</span>
                <span className="font-mono text-emerald">22:14</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="bg-secondary">
        <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {l.statsValue.map((v, i) => (
            <div key={i} className="text-center">
              <div className="font-['Poppins'] text-3xl md:text-4xl font-semibold text-foreground">{v}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{l.statsLabel[i]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: GraduationCap, title: l.f1t, desc: l.f1d },
            { icon: BarChart3, title: l.f2t, desc: l.f2d },
            { icon: Target, title: l.f3t, desc: l.f3d },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-[10px] bg-card p-7">
              <div className="h-11 w-11 rounded-[10px] bg-emerald/10 flex items-center justify-center mb-5">
                <Icon className="h-5 w-5 text-emerald" />
              </div>
              <h3 className="font-['Poppins'] text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DARK FEATURE BANNER */}
      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 md:py-20 grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <h2 className="font-['Poppins'] text-3xl md:text-4xl font-semibold leading-tight">{l.bannerH}</h2>
            <p className="mt-4 text-primary-foreground/70 max-w-md">{l.bannerS}</p>
            <div className="mt-8 grid grid-cols-2 gap-6 max-w-md">
              <div>
                <div className="font-['Poppins'] text-3xl font-semibold text-emerald">+1.0</div>
                <div className="text-xs text-primary-foreground/60 mt-1 uppercase tracking-wide">Per Correct</div>
              </div>
              <div>
                <div className="font-['Poppins'] text-3xl font-semibold text-emerald">90 min</div>
                <div className="text-xs text-primary-foreground/60 mt-1 uppercase tracking-wide">Real Timer</div>
              </div>
            </div>
          </div>
          <div className="rounded-[10px] bg-primary-foreground/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-primary-foreground/70">Your Performance</span>
              <span className="text-emerald font-semibold">87/100</span>
            </div>
            {["Math", "Logic", "Physics", "Tech"].map((s, i) => (
              <div key={s} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-primary-foreground/80">{s}</span>
                  <span className="text-primary-foreground/60">{[92, 84, 78, 88][i]}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-primary-foreground/10 overflow-hidden">
                  <div className="h-full bg-emerald rounded-full" style={{ width: `${[92, 84, 78, 88][i]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { name: "Marco R.", faculty: "Engineering, PoliTo", quote: "I went from 42 to 78 in three weeks. The section breakdowns showed me exactly what to fix." },
            { name: "Giulia M.", faculty: "Architecture, PoliTo", quote: "Finally a TIL-I sim that matches the real timer. My exam felt like the 12th attempt." },
            { name: "Davide P.", faculty: "Engineering, PoliTo", quote: "Admission probability was within 2 points of my real result. Insane accuracy." },
          ].map((t) => (
            <div key={t.name} className="rounded-[10px] bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-emerald/15 text-emerald flex items-center justify-center font-semibold">{t.name[0]}</div>
                <div>
                  <div className="font-medium text-sm text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.faculty}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}
              </div>
              <p className="text-sm text-foreground/80 italic leading-relaxed">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container py-20 text-center">
        <h2 className="font-['Poppins'] text-3xl md:text-4xl font-semibold text-foreground max-w-2xl mx-auto">{l.finalH}</h2>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/exam/guest"><Button variant="outline" size="lg">{l.finalCtaA}</Button></Link>
          <Link to={user ? "/pricing" : "/register?plan=pro"}><Button variant="emerald" size="lg" className="gap-2">{l.finalCtaB} <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary text-primary-foreground/80">
        <div className="container py-10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="font-['Poppins'] font-semibold text-primary-foreground text-lg">TILPrep</div>
          <div className="flex gap-6 text-sm">
            <Link to="/pricing" className="hover:text-emerald transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-emerald transition-colors">Login</Link>
            <Link to="/register" className="hover:text-emerald transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
