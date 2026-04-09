import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
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

  const handleCheckout = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-checkout");
    setLoading(false);
    if (error || !data?.url) {
      toast({ title: "Error", description: "Could not create checkout session", variant: "destructive" });
      return;
    }
    window.open(data.url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showDashboard />
      <main className="container py-20 text-center">
        <h1 className="text-3xl font-bold">{lang === "it" ? "Sblocca Accesso Completo" : "Unlock Full Access"}</h1>
        <p className="mt-3 text-muted-foreground">{lang === "it" ? "Un pagamento. 60 giorni di preparazione illimitata." : "One payment. 60 days of unlimited prep."}</p>

        <Card className="mx-auto mt-10 max-w-md border-primary">
          <CardHeader>
            <CardTitle className="text-4xl font-extrabold">€19</CardTitle>
            <CardDescription>{lang === "it" ? "60 giorni di accesso completo" : "60 days of full access"}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-left">
              {FEATURES[lang].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
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
