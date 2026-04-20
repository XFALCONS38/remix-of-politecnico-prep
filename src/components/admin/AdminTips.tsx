import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, BookOpen } from "lucide-react";

interface A {
  id?: string; slug: string; category: string;
  title_en: string; title_it: string;
  body_en: string; body_it: string;
  display_order: number; is_published: boolean;
}

const empty = (): A => ({ slug: "", category: "tips", title_en: "", title_it: "", body_en: "", body_it: "", display_order: 0, is_published: true });

export default function AdminTips() {
  const [list, setList] = useState<A[]>([]);
  const [editing, setEditing] = useState<A | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-tips", { body: { action: "list" } });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else setList(data.articles || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.slug || !editing.title_en || !editing.body_en) {
      toast({ title: "Slug, title (EN), body (EN) are required", variant: "destructive" }); return;
    }
    const { data, error } = await supabase.functions.invoke("admin-tips", { body: { action: "upsert", article: editing } });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else { toast({ title: "Saved" }); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete article?")) return;
    const { data, error } = await supabase.functions.invoke("admin-tips", { body: { action: "delete", id } });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Tips & Formulas (Pro)</h2>
        <Button size="sm" onClick={() => setEditing(empty())}><Plus className="h-4 w-4 mr-1" /> New article</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editing.id ? "Edit article" : "New article"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Slug"><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
              <Field label="Category">
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tips">Tips</SelectItem>
                    <SelectItem value="tricks">Tricks</SelectItem>
                    <SelectItem value="tactics">Tactics</SelectItem>
                    <SelectItem value="formula">Formula</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Order"><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value || "0") })} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Title (EN)"><Input value={editing.title_en} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} /></Field>
              <Field label="Title (IT)"><Input value={editing.title_it} onChange={(e) => setEditing({ ...editing, title_it: e.target.value })} /></Field>
              <Field label="Body (EN) — supports KaTeX $...$"><Textarea rows={6} value={editing.body_en} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} /></Field>
              <Field label="Body (IT)"><Textarea rows={6} value={editing.body_it} onChange={(e) => setEditing({ ...editing, body_it: e.target.value })} /></Field>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">Published <Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} /></label>
              <Button onClick={save}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? <p className="p-6 text-sm text-muted-foreground text-center">No articles yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr><th className="p-3">Title</th><th>Slug</th><th>Category</th><th>Order</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{a.title_en}</td>
                    <td className="font-mono text-xs">{a.slug}</td>
                    <td className="text-xs"><Badge variant="outline">{a.category}</Badge></td>
                    <td className="text-xs">{a.display_order}</td>
                    <td>{a.is_published ? <Badge variant="secondary">Published</Badge> : <Badge variant="destructive">Draft</Badge>}</td>
                    <td className="text-right pr-3">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => del(a.id!)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">{label}</label>{children}</div>;
}
