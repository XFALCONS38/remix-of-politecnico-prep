import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const { user, profile, hasActiveAccess, signOut } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("attempts")
      .select("id, started_at, submitted_at, score, status, is_free_attempt")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAttempts(data ?? []));
  }, [user]);

  const getStatusBadge = (score: number | null) => {
    if (score === null) return <Badge variant="secondary">In Progress</Badge>;
    if (score >= 60) return <Badge className="bg-success text-success-foreground">Guaranteed</Badge>;
    if (score >= 30) return <Badge className="bg-warning text-warning-foreground">Waiting List</Badge>;
    return <Badge variant="destructive">Not Ranked</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">PolitoSim</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {hasActiveAccess && profile?.access_expiry && (
              <p className="mt-1 text-sm text-muted-foreground">
                Access expires {formatDistanceToNow(new Date(profile.access_expiry), { addSuffix: true })}
              </p>
            )}
          </div>
          <Link to="/simulation">
            <Button>Start New Simulation</Button>
          </Link>
        </div>

        {!hasActiveAccess && (
          <Card className="mb-8 border-warning">
            <CardContent className="flex items-center justify-between py-4">
              <p className="text-sm">Upgrade to unlock unlimited simulations and full explanations.</p>
              <Link to="/pricing"><Button size="sm">Upgrade — €19</Button></Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Past Attempts</CardTitle></CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts yet. Start your first simulation!</p>
            ) : (
              <div className="space-y-3">
                {attempts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(a.started_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.status === "in_progress" ? "In progress" : `Score: ${a.score ?? "—"}/42`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(a.status === "completed" ? a.score : null)}
                      {a.status === "completed" && (
                        <Link to={`/results/${a.id}`}>
                          <Button variant="outline" size="sm">View Results</Button>
                        </Link>
                      )}
                      {a.status === "in_progress" && (
                        <Link to="/simulation">
                          <Button size="sm">Continue</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
