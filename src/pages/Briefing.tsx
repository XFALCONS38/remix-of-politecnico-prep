import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, ArrowRight, Settings, Layers, Target, ShieldAlert,
  ClipboardList, Clock, Plus, Minus,
} from "lucide-react";

const COPY = {
  en: {
    eyebrow: "ENTRANCE EXAMINATION",
    title: "Academic Architecture",
    description:
      "A structured 90-minute assessment across four academic disciplines. Every section is sequential and time-locked — once you advance, you cannot return.",
    statsTitle: "Examination Parameters",
    s1: "Total Questions", s1v: "42",
    s2: "Total Duration", s2v: "90 min",
    s3: "Correct Answer", s3v: "+1.0",
    s4: "Incorrect Answer", s4v: "−0.25",
    briefing: "Pre-Exam Briefing",
    briefingSub: "Read carefully — these rules apply for the entire session.",
    c1Title: "Structured Sections",
    c1Body: "Mathematics, Comprehension & Logic, Physics and Technical Knowledge are delivered in fixed order with their own timer.",
    c2Title: "Performance Threshold",
    c2Body: "Correct: +1.0 · Wrong: −0.25 · Blank: 0. A guaranteed seat sits around 60% of total points.",
    c3Title: "Proctoring Rules",
    c3Body: "Switching tabs or leaving the page does not pause the timer. Auto-submit triggers when the section clock ends.",
    confirm: "I have read and understood the briefing.",
    start: "Start Section 1: Mathematics",
    back: "Back",
    settings: "Settings",
    footerSections: ["MATHEMATICS", "PHYSICS", "LOGIC", "VERBAL"],
  },
  it: {
    eyebrow: "ESAME D'INGRESSO",
    title: "Architettura Accademica",
    description:
      "Una valutazione strutturata di 90 minuti su quattro discipline. Ogni sezione è sequenziale e a tempo — una volta avanzato, non puoi tornare indietro.",
    statsTitle: "Parametri d'Esame",
    s1: "Domande Totali", s1v: "42",
    s2: "Durata Totale", s2v: "90 min",
    s3: "Risposta Corretta", s3v: "+1.0",
    s4: "Risposta Errata", s4v: "−0.25",
    briefing: "Briefing Pre-Esame",
    briefingSub: "Leggi con attenzione — queste regole valgono per tutta la sessione.",
    c1Title: "Sezioni Strutturate",
    c1Body: "Matematica, Comprensione e Logica, Fisica e Conoscenze Tecniche sono in ordine fisso con timer dedicato.",
    c2Title: "Soglia di Performance",
    c2Body: "Corretta: +1.0 · Sbagliata: −0.25 · Bianca: 0. Il posto garantito si attesta intorno al 60% dei punti totali.",
    c3Title: "Regole di Vigilanza",
    c3Body: "Cambiare scheda o uscire dalla pagina non mette in pausa il timer. L'auto-invio scatta a fine sezione.",
    confirm: "Ho letto e compreso il briefing.",
    start: "Inizia Sezione 1: Matematica",
    back: "Indietro",
    settings: "Impostazioni",
    footerSections: ["MATEMATICA", "FISICA", "LOGICA", "VERBALE"],
  },
};

export default function Briefing() {
  const { lang } = useTheme();
  const nav = useNavigate();
  const { setId } = useParams();
  const c = COPY[lang];
  const [ack, setAck] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-7xl px-4 py-6 sm:py-8">
        <button
          onClick={() => nav(-1)}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {c.back}
        </button>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT — Academic Architecture */}
          <section>
            <span className="inline-block rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-primary">
              {c.eyebrow}
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
              {c.title}
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              {c.description}
            </p>

            <h2 className="mt-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {c.statsTitle}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat icon={ClipboardList} label={c.s1} value={c.s1v} />
              <Stat icon={Clock} label={c.s2} value={c.s2v} />
              <Stat icon={Plus} label={c.s3} value={c.s3v} accent="success" />
              <Stat icon={Minus} label={c.s4} value={c.s4v} accent="destructive" />
            </div>

            <div className="mt-8 hidden aspect-[16/9] items-center justify-center rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent lg:flex">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                  <Layers className="h-7 w-7 text-primary" />
                </div>
                <div className="text-sm font-semibold">TIL-I 2026</div>
                <div className="text-xs text-muted-foreground">Engineering Track</div>
              </div>
            </div>
          </section>

          {/* RIGHT — Pre-Exam Briefing */}
          <section>
            <div className="relative pl-5">
              <span className="absolute left-0 top-1 h-12 w-1 rounded-full bg-primary" />
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{c.briefing}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.briefingSub}</p>
            </div>

            <div className="mt-5 space-y-3">
              <BriefingCard icon={Layers} title={c.c1Title} body={c.c1Body} />
              <BriefingCard icon={Target} title={c.c2Title} body={c.c2Body} />
              <BriefingCard icon={ShieldAlert} title={c.c3Title} body={c.c3Body} />
            </div>

            <Card className="mt-5 border-2">
              <CardContent className="space-y-4 p-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} className="mt-0.5" />
                  <span className="text-sm">{c.confirm}</span>
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    size="lg"
                    disabled={!ack}
                    className="flex-1 gap-2"
                    onClick={() => nav(`/simulation${setId ? `?set=${setId}` : ""}`)}
                  >
                    {c.start} <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label={c.settings}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Footer dots */}
        <div className="mt-10 flex items-center justify-center gap-6 border-t pt-6 text-[11px] font-semibold tracking-widest text-muted-foreground">
          {c.footerSections.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={
                  "inline-block h-2 w-2 rounded-full " +
                  (i === 0 ? "bg-primary" : "bg-muted-foreground/30")
                }
              />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: {
  icon: any; label: string; value: string; accent?: "success" | "destructive";
}) {
  const tone =
    accent === "success" ? "text-success" :
    accent === "destructive" ? "text-destructive" :
    "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function BriefingCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}