import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import SiteHeader from "@/components/SiteHeader";
import { useTheme } from "@/contexts/ThemeContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { lang } = useTheme();
  const { isAdmin, user } = useAuth();

  // If already logged in as admin, redirect
  useEffect(() => {
    if (user && isAdmin) navigate("/admin", { replace: true });
    else if (user) navigate("/dashboard", { replace: true });
  }, [user, isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: lang === "it" ? "Accesso fallito" : "Login failed", description: error.message, variant: "destructive" });
    } else {
      // Check admin role for this user
      const { data: roleData } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (roleData) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader showAuth={false} />
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{lang === "it" ? "Accedi" : "Sign In"}</CardTitle>
            <CardDescription>{lang === "it" ? "Inserisci le tue credenziali per accedere a TILPrep" : "Enter your credentials to access TILPrep"}</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (lang === "it" ? "Accesso..." : "Signing in...") : (lang === "it" ? "Accedi" : "Sign In")}
              </Button>
              <p className="text-sm text-muted-foreground">
                {lang === "it" ? "Non hai un account? " : "Don't have an account? "}
                <Link to="/register" className="text-primary underline">{lang === "it" ? "Registrati" : "Sign up"}</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
