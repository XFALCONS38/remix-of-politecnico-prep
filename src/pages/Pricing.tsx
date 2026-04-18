import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Tag, Zap, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";

const COPY = {
  en: {
    flash: "⚡ Launch Special: 30% off — first 100 purchases only",
    badge: "PRICING",
    h1: "Pick the plan that fits your TIL-I plan.",
    sub: "One-time purchase. No subscriptions. No surprises.",
    discountQ: "Have a discount code?",
    apply: "Apply",
    enter: "Enter code",
    unlock: "Unlock Full Access",
    signup: "Sign Up to Get Started",
    launchTag: "LAUNCH SPECIAL",
    popular: "MOST POPULAR",
    soon: "Coming soon",
    months: "months access",
    forever: "Forever",
  },
  it: {
    flash: "⚡ Offerta Lancio: 30% di sconto — solo i primi 100",
    badge: "PREZZI",
    h1: "Scegli il piano per il tuo TIL-I.",
    sub: "Acquisto unico. Nessun abbonamento. Nessuna sorpresa.",
    discountQ: "Hai un codice sconto?",
    apply: "Applica",
    enter: "Inserisci codice",
    unlock: "Sblocca Accesso Completo",
    signup: "Registrati per Iniziare",
    launchTag: "OFFERTA LANCIO",
    popular: "PIÙ POPOLARE",
    soon: "Prossimamente",
    months: "mesi di accesso",
    forever: "Per sempre",
  },
};

interface Tier {
  name: string;
  launch: string;
  permanent: string;
  duration: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  isFree?: boolean;
}

