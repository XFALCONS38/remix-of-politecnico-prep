import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";

const FEATURES = {
  en: [
    "Unlimited simulations for 60 days",
    "Full detailed explanations for every question",
    "Per-section weakness analysis",
    "Time-per-question analytics",
    "All 42 questions per simulation",
  ],
  it: [
    "Simulazioni illimitate per 60 giorni",
    "Spiegazioni dettagliate per ogni domanda",
    "Analisi debolezze per sezione",
    "Analisi tempo per domanda",
    "Tutte le 42 domande per simulazione",
  ],
};

const Pricing = () => {
  const { user } = useAuth();
  const { lang } = useTheme();
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

  const handleCheckout = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: appliedDiscount ? { discount_code: appliedDiscount.code } : {},
    });
    setLoading(false);
    if (error || !data?.url) {
      toast({ title: "Error", description: data?.error || "Could not create checkout session", variant: "destructive" });
      return;
    }
    window.open(data.url, "_blank");
  };

  const finalPrice = appliedDiscount ? (19 * (1 - appliedDiscount.percent / 100)).toFixed(2) : "19";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showDashboard />
      <main className="container py-20 text-center">
        <h1 className="text-3xl font-bold">{lang === "it" ? "Sblocca Accesso Completo" : "Unlock Full Access"}</h1>
        <p className="mt-3 text-muted-foreground">{lang === "it" ? "Un pagamento. 60 giorni di preparazione illimitata." : "One payment. 60 days of unlimited prep."}</p>

        <Card className="mx-auto mt-10 max-w-md border-primary">
          <CardHeader>
            <CardTitle className="text-4xl font-extrabold">
              €{finalPrice}
              {appliedDiscount && <span className="ml-2 text-lg text-muted-foreground line-through">€19</span>}
            </CardTitle>
            <CardDescription>{lang === "it" ? "60 giorni di accesso completo" : "60 days of full access"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-left">
              {FEATURES[lang].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {user && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2 text-left">{lang === "it" ? "Hai un codice sconto?" : "Have a discount code?"}</p>
                {appliedDiscount ? (
                  <div className="flex items-center justify-between rounded border border-success/50 bg-success/5 p-2 text-sm">
                    <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-success" /> <strong>{appliedDiscount.code}</strong> · −{appliedDiscount.percent}%</span>
                    <Button variant="ghost" size="sm" onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }}>×</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={lang === "it" ? "Inserisci codice" : "Enter code"}
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      className="text-sm"
                    />
                    <Button variant="outline" onClick={validateCode} disabled={validating || !discountCode.trim()}>
                      {validating ? "..." : (lang === "it" ? "Applica" : "Apply")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            {user ? (
              <Button className="w-full" size="lg" onClick={handleCheckout} disabled={loading}>
                {loading ? "Loading..." : (lang === "it" ? "Sblocca Accesso Completo" : "Unlock Full Access")}
              </Button>
            ) : (
              <Link to="/register" className="w-full">
                <Button className="w-full" size="lg">{lang === "it" ? "Registrati per Iniziare" : "Sign Up to Get Started"}</Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Pricing;
