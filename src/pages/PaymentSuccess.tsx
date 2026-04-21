import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const { user } = useAuth();

  // Mark any matching abandoned-checkout row as recovered.
  useEffect(() => {
    const sessionId = params.get("session_id");
    const nowIso = new Date().toISOString();
    (async () => {
      try {
        if (sessionId) {
          await (supabase as any)
            .from("abandoned_checkouts")
            .update({ recovered_at: nowIso })
            .eq("stripe_session_id", sessionId)
            .is("recovered_at", null);
        } else if (user?.id) {
          await (supabase as any)
            .from("abandoned_checkouts")
            .update({ recovered_at: nowIso })
            .eq("user_id", user.id)
            .is("recovered_at", null);
        }
      } catch {
        // best-effort
      }
    })();
  }, [params, user?.id]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="max-w-md text-center">
        <CardContent className="py-10">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <h1 className="mt-4 text-2xl font-bold">Payment Successful!</h1>
          <p className="mt-2 text-muted-foreground">Your access is now active.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
            <Link to="/simulation"><Button variant="outline">Start Simulation</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
