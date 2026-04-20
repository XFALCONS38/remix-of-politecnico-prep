import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Download, Mail, RefreshCw } from "lucide-react";

interface Row {
  id: string; email: string; user_id: string | null; tier_slug: string | null;
  stripe_session_id: string | null; amount_cents: number | null;
  created_at: string; recovered_at: string | null;
}

export default function AdminAbandoned() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState({ total: 0, recovered: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-abandoned", { body: {} });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else { setRows(data.rows || []); setStats(data.stats); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    const header = "email,tier_slug,amount_eur,created_at,recovered_at\n";
    const body = rows.map((r) => [
      r.email, r.tier_slug ?? "", r.amount_cents ? (r.amount_cents / 100).toFixed(2) : "",
      r.created_at, r.recovered_at ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `abandoned_checkouts_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Pending recovery" value={stats.pending} />
        <Stat label="Recovered" value={stats.recovered} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Abandoned Checkouts</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No abandoned checkouts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr><th className="py-2">Email</th><th>Tier</th><th>Amount</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{r.email}</td>
                      <td className="text-xs">{r.tier_slug || "—"}</td>
                      <td className="text-xs">{r.amount_cents ? `€${(r.amount_cents / 100).toFixed(2)}` : "—"}</td>
                      <td className="text-xs">{new Date(r.created_at).toLocaleString()}</td>
                      <td>{r.recovered_at ? <Badge variant="secondary">Recovered</Badge> : <Badge variant="destructive">Pending</Badge>}</td>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </CardContent></Card>
  );
}
