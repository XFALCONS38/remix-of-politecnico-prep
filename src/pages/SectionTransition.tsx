import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

const LABELS: Record<string, Record<string, string>> = {
  mathematics: { en: "Mathematics", it: "Matematica" },
  logic: { en: "Comprehension & Logic", it: "Comprensione e Logica" },
  physics: { en: "Physics", it: "Fisica" },
  technical: { en: "Technical Knowledge", it: "Conoscenze Tecniche" },
};

export default function SectionTransition() {
  const { lang } = useTheme();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const completed = params.get("from") || "";
  const next = params.get("to") || "";
  const [count, setCount] = useState(10);

  useEffect(() => {
    const t = setInterval(() => setCount((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (count === 0) nav(-1);
  }, [count, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold">
            {lang === "it" ? "Sezione completata" : "Section complete"}
          </h1>
          <p className="text-muted-foreground">
            {LABELS[completed]?.[lang] || completed}
          </p>
          {next && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">{lang === "it" ? "Prossima sezione" : "Next section"}</p>
              <p className="font-semibold mt-1">{LABELS[next]?.[lang] || next}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {lang === "it" ? "Avvio automatico tra" : "Auto-starting in"}{" "}
            <span className="font-mono font-bold">{count}s</span>
          </p>
          <Button className="w-full gap-2" onClick={() => nav(-1)}>
            {lang === "it" ? "Inizia ora" : "Start now"} <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
