import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Users, CreditCard, BookOpen, BarChart3, Percent, FileQuestion } from "lucide-react";

interface DashboardData {
  totalUsers: number;
  activeSubscribers: number;
  totalRevenueCents: number;
  totalQuestions: number;
  totalActiveQuestions: number;
  questionsBySection: Record<string, number>;
  questionsBySet: Record<string, number>;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: string;
  recentSignups: Array<{ id: string; email: string; created_at: string }>;
  totalDiscounts: number;
  activeDiscounts: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: d, error } = await supabase.functions.invoke("admin-dashboard");
      if (error || d?.error) {
        toast({ title: "Error", description: d?.error || error?.message, variant: "destructive" });
      } else {
        setData(d);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm py-8 text-center">Loading analytics...</p>;
  if (!data) return <p className="text-destructive text-sm py-8 text-center">Failed to load analytics.</p>;

  const revenue = (data.totalRevenueCents / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={String(data.totalUsers)} />
        <StatCard icon={CreditCard} label="Active Subscribers" value={String(data.activeSubscribers)} />
        <StatCard icon={CreditCard} label="Total Revenue" value={`€${revenue}`} />
        <StatCard icon={BarChart3} label="Completion Rate" value={`${data.completionRate}%`} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileQuestion} label="Total Questions" value={String(data.totalQuestions)} />
        <StatCard icon={BookOpen} label="Active Questions" value={String(data.totalActiveQuestions)} />
        <StatCard icon={BarChart3} label="Total Exams" value={String(data.totalAttempts)} />
        <StatCard icon={Percent} label="Active Discounts" value={`${data.activeDiscounts}/${data.totalDiscounts}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Questions by Section</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.questionsBySection).map(([section, count]) => (
                <div key={section} className="flex justify-between text-sm">
                  <span className="capitalize">{section}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Questions by Set</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.questionsBySet).map(([set, count]) => (
                <div key={set} className="flex justify-between text-sm">
                  <span>{set}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Signups (30 days)</CardTitle></CardHeader>
        <CardContent>
          {data.recentSignups.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent signups.</p>
          ) : (
            <div className="space-y-2">
              {data.recentSignups.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.email}</span>
                  <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
