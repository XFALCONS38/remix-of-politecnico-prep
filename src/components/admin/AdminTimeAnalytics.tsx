import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface SecAvg { section: string; n: number; avg_ms: number }
interface Slow {
  question_id: string; n: number; avg_ms: number; correct_pct: number;
  set_id?: string; section?: string; topic?: string; question_code?: string; question_text_en?: string;
}

const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export default function AdminTimeAnalytics() {
  const [secAvg, setSecAvg] = useState<SecAvg[]>([]);
  const [slowest, setSlowest] = useState<Slow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("admin-time-analytics", { body: {} });
      if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      else { setSecAvg(data.section_avg || []); setSlowest(data.slowest || []); }
      setLoading(false);
    })();
  }, []);

  const maxAvg = Math.max(1, ...secAvg.map((s) => s.avg_ms));

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Average time per section</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {secAvg.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timing data yet. Will populate as students complete exams with the new tracker.</p>
          ) : secAvg.map((s) => (
            <div key={s.section}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium capitalize">{s.section}</span>
                <span className="text-muted-foreground">{fmt(s.avg_ms)} · n={s.n}</span>
              </div>
              <div className="h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(s.avg_ms / maxAvg) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 20 slowest questions</CardTitle></CardHeader>
        <CardContent>
          {slowest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr><th className="py-2">Question</th><th>Section</th><th>Topic</th><th>Avg time</th><th>Correct %</th><th>Samples</th></tr>
                </thead>
                <tbody>
                  {slowest.map((q) => (
                    <tr key={q.question_id} className="border-b last:border-0">
                      <td className="py-2 max-w-[300px] truncate">
                        <span className="font-mono text-xs text-muted-foreground">{q.set_id || "—"}/{q.question_code || q.question_id.slice(0, 6)}</span>
                        <div className="text-xs truncate">{q.question_text_en?.slice(0, 80) || "—"}</div>
                      </td>
                      <td className="text-xs capitalize">{q.section}</td>
                      <td className="text-xs">{q.topic}</td>
                      <td className="font-mono text-xs">{fmt(q.avg_ms)}</td>
                      <td><Badge variant={q.correct_pct >= 50 ? "secondary" : "destructive"}>{q.correct_pct}%</Badge></td>
                      <td className="text-xs">{q.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
