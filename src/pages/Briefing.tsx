import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";

const COPY = {
  en: {
    title: "Exam Briefing",
    subtitle: "Read carefully before starting. Once you start, the timer cannot be paused.",
    rulesTitle: "Rules",
    sectionsTitle: "Sections & Time",
    scoringTitle: "Scoring",
    scoring1: "Correct answer: +1.0 point",
    scoring2: "Wrong answer: −0.25 point",
    scoring3: "Blank: 0 points",
    rule1: "Sections must be completed in order. You cannot return to a previous section.",
    rule2: "When the section timer ends, your answers are auto-saved and you advance.",
    rule3: "You may switch language anytime, but the exam language is locked at the chosen one.",
    start: "Start Exam",
    back: "Back",
    sections: [
      { name: "Mathematics", time: "36 min", count: "16 questions" },
      { name: "Comprehension & Logic", time: "20 min", count: "10 questions" },
      { name: "Physics", time: "22 min", count: "10 questions" },
      { name: "Technical Knowledge", time: "12 min", count: "6 questions" },
    ],
  },
  it: {
    title: "Briefing dell'Esame",
    subtitle: "Leggi attentamente prima di iniziare. Una volta avviato, il timer non può essere messo in pausa.",
    rulesTitle: "Regole",
    sectionsTitle: "Sezioni e Tempo",
    scoringTitle: "Punteggio",
    scoring1: "Risposta corretta: +1.0 punto",
    scoring2: "Risposta errata: −0.25 punto",
    scoring3: "In bianco: 0 punti",
    rule1: "Le sezioni devono essere completate in ordine. Non puoi tornare a una sezione precedente.",
    rule2: "Allo scadere del timer di sezione, le risposte vengono salvate e si passa avanti.",
    rule3: "Puoi cambiare lingua in qualsiasi momento, ma la lingua dell'esame è bloccata.",
    start: "Inizia Esame",
    back: "Indietro",
    sections: [
      { name: "Matematica", time: "36 min", count: "16 domande" },
      { name: "Comprensione e Logica", time: "20 min", count: "10 domande" },
      { name: "Fisica", time: "22 min", count: "10 domande" },
      { name: "Conoscenze Tecniche", time: "12 min", count: "6 domande" },
    ],
  },
};

export default function Briefing() {
  const { lang } = useTheme();
  const nav = useNavigate();
  const { setId } = useParams();
  const c = COPY[lang];

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl">
        <button onClick={() => nav(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {c.back}
        </button>

        <h1 className="text-3xl font-bold mb-2">{c.title}</h1>
        <p className="text-muted-foreground mb-6">{c.subtitle}</p>

        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{c.sectionsTitle}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {c.sections.map((s) => (
                <div key={s.name} className="rounded-md border p-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-muted-foreground">{s.count} · {s.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h2 className="font-semibold">{c.scoringTitle}</h2>
            </div>
            <ul className="space-y-1 text-sm">
              <li>{c.scoring1}</li>
              <li>{c.scoring2}</li>
              <li>{c.scoring3}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="font-semibold">{c.rulesTitle}</h2>
            </div>
            <ul className="space-y-2 text-sm list-disc pl-5">
              <li>{c.rule1}</li>
              <li>{c.rule2}</li>
              <li>{c.rule3}</li>
            </ul>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full gap-2" onClick={() => nav(`/simulation${setId ? `?set=${setId}` : ""}`)}>
          {c.start} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
