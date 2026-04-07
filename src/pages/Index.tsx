import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Target, Shield } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <span className="text-xl font-bold tracking-tight"><span className="text-xl font-bold tracking-tight">TILPrep</span></span>
          <nav className="flex gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link to="/register"><Button size="sm">Sign Up</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Would you get into{" "}
          <span className="text-primary">Politecnico di Torino</span> today?
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Take a free, full-length TIL-I simulation. 42 questions, 90 minutes, 4 sections with strict timers — exactly like the real exam.
        </p>
        <div className="mt-10">
          <Link to={user ? "/simulation" : "/register"}>
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              Start Free Simulation <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="mx-auto mt-24 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-left">
            <Clock className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Section Kill Switch</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              4 timed sections with independent timers. When time's up, you move on — no going back.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-left">
            <Target className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Admission Calculator</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Instant verdict: Guaranteed Admission, Waiting List, or Not Ranked — based on official thresholds.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 text-left">
            <Shield className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Anti-Cheat Scoring</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Server-side scoring with the official formula: +1 correct, -0.25 wrong, 0 blank.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
