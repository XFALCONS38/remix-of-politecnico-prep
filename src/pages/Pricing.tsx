import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const FEATURES = [
  "Unlimited simulations for 60 days",
  "Full detailed explanations for every question",
  "Per-section weakness analysis",
  "Time-per-question analytics",
  "All 42 questions per simulation",
];

const Pricing = () => {
  const { user } = useAuth();
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
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">TILPrep</Link>
          <nav className="flex gap-3">
            {user ? (
              <Link to="/dashboard"><Button variant="outline" size="sm">Dashboard</Button></Link>
            ) : (
              <Link to="/login"><Button size="sm">Sign In</Button></Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container py-20 text-center">
        <h1 className="text-3xl font-bold">Unlock Full Access</h1>
        <p className="mt-3 text-muted-foreground">One payment. 60 days of unlimited prep.</p>

        <Card className="mx-auto mt-10 max-w-md border-primary">
          <CardHeader>
            <CardTitle className="text-4xl font-extrabold">€19</CardTitle>
            <CardDescription>60 days of full access</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-left">
              {FEATURES.map((f) => (
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
                {loading ? "Loading..." : "Unlock Full Access"}
              </Button>
            ) : (
              <Link to="/register" className="w-full">
                <Button className="w-full" size="lg">Sign Up to Get Started</Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Pricing;
