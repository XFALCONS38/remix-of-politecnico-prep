import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import MathText from "@/components/MathText";
import { ArrowLeft, Lock, BookOpen } from "lucide-react";

interface Article {
  id: string; slug: string; category: string;
  title_en: string; title_it: string | null;
  body_en: string; body_it: string | null;
  display_order: number; is_published: boolean;
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  tips: { en: "Tips", it: "Consigli" },
  tricks: { en: "Tricks", it: "Trucchi" },
  tactics: { en: "Tactics", it: "Tattiche" },
  formula: { en: "Formulas", it: "Formule" },
};

export default function Tips() {
  const { lang } = useTheme();
  const { slug } = useParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("tips_articles")
        .select("*")
        .eq("is_published", true)
        .order("category")
        .order("display_order");
      if (error) {
        // RLS block returns empty data, not error — treat empty as "no Pro access"
        setDenied(true);
      } else {
        setArticles(data || []);
      }
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, Article[]>();
    for (const a of articles) {
      const arr = m.get(a.category) || [];
      arr.push(a);
      m.set(a.category, arr);
    }
    return Array.from(m.entries());
  }, [articles]);

  const active = slug ? articles.find((a) => a.slug === slug) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader showDashboard />
        <main className="container py-10 text-muted-foreground">Loading…</main>
      </div>
    );
  }

  if (!loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader showDashboard />
        <main className="container py-10 max-w-2xl">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{lang === "it" ? "Sezione Pro" : "Pro Section"}</h1>
              <p className="text-muted-foreground">
                {lang === "it"
                  ? "Tips, formule e strategie sono disponibili solo per gli abbonati Pro."
                  : "Tips, formulas and strategies are available only to Pro subscribers."}
              </p>
              <Link to="/pricing"><Button size="lg">{lang === "it" ? "Sblocca Pro" : "Unlock Pro"}</Button></Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (active) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader showDashboard />
        <main className="container py-8 max-w-3xl">
          <Link to="/tips" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {lang === "it" ? "Tutti gli articoli" : "All articles"}
          </Link>
          <Badge variant="secondary" className="mb-2">{CATEGORY_LABELS[active.category]?.[lang] || active.category}</Badge>
          <h1 className="text-3xl font-bold mb-4">{(lang === "it" && active.title_it) ? active.title_it : active.title_en}</h1>
          <Card><CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
            <MathText text={(lang === "it" && active.body_it) ? active.body_it : active.body_en} />
          </CardContent></Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showDashboard />
      <main className="container py-8 max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{lang === "it" ? "Tips e Formule" : "Tips & Formulas"}</h1>
        </div>
        <div className="space-y-6">
          {grouped.map(([cat, arts]) => (
            <Card key={cat}>
              <CardHeader><CardTitle className="text-lg">{CATEGORY_LABELS[cat]?.[lang] || cat}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-2">
                  {arts.map((a) => (
                    <Link key={a.id} to={`/tips/${a.slug}`}>
                      <Button variant="outline" className="w-full justify-start truncate">
                        {(lang === "it" && a.title_it) ? a.title_it : a.title_en}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
