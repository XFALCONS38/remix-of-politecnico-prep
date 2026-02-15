import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const PaymentSuccess = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <Card className="max-w-md text-center">
      <CardContent className="py-10">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-4 text-2xl font-bold">Payment Successful!</h1>
        <p className="mt-2 text-muted-foreground">Your 60-day full access is now active.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
          <Link to="/simulation"><Button variant="outline">Start Simulation</Button></Link>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default PaymentSuccess;