const Pricing = () => {
  const { user } = useAuth();
  const { lang } = useTheme();
  const c = COPY[lang];
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [validating, setValidating] = useState(false);

  const validateCode = async () => {
    if (!discountCode.trim()) return;
    setValidating(true);
    const { data, error } = await (supabase as any)
      .from("discount_codes")
      .select("code, discount_percent, is_active, valid_from, valid_until, max_uses, current_uses")
      .eq("code", discountCode.trim().toUpperCase())
      .maybeSingle();
    setValidating(false);
    if (error || !data) {
      toast({ title: lang === "it" ? "Codice non valido" : "Invalid code", variant: "destructive" });
      return;
    }
    const now = new Date();
    if (!data.is_active || new Date(data.valid_from) > now || (data.valid_until && new Date(data.valid_until) < now)) {
      toast({ title: lang === "it" ? "Codice scaduto" : "Code expired", variant: "destructive" });
      return;
    }
    if (data.max_uses && data.current_uses >= data.max_uses) {
      toast({ title: lang === "it" ? "Codice esaurito" : "Code fully redeemed", variant: "destructive" });
      return;
    }
    setAppliedDiscount({ code: data.code, percent: data.discount_percent });
    toast({ title: `${data.discount_percent}% ${lang === "it" ? "applicato" : "applied"}` });
  };

  const handleCheckout = async (tier?: string) => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { ...(appliedDiscount && { discount_code: appliedDiscount.code }), ...(tier && { tier }) },
    });
    setLoading(false);
    if (error || !data?.url) {
      toast({ title: "Error", description: data?.error || "Could not create checkout session", variant: "destructive" });
      return;
    }
    window.open(data.url, "_blank");
  };

  const tiers: Tier[] = [
    {
      name: "Free",
      launch: "€0",
      permanent: "",
      duration: c.forever,
      features: ["1 mock exam set", "Score & pass/fail", "Historical percentile", "Basic section totals"],
      cta: lang === "it" ? "Inizia Gratis" : "Start Free",
      isFree: true,
    },
    {
      name: "Core",
      launch: "€34.99",
      permanent: "€49.99",
      duration: `3 ${c.months}`,
      features: ["6 mock exam sets", "Full explanations", "Admission probability", "Section breakdown"],
      cta: lang === "it" ? "Scegli Core" : "Start Core",
    },
    {
      name: "Pro",
      launch: "€44.99",
      permanent: "€64.99",
      duration: `3 ${c.months}`,
      features: ["12 mock exam sets", "Advanced analytics", "Weak area detection", "Trend tracking"],
      cta: lang === "it" ? "Passa a Pro" : "Go Pro",
      highlighted: true,
    },
    {
      name: "Pro Extended",
      launch: "€69.99",
      permanent: "€99.99",
      duration: `6 ${c.months}`,
      features: ["12 mock exam sets", "All Pro features", "Early access to new sets", "Scholarship module"],
      cta: lang === "it" ? "Pro Extended" : "Pro Extended",
    },
  ];

  const featureRows = [
    { cat: lang === "it" ? "Esami" : "Exams", rows: [
      { label: lang === "it" ? "Set di mock disponibili" : "Mock exam sets", values: ["1", "6", "12", "12"] },
      { label: lang === "it" ? "Durata accesso" : "Access duration", values: [c.forever, "3 mesi", "3 mesi", "6 mesi"] },
    ]},
    { cat: lang === "it" ? "Risultati" : "Results", rows: [
      { label: lang === "it" ? "Punteggio & pass/fail" : "Score & pass/fail", values: [true, true, true, true] },
      { label: lang === "it" ? "Probabilità ammissione" : "Admission probability", values: [false, true, true, true] },
      { label: lang === "it" ? "Spiegazioni complete" : "Full explanations", values: [false, true, true, true] },
      { label: lang === "it" ? "Analisi avanzate" : "Advanced analytics", values: [false, false, true, true] },
    ]},
    { cat: lang === "it" ? "Bonus" : "Extras", rows: [
      { label: lang === "it" ? "Modulo borse di studio" : "Scholarship module", values: [false, false, false, true] },
      { label: lang === "it" ? "Gruppo studio (soon)" : "Study group", values: ["soon", "soon", "soon", "soon"] },
    ]},
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Flash sale */}
      <div className="bg-warning text-warning-foreground text-center text-sm font-medium py-2.5 px-4">
        {c.flash}
      </div>

      <SiteHeader showDashboard />

      <main className="container py-16">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald/10 text-emerald px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5" /> {c.badge}
          </span>
          <h1 className="mt-4 font-['Poppins'] text-3xl md:text-5xl font-semibold text-foreground">{c.h1}</h1>
          <p className="mt-3 text-muted-foreground">{c.sub}</p>
        </div>

        {/* Pricing cards */}
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-[10px] p-7 flex flex-col ${
                t.highlighted ? "bg-primary text-primary-foreground lg:scale-105 shadow-float-lg" : "bg-card"
              }`}
            >
              {t.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald px-3 py-1 text-[10px] font-bold tracking-wider text-emerald-foreground">
                  {c.popular}
                </span>
              )}
              <h3 className={`font-['Poppins'] text-xl font-semibold ${t.highlighted ? "text-primary-foreground" : "text-foreground"}`}>
                {t.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className={`font-['Poppins'] text-4xl font-semibold ${t.highlighted ? "text-emerald" : "text-foreground"}`}>{t.launch}</span>
                {t.permanent && <span className={`text-sm line-through ${t.highlighted ? "text-primary-foreground/40" : "text-muted-foreground"}`}>{t.permanent}</span>}
              </div>
              {!t.isFree && (
                <span className="mt-2 inline-flex w-fit rounded-full bg-warning/15 text-warning px-2 py-0.5 text-[10px] font-bold tracking-wider">
                  {c.launchTag}
                </span>
              )}
              <p className={`mt-2 text-xs ${t.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{t.duration}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${t.highlighted ? "text-emerald" : "text-emerald"}`} />
                    <span className={t.highlighted ? "text-primary-foreground/90" : "text-foreground/80"}>{f}</span>
                  </li>
                ))}
              </ul>

              {t.isFree ? (
                <Link to={user ? "/exams" : "/register"} className="mt-7">
                  <Button variant="outline" className="w-full">{t.cta}</Button>
                </Link>
              ) : user ? (
                <Button
                  variant={t.highlighted ? "emerald" : "default"}
                  className="mt-7 w-full"
                  onClick={() => handleCheckout(t.name.toLowerCase().replace(" ", "_"))}
                  disabled={loading}
                >
                  {t.cta}
                </Button>
              ) : (
                <Link to={`/register?plan=${t.name.toLowerCase().replace(" ", "_")}`} className="mt-7">
                  <Button variant={t.highlighted ? "emerald" : "default"} className="w-full">{t.cta}</Button>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Discount code */}
        {user && (
          <div className="mt-10 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground mb-2 text-center">{c.discountQ}</p>
            {appliedDiscount ? (
              <div className="flex items-center justify-between rounded-[10px] bg-emerald/10 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-emerald">
                  <Tag className="h-4 w-4" /> <strong>{appliedDiscount.code}</strong> · −{appliedDiscount.percent}%
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }}>×</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder={c.enter}
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                />
                <Button variant="outline" onClick={validateCode} disabled={validating || !discountCode.trim()}>
                  {validating ? "..." : c.apply}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Comparison table */}
        <section className="mt-20">
          <h2 className="font-['Poppins'] text-2xl font-semibold text-foreground text-center mb-8">
            {lang === "it" ? "Confronto piani" : "Compare plans"}
          </h2>
          <div className="rounded-[10px] bg-card overflow-hidden">
            {featureRows.map((group) => (
              <div key={group.cat}>
                <div className="bg-secondary px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.cat}
                </div>
                {group.rows.map((row, ri) => (
                  <div key={row.label} className={`grid grid-cols-5 px-6 py-4 text-sm items-center ${ri % 2 === 1 ? "bg-secondary/40" : ""}`}>
                    <div className="text-foreground">{row.label}</div>
                    {row.values.map((v, i) => (
                      <div key={i} className="text-center text-muted-foreground">
                        {v === true ? <Check className="h-4 w-4 text-emerald inline" />
                          : v === false ? <Minus className="h-4 w-4 text-muted-foreground/50 inline" />
                          : v === "soon" ? <span className="text-warning italic text-xs">{c.soon}</span>
                          : <span className="text-foreground">{v}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Pricing;
