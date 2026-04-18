import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Eye, EyeOff, GraduationCap, ArrowLeft, Sparkles } from "lucide-react";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { lang } = useTheme();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: lang === "it" ? "Password troppo corta" : "Password too short",
        description: lang === "it" ? "Minimo 6 caratteri" : "Minimum 6 characters",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
    });
    setLoading(false);
    if (error) {
      toast({
        title: lang === "it" ? "Registrazione fallita" : "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: lang === "it" ? "Controlla la tua email" : "Check your email",
        description: lang === "it" ? "Ti abbiamo inviato un link di conferma." : "We sent you a confirmation link.",
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left dark panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-emerald transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> {lang === "it" ? "Torna alla home" : "Back to home"}
        </Link>
        <div>
          <div className="h-12 w-12 rounded-[10px] bg-emerald/15 flex items-center justify-center mb-8">
            <GraduationCap className="h-6 w-6 text-emerald" />
          </div>
          <h1 className="font-['Poppins'] text-4xl xl:text-5xl font-semibold leading-tight">
            {lang === "it" ? "Inizia ora. Sblocca il tuo " : "Start now. Unlock your "}
            <span className="text-emerald">{lang === "it" ? "futuro al PoliTo." : "future at PoliTo."}</span>
          </h1>
          <p className="mt-5 text-primary-foreground/70 max-w-md">
            {lang === "it"
              ? "1 mock gratis per sempre. Nessuna carta di credito richiesta."
              : "1 free mock forever. No credit card required."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {["S", "F", "R", "K"].map((l, i) => (
              <div key={i} className="h-9 w-9 rounded-full bg-emerald/20 border-2 border-primary flex items-center justify-center text-xs font-semibold text-emerald">
                {l}
              </div>
            ))}
          </div>
          <span className="text-xs text-primary-foreground/60">
            {lang === "it" ? "92% supera la soglia di ammissione" : "92% pass the admission threshold"}
          </span>
        </div>
      </div>

      {/* Right form */}
      <div className="relative flex flex-col justify-center px-6 py-10 lg:px-16">
        <div className="absolute top-6 right-6"><LanguageToggle /></div>

        <div className="w-full max-w-md mx-auto">
          {plan && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald/10 text-emerald px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === "it" ? "Piano selezionato:" : "Plan selected:"} {plan.toUpperCase()}
            </div>
          )}
          <h2 className="font-['Poppins'] text-3xl font-semibold text-foreground">
            {lang === "it" ? "Crea Account" : "Create Account"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "it" ? "Inizia con un mock gratis. Nessun impegno." : "Start with a free mock. No commitment."}
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{lang === "it" ? "Nome completo" : "Full Name"}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={lang === "it" ? "Mario Rossi" : "Jane Doe"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded accent-emerald" />
              <span>
                {lang === "it" ? "Accetto i " : "I agree to the "}
                <a href="#" className="text-emerald hover:underline">{lang === "it" ? "Termini di Servizio" : "Terms of Service"}</a>
                {lang === "it" ? " e la " : " and "}
                <a href="#" className="text-emerald hover:underline">Privacy Policy</a>.
              </span>
            </label>

            <Button type="submit" variant="emerald" className="w-full" size="lg" disabled={loading}>
              {loading ? (lang === "it" ? "Creazione..." : "Creating...") : (lang === "it" ? "Crea Account" : "Create Account")}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {lang === "it" ? "Hai già un account? " : "Already have an account? "}
              <Link to="/login" className="text-emerald font-medium hover:underline">
                {lang === "it" ? "Accedi" : "Login"}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
