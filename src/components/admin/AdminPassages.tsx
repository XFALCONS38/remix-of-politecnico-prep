import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Plus, Save, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { useAvailableSets } from "@/hooks/useAvailableSets";

interface Passage {
  id: string;
  set_id: string;
  title: string | null;
  passage_text_en: string;
  passage_text_it: string | null;
  created_at: string | null;
}

export default function AdminPassages() {
  const { sets: availableSets, reload: reloadSets } = useAvailableSets();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filterSet, setFilterSet] = useState<string>("");

  // New passage form — free-text set ID so admins can create as many sets as they want
  const [newSetId, setNewSetId] = useState("SET_01");
  const [newTitle, setNewTitle] = useState("");
  const [newTextEn, setNewTextEn] = useState("");
  const [newTextIt, setNewTextIt] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit drafts (id -> { en, it })
  const [drafts, setDrafts] = useState<Record<string, { en: string; it: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("passages").select("*").order("set_id").order("title");
    if (filterSet) q = q.eq("set_id", filterSet);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Error loading passages", description: error.message, variant: "destructive" });
    } else {
      setPassages((data ?? []) as Passage[]);
      const d: Record<string, { en: string; it: string }> = {};
      for (const p of data ?? []) {
        d[(p as Passage).id] = {
          en: (p as Passage).passage_text_en ?? "",
          it: (p as Passage).passage_text_it ?? "",
        };
      }
      setDrafts(d);
    }
    setLoading(false);
  }, [filterSet]);

  useEffect(() => { load(); }, [load]);

  const createPassage = async () => {
    if (!newSetId || !newTitle.trim() || !newTextEn.trim()) {
      toast({ title: "Missing fields", description: "Set, title, and English text are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("passages").insert({
      set_id: newSetId,
      title: newTitle.trim(),
      passage_text_en: newTextEn,
      passage_text_it: newTextIt || null,
      it_ready: !!newTextIt,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Passage created", description: `${newSetId} · ${newTitle}` });
      setNewTitle(""); setNewTextEn(""); setNewTextIt("");
      load();
    }
  };

  const savePassage = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(id);
    const { error } = await supabase
      .from("passages")
      .update({
        passage_text_en: draft.en,
        passage_text_it: draft.it || null,
        it_ready: !!draft.it,
      })
      .eq("id", id);
    setSaving(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved" });
      load();
    }
  };

  const deletePassage = async (id: string, title: string | null) => {
    if (!confirm(`Delete passage "${title ?? id}"? Questions referencing it will lose the link.`)) return;
    const { error } = await supabase.from("passages").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      load();
    }
  };

  // Group by set
  const grouped = passages.reduce<Record<string, Passage[]>>((acc, p) => {
    (acc[p.set_id] ||= []).push(p);
    return acc;
  }, {});

  const isStub = (p: Passage) => p.passage_text_en?.startsWith("[STUB]");

  return (
    <div className="space-y-4">
      {/* Create new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Passage (Logic section)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            The <code>title</code> is the code your questions reference in <code>passage_id</code> (e.g. <code>set04_passage_anc</code>).
            Make sure it matches exactly.
          </p>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Set</label>
              <Select value={newSetId} onValueChange={setNewSetId}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{SET_IDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <label className="text-xs text-muted-foreground">Title / code</label>
              <Input placeholder="e.g. set04_passage_anc" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">English passage text *</label>
            <Textarea
              placeholder="Paste the full English passage text here..."
              value={newTextEn}
              onChange={(e) => setNewTextEn(e.target.value)}
              className="min-h-[160px]"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Italian passage text (optional)</label>
            <Textarea
              placeholder="Italian translation (optional)..."
              value={newTextIt}
              onChange={(e) => setNewTextIt(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <Button onClick={createPassage} disabled={creating}>
            {creating ? "Creating..." : "Create Passage"}
          </Button>
        </CardContent>
      </Card>

      {/* List existing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Passages — {passages.length} total
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterSet || "all"} onValueChange={(v) => setFilterSet(v === "all" ? "" : v)}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sets</SelectItem>
                  {SET_IDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : passages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No passages found.</p>
          ) : (
            <Accordion type="multiple">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([setId, items]) => (
                <AccordionItem key={setId} value={setId}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{setId}</span>
                      <Badge variant="secondary" className="text-xs">{items.length} passage(s)</Badge>
                      {items.some(isStub) && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {items.filter(isStub).length} stub
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {items.map((p) => (
                        <div key={p.id} className="rounded-md border p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono">{p.title ?? "(no title)"}</code>
                              {isStub(p) && <Badge variant="destructive" className="text-xs">STUB — needs real text</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => savePassage(p.id)} disabled={saving === p.id}>
                                <Save className="h-3 w-3 mr-1" /> {saving === p.id ? "Saving..." : "Save"}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deletePassage(p.id, p.title)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">English text</label>
                            <Textarea
                              value={drafts[p.id]?.en ?? ""}
                              onChange={(e) => setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], en: e.target.value } }))}
                              className="min-h-[140px] text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Italian text (optional)</label>
                            <Textarea
                              value={drafts[p.id]?.it ?? ""}
                              onChange={(e) => setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], it: e.target.value } }))}
                              className="min-h-[100px] text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
