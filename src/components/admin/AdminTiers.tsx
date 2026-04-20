import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Settings2 } from "lucide-react";

interface Tier {
  id?: string;
  name: string;
  slug: string;
  duration_days: number;
  price_cents: number;
  display_order: number;
  is_active: boolean;
  features: Record<string, boolean>;
  max_sets: number | null;
  bonus_sets_count: number;
}

interface Access { tier_id: string; set_id: string; is_bonus: boolean }

export default function AdminTiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [availableSets, setAvailableSets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-tiers", { body: { action: "list" } });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else {
      setTiers(data.tiers || []);
      setAccess(data.access || []);
      setAvailableSets(data.available_sets || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveTier = async (t: Tier) => {
    const { data, error } = await supabase.functions.invoke("admin-tiers", { body: { action: "upsert_tier", tier: t } });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else { toast({ title: "Saved" }); load(); setEditing(null); }
  };

  const deleteTier = async (id: string) => {
    if (!confirm("Delete this tier?")) return;
    const { data, error } = await supabase.functions.invoke("admin-tiers", { body: { action: "delete_tier", tier_id: id } });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  const updateAccess = async (tierId: string, sets: { set_id: string; is_bonus: boolean }[]) => {
    const { data, error } = await supabase.functions.invoke("admin-tiers", { body: { action: "set_access", tier_id: tierId, sets } });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else { toast({ title: "Sets updated" }); load(); }
  };

  const accessFor = (tierId: string) => access.filter((a) => a.tier_id === tierId);

  const toggleSet = (tierId: string, setId: string) => {
    const cur = accessFor(tierId);
    const has = cur.find((a) => a.set_id === setId);
    const next = has ? cur.filter((a) => a.set_id !== setId) : [...cur, { tier_id: tierId, set_id: setId, is_bonus: false }];
    updateAccess(tierId, next.map(({ set_id, is_bonus }) => ({ set_id, is_bonus })));
  };

  const toggleBonus = (tierId: string, setId: string) => {
    const cur = accessFor(tierId);
    const next = cur.map((a) => a.set_id === setId ? { ...a, is_bonus: !a.is_bonus } : a);
    updateAccess(tierId, next.map(({ set_id, is_bonus }) => ({ set_id, is_bonus })));
  };

  const addNew = () => {
    setTiers((t) => [...t, {
      name: "New Tier", slug: `tier_${Date.now()}`, duration_days: 30, price_cents: 0,
      display_order: (t.length + 1), is_active: true, features: {}, max_sets: null, bonus_sets_count: 0,
    }]);
    setEditing("__new__");
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="h-5 w-5" /> Subscription Tiers</h2>
        <Button onClick={addNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Tier</Button>
      </div>

      {tiers.map((t, idx) => {
        const isEditing = editing === (t.id || "__new__");
        const owned = accessFor(t.id || "");
        return (
          <Card key={t.id || `new-${idx}`}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline">{t.slug}</Badge>
                  {t.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(isEditing ? null : (t.id || "__new__"))}>
                    {isEditing ? "Close" : "Edit"}
                  </Button>
                  {t.id && <Button size="sm" variant="ghost" onClick={() => deleteTier(t.id!)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-md border bg-muted/30">
                  <Field label="Name"><Input value={t.name} onChange={(e) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} /></Field>
                  <Field label="Slug"><Input value={t.slug} onChange={(e) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, slug: e.target.value } : x))} /></Field>
                  <Field label="Price (cents)"><Input type="number" value={t.price_cents} onChange={(e) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, price_cents: parseInt(e.target.value || "0") } : x))} /></Field>
                  <Field label="Duration (days)"><Input type="number" value={t.duration_days} onChange={(e) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, duration_days: parseInt(e.target.value || "0") } : x))} /></Field>
                  <Field label="Display order"><Input type="number" value={t.display_order} onChange={(e) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, display_order: parseInt(e.target.value || "0") } : x))} /></Field>
                  <Field label="Bonus sets count"><Input type="number" value={t.bonus_sets_count} onChange={(e) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, bonus_sets_count: parseInt(e.target.value || "0") } : x))} /></Field>
                  <Field label="Active"><Switch checked={t.is_active} onCheckedChange={(v) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, is_active: v } : x))} /></Field>
                  <Field label="Practice"><Switch checked={!!t.features.practice} onCheckedChange={(v) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, features: { ...x.features, practice: v } } : x))} /></Field>
                  <Field label="Tips/Pro"><Switch checked={!!t.features.tips} onCheckedChange={(v) => setTiers((arr) => arr.map((x, i) => i === idx ? { ...x, features: { ...x.features, tips: v } } : x))} /></Field>
                  <div className="col-span-full">
                    <Button size="sm" onClick={() => saveTier(t)}><Save className="h-3.5 w-3.5 mr-1" /> Save tier</Button>
                  </div>
                </div>
              )}

              {t.id && (
                <div>
                  <p className="text-sm font-medium mb-2">Assigned sets ({owned.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {availableSets.map((sid) => {
                      const a = owned.find((x) => x.set_id === sid);
                      const enabled = !!a;
                      return (
                        <div key={sid} className={`border rounded-md p-2 text-xs ${enabled ? "bg-primary/5 border-primary/40" : "bg-muted/20"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{sid}</span>
                            <Switch checked={enabled} onCheckedChange={() => toggleSet(t.id!, sid)} />
                          </div>
                          {enabled && (
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                              <input type="checkbox" checked={!!a?.is_bonus} onChange={() => toggleBonus(t.id!, sid)} />
                              Bonus
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
