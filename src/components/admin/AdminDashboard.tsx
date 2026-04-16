import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Users, CreditCard, BookOpen, BarChart3, Percent, FileQuestion, TrendingUp, UserPlus } from "lucide-react";

interface DashboardData {
  totalUsers: number;
  activeSubscribers: number;
  totalRevenueCents: number;
  mrrCents: number;
  revenueByMonth: Record<string, number>;
  revenueByTier: Record<string, { count: number; revenue: number }>;
  totalQuestions: number;
  totalActiveQuestions: number;
  questionsBySection: Record<string, number>;
  questionsBySet: Record<string, number>;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: string;
  avgScore: string;
  recentSignups: Array<{ id: string; email: string; created_at: string }>;
  signupsByDay: Record<string, number>;
  totalDiscounts: number;
  activeDiscounts: number;
  newThisWeek: number;
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
  const mrr = (data.mrrCents / 100).toFixed(2);
  const conversionRate = data.totalUsers > 0 ? ((data.activeSubscribers / data.totalUsers) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={String(data.totalUsers)} sub={`+${data.newThisWeek} this week`} />
        <StatCard icon={CreditCard} label="Active Subscribers" value={String(data.activeSubscribers)} sub={`${conversionRate}% conversion`} />
        <StatCard icon={TrendingUp} label="Total Revenue" value={`€${revenue}`} sub={`MRR: €${mrr}`} />
        <StatCard icon={BarChart3} label="Avg Score" value={`${data.avgScore}/42`} sub={`${data.completionRate}% completion`} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileQuestion} label="Total Questions" value={String(data.totalQuestions)} />
        <StatCard icon={BookOpen} label="Active Questions" value={String(data.totalActiveQuestions)} />
        <StatCard icon={BarChart3} label="Total Exams" value={String(data.totalAttempts)} sub={`${data.completedAttempts} completed`} />
        <StatCard icon={Percent} label="Active Discounts" value={`${data.activeDiscounts}/${data.totalDiscounts}`} />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {Object.entries(data.revenueByMonth).map(([month, cents]) => {
              const max = Math.max(...Object.values(data.revenueByMonth), 1);
              const heightPct = (cents / max) * 100;
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground tabular-nums">€{(cents / 100).toFixed(0)}</span>
                  <div className="w-full rounded-t bg-primary/80 transition-all" style={{ height: `${Math.max(heightPct, 2)}%` }} />
                  <span className="text-[10px] text-muted-foreground">{month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue by Tier */}
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Tier</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(data.revenueByTier).length === 0 ? (
              <p className="text-muted-foreground text-sm">No subscriptions yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(data.revenueByTier).map(([tier, info]) => (
                  <div key={tier} className="flex justify-between text-sm">
                    <span>{tier} <span className="text-muted-foreground">({info.count} subs)</span></span>
                    <span className="font-medium tabular-nums">€{(info.revenue / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions by Section */}
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

        {/* Questions by Set */}
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

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Recent Signups (30 days)
          </CardTitle>
        </CardHeader>
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

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
          {sub && <p className="truncate text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
