import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminDiscounts() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: "", discount_percent: 10, max_uses: "", valid_until: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-discounts", {
      body: { action: "list" },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setCodes(data.codes ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.code.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-discounts", {
      body: {
        action: "create",
        code: form.code,
        discount_percent: form.discount_percent,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Discount code created" });
      setForm({ code: "", discount_percent: 10, max_uses: "", valid_until: "" });
      load();
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { data, error } = await supabase.functions.invoke("admin-discounts", {
      body: { action: "update", id, is_active: !isActive },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setCodes((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !isActive } : c));
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Delete this discount code?")) return;
    const { data, error } = await supabase.functions.invoke("admin-discounts", {
      body: { action: "delete", id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Create Discount Code</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <Input className="w-40" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="SAVE20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Discount %</label>
              <Input className="w-24" type="number" min={1} max={100} value={form.discount_percent} onChange={(e) => setForm(p => ({ ...p, discount_percent: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max Uses (empty=∞)</label>
              <Input className="w-28" type="number" value={form.max_uses} onChange={(e) => setForm(p => ({ ...p, max_uses: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valid Until</label>
              <Input className="w-44" type="datetime-local" value={form.valid_until} onChange={(e) => setForm(p => ({ ...p, valid_until: e.target.value }))} />
            </div>
            <Button onClick={create} disabled={creating || !form.code.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Discount Codes ({codes.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : codes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No discount codes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Code</th>
                    <th className="pb-2 pr-3">Discount</th>
                    <th className="pb-2 pr-3">Uses</th>
                    <th className="pb-2 pr-3">Valid Until</th>
                    <th className="pb-2 pr-3">Active</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono font-medium">{c.code}</td>
                      <td className="py-2 pr-3"><Badge variant="secondary">{c.discount_percent}%</Badge></td>
                      <td className="py-2 pr-3 text-xs">{c.current_uses}{c.max_uses ? `/${c.max_uses}` : "/∞"}</td>
                      <td className="py-2 pr-3 text-xs">{c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "No expiry"}</td>
                      <td className="py-2 pr-3"><Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} /></td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm" onClick={() => deleteCode(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
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
