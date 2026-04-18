import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Eye, EyeOff, GraduationCap, ArrowLeft } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { lang } = useTheme();
  const { isAdmin, user, viewMode } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (isAdmin && viewMode === "admin") navigate("/admin", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [user, isAdmin, viewMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: lang === "it" ? "Accesso fallito" : "Login failed", description: error.message, variant: "destructive" });
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
            {lang === "it" ? "Bentornato al " : "Welcome back to "}
            <span className="text-emerald">TILPrep.</span>
          </h1>
          <p className="mt-5 text-primary-foreground/70 max-w-md">
            {lang === "it"
              ? "Continua la tua preparazione TIL-I esattamente da dove l'hai lasciata."
              : "Pick up your TIL-I prep exactly where you left off."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {["A", "M", "G", "L"].map((l, i) => (
              <div key={i} className="h-9 w-9 rounded-full bg-emerald/20 border-2 border-primary flex items-center justify-center text-xs font-semibold text-emerald">
                {l}
              </div>
            ))}
          </div>
          <span className="text-xs text-primary-foreground/60">
            {lang === "it" ? "12,000+ studenti già si stanno preparando" : "12,000+ students already preparing"}
          </span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-col justify-center px-6 py-10 lg:px-16">
        <div className="absolute top-6 right-6"><LanguageToggle /></div>

        <div className="w-full max-w-md mx-auto">
          <h2 className="font-['Poppins'] text-3xl font-semibold text-foreground">
            {lang === "it" ? "Accedi" : "Sign In"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "it" ? "Inserisci le tue credenziali per accedere a TILPrep." : "Enter your credentials to access TILPrep."}
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded accent-emerald" />
                {lang === "it" ? "Ricordami" : "Remember me"}
              </label>
              <a href="#" className="text-emerald hover:underline">
                {lang === "it" ? "Password dimenticata?" : "Forgot password?"}
              </a>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (lang === "it" ? "Accesso..." : "Signing in...") : (lang === "it" ? "Accedi" : "Login")}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {lang === "it" ? "Non hai un account? " : "Don't have an account? "}
              <Link to="/register" className="text-emerald font-medium hover:underline">
                {lang === "it" ? "Registrati" : "Sign Up"}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
