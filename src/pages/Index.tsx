import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Target, Shield } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const t = {
  en: {
    hero1: "Would you get into",
    hero2: "Politecnico di Torino",
    hero3: "today?",
    sub: "Take a free, full-length TIL-I simulation. 42 questions, 90 minutes, 4 sections with strict timers — exactly like the real exam.",
    cta: "Start Free Simulation",
    f1t: "Section Kill Switch",
    f1d: "4 timed sections with independent timers. When time's up, you move on — no going back.",
    f2t: "Admission Calculator",
    f2d: "Instant verdict: Guaranteed Admission, Waiting List, or Not Ranked — based on official thresholds.",
    f3t: "Anti-Cheat Scoring",
    f3d: "Server-side scoring with the official formula: +1 correct, -0.25 wrong, 0 blank.",
  },
  it: {
    hero1: "Saresti ammesso al",
    hero2: "Politecnico di Torino",
    hero3: "oggi?",
    sub: "Prova una simulazione TIL-I completa e gratuita. 42 domande, 90 minuti, 4 sezioni con timer — esattamente come l'esame vero.",
    cta: "Inizia Simulazione Gratuita",
    f1t: "Timer per Sezione",
    f1d: "4 sezioni con timer indipendenti. Quando il tempo scade, si passa alla sezione successiva.",
    f2t: "Calcolo Ammissione",
    f2d: "Verdetto immediato: Ammissione Garantita, Lista d'Attesa o Non in Graduatoria.",
    f3t: "Punteggio Anti-Frode",
    f3d: "Punteggio server-side con la formula ufficiale: +1 corretta, -0.25 errata, 0 vuota.",
  },
};

const Index = () => {
  const { user } = useAuth();
  const { lang } = useTheme();
  const l = t[lang];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          {l.hero1}{" "}
          <span className="text-primary">{l.hero2}</span> {l.hero3}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">{l.sub}</p>
        <div className="mt-10">
          <Link to={user ? "/simulation" : "/register"}>
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              {l.cta} <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <div className="mx-auto mt-24 grid max-w-4xl gap-8 sm:grid-cols-3">
          {[
            { icon: Clock, title: l.f1t, desc: l.f1d },
            { icon: Target, title: l.f2t, desc: l.f2d },
            { icon: Shield, title: l.f3t, desc: l.f3d },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-6 text-left">
              <Icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
