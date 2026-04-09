import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";
import { useTheme } from "@/contexts/ThemeContext";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { lang } = useTheme();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: lang === "it" ? "Password troppo corta" : "Password too short", description: lang === "it" ? "Minimo 6 caratteri" : "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: lang === "it" ? "Registrazione fallita" : "Registration failed", description: error.message, variant: "destructive" });
    } else {
      // Update preferred_lang in profile after signup
      toast({ title: lang === "it" ? "Controlla la tua email" : "Check your email", description: lang === "it" ? "Ti abbiamo inviato un link di conferma." : "We sent you a confirmation link." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showAuth={false} />
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{lang === "it" ? "Crea Account" : "Create Account"}</CardTitle>
            <CardDescription>{lang === "it" ? "Registrati per iniziare la preparazione TIL-I" : "Sign up to start your TIL-I preparation"}</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (lang === "it" ? "Creazione account..." : "Creating account...") : (lang === "it" ? "Registrati" : "Sign Up")}
              </Button>
              <p className="text-sm text-muted-foreground">
                {lang === "it" ? "Hai già un account? " : "Already have an account? "}
                <Link to="/login" className="text-primary underline">{lang === "it" ? "Accedi" : "Sign in"}</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
