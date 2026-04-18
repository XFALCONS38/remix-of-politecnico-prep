import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { Upload, RefreshCw, Plus, Pencil, Trash2, FileText, Wand2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import MathText from "@/components/MathText";
import QuestionEditor from "./QuestionEditor";
import { extractPdfText } from "@/lib/pdfExtractor";
import { validateQuestions } from "@/lib/questionSchema";

interface AdminQuestion {
  id: string;
  set_id: string;
  section: string;
  question_code: string;
  topic: string;
  subtopic: string | null;
  difficulty: string;
  question_text_en: string;
  is_active: boolean;
  it_ready: boolean;
  times_served: number;
  times_correct: number;
  created_at: string;
}

const SECTIONS = ["mathematics", "logic", "physics", "technical"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const PAGE_SIZE = 20;

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ section: "", topic: "", difficulty: "", set_id: "" });
  const [bulkJson, setBulkJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ index: number; message: string }[]>([]);
  const [validCount, setValidCount] = useState<number>(0);
  const [importType, setImportType] = useState<"questions" | "passages">("questions");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [pdfText, setPdfText] = useState("");
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [pdfSetId, setPdfSetId] = useState("SET_01");
  const [pdfSection, setPdfSection] = useState("mathematics");
  const [openSets, setOpenSets] = useState<string[]>([]);
  const [pageBySet, setPageBySet] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const body: any = { action: "list", limit: 1000 };
    if (filters.section) body.section = filters.section;
    if (filters.topic) body.topic = filters.topic;
    if (filters.difficulty) body.difficulty = filters.difficulty;
    if (filters.set_id) body.set_id = filters.set_id;

    const { data, error } = await supabase.functions.invoke("admin-questions", { body });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setQuestions(data.questions ?? []);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // Group questions by set
  const groupedBySet = useMemo(() => {
    const map = new Map<string, AdminQuestion[]>();
    for (const q of questions) {
      const arr = map.get(q.set_id) ?? [];
      arr.push(q);
      map.set(q.set_id, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [questions]);

  const toggleActive = async (id: string, current: boolean) => {
    const { data, error } = await supabase.functions.invoke("admin-questions", {
      body: { action: "toggle_active", question_id: id, is_active: !current },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: !current } : q));
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question permanently?")) return;
    const { data, error } = await supabase.functions.invoke("admin-questions", {
      body: { action: "delete", question_id: id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      setQuestions(prev => prev.filter(q => q.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectSet = (ids: string[], allSelected: boolean) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (allSelected) ids.forEach(i => n.delete(i));
      else ids.forEach(i => n.add(i));
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(questions.map(q => q.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Permanently delete ${ids.length} question(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-questions", {
      body: { action: "bulk_delete", question_ids: ids },
    });
    if (error || data?.error) {
      toast({ title: "Bulk delete failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `${data.deleted ?? ids.length} question(s) removed` });
      setQuestions(prev => prev.filter(q => !selectedIds.has(q.id)));
      clearSelection();
    }
    setBulkDeleting(false);
  };

  const editQuestion = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("admin-questions", {
      body: { action: "get", question_id: id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setEditingQuestion(data.question);
      setEditorOpen(true);
    }
  };

  // Validate JSON in real time
  useEffect(() => {
    if (!bulkJson.trim() || importType !== "questions") {
      setValidationErrors([]);
      setValidCount(0);
      return;
    }
    try {
      const parsed = JSON.parse(bulkJson);
      const result = validateQuestions(parsed);
      setValidationErrors(result.errors);
      setValidCount(result.valid.length);
    } catch (e: any) {
      setValidationErrors([{ index: -1, message: "Invalid JSON: " + e.message }]);
      setValidCount(0);
    }
  }, [bulkJson, importType]);

  const handleBulkImport = async () => {
    if (!bulkJson.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");

      if (importType === "questions") {
        const result = validateQuestions(parsed);
        if (result.errors.length > 0) {
          toast({
            title: `${result.errors.length} invalid question(s)`,
            description: `Importing ${result.valid.length} valid; first error: ${result.errors[0].message}`,
            variant: "destructive",
          });
        }
        if (result.valid.length === 0) {
          setImporting(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke("admin-questions", {
          body: { action: "bulk_insert", questions: result.valid },
        });
        if (error || data?.error) {
          toast({ title: "Import failed", description: data?.error || error?.message, variant: "destructive" });
        } else {
          toast({ title: "Import successful", description: `${data.inserted} questions inserted` });
          setBulkJson("");
          loadQuestions();
        }
      } else {
        const { data, error } = await supabase.functions.invoke("admin-questions", {
          body: { action: "bulk_insert_passages", passages: parsed },
        });
        if (error || data?.error) {
          toast({ title: "Import failed", description: data?.error || error?.message, variant: "destructive" });
        } else {
          toast({ title: "Import successful", description: `${data.inserted} passages inserted` });
          setBulkJson("");
        }
      }
    } catch (err: any) {
      toast({ title: "Invalid JSON", description: err.message, variant: "destructive" });
    }
    setImporting(false);
  };

  const handlePdfParse = async () => {
    if (!pdfText.trim()) return;
    setPdfParsing(true);
    const { data, error } = await supabase.functions.invoke("parse-pdf-questions", {
      body: { text: pdfText, set_id: pdfSetId, section: pdfSection },
    });
    if (error || data?.error) {
      toast({ title: "Parse failed", description: data?.error || error?.message, variant: "destructive" });
    } else if (data?.questions) {
      setBulkJson(JSON.stringify(data.questions, null, 2));
      toast({ title: `Extracted ${data.count} questions`, description: "Review JSON in the JSON Import tab and import" });
    }
    setPdfParsing(false);
  };

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setPdfExtracting(true);
      try {
        const text = await extractPdfText(file);
        setPdfText(text);
        toast({ title: "PDF extracted", description: `${text.length.toLocaleString()} characters loaded` });
      } catch (err: any) {
        toast({ title: "PDF parse failed", description: err.message, variant: "destructive" });
      }
      setPdfExtracting(false);
      return;
    }

    const text = await file.text();
    setPdfText(text);
  };

  const successRate = (q: AdminQuestion) =>
    q.times_served > 0 ? ((q.times_correct / q.times_served) * 100).toFixed(0) + "%" : "—";

  return (
    <div className="space-y-4">
      {/* Upload Methods */}
      <Tabs defaultValue="json">
        <TabsList>
          <TabsTrigger value="json">JSON Import</TabsTrigger>
          <TabsTrigger value="pdf">PDF / AI Extract</TabsTrigger>
          <TabsTrigger value="direct">Write Directly</TabsTrigger>
        </TabsList>

        <TabsContent value="json">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> JSON Bulk Import</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3 items-center">
                <Select value={importType} onValueChange={(v) => setImportType(v as any)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="questions">Questions</SelectItem>
                    <SelectItem value="passages">Passages</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleBulkImport} disabled={importing || !bulkJson.trim() || (importType === "questions" && validCount === 0)}>
                  {importing ? "Importing..." : `Import ${validCount > 0 ? `(${validCount} valid)` : ""}`}
                </Button>
                {importType === "questions" && bulkJson.trim() && (
                  <div className="flex items-center gap-2 text-xs">
                    {validationErrors.length === 0 ? (
                      <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> All {validCount} valid</span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3.5 w-3.5" /> {validationErrors.length} error(s) · {validCount} valid</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Each question can target a different <code>set_id</code> and <code>section</code> — bulk-import maps them to the correct destinations automatically.
              </p>
              <Textarea
                placeholder='[{"set_id":"SET_01","section":"mathematics","question_code":"M01",...}]'
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
              {validationErrors.length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-2 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium mb-1 text-destructive">Validation errors:</p>
                  <ul className="text-xs space-y-0.5">
                    {validationErrors.slice(0, 10).map((e, i) => (
                      <li key={i}>• #{e.index}: {e.message}</li>
                    ))}
                    {validationErrors.length > 10 && <li className="text-muted-foreground">…and {validationErrors.length - 10} more</li>}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4" /> PDF / AI-Powered Extraction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Upload a PDF (text-extracted via pdf.js) or paste raw text. AI structures the questions into JSON.</p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Default Set</label>
                  <Input className="w-32" value={pdfSetId} onChange={(e) => setPdfSetId(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Default Section</label>
                  <Select value={pdfSection} onValueChange={setPdfSection}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="cursor-pointer">
                    <input type="file" accept=".pdf,.txt,.md,.csv" className="hidden" onChange={handlePdfFileUpload} />
                    <Button variant="outline" size="sm" disabled={pdfExtracting} asChild>
                      <span><FileText className="h-3 w-3 mr-1" /> {pdfExtracting ? "Extracting..." : "Upload PDF / Text"}</span>
                    </Button>
                  </label>
                </div>
              </div>
              <Textarea
                placeholder="PDF text appears here, or paste content directly..."
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
              <Button onClick={handlePdfParse} disabled={pdfParsing || !pdfText.trim()}>
                <Wand2 className="h-4 w-4 mr-1" /> {pdfParsing ? "Extracting..." : "Extract Questions with AI"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct">
          <Card>
            <CardContent className="pt-6">
              <Button onClick={() => { setEditingQuestion(null); setEditorOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Write New Question
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question Bank — by Set */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Question Bank — {questions.length} questions in {groupedBySet.length} set(s)</CardTitle>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
                  <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={bulkDeleting}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
                  </Button>
                </>
              )}
              {selectedIds.size === 0 && questions.length > 0 && (
                <Button variant="outline" size="sm" onClick={selectAllVisible}>Select all loaded</Button>
              )}
              <Button variant="ghost" size="sm" onClick={loadQuestions}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <Select value={filters.section || "all"} onValueChange={(v) => setFilters(p => ({ ...p, section: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.difficulty || "all"} onValueChange={(v) => setFilters(p => ({ ...p, difficulty: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Set ID" className="w-32" value={filters.set_id} onChange={(e) => setFilters(p => ({ ...p, set_id: e.target.value }))} />
            <Input placeholder="Topic" className="w-40" value={filters.topic} onChange={(e) => setFilters(p => ({ ...p, topic: e.target.value }))} />
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : groupedBySet.length === 0 ? (
            <p className="text-muted-foreground text-sm">No questions found.</p>
          ) : (
            <Accordion type="multiple" value={openSets} onValueChange={setOpenSets}>
              {groupedBySet.map(([setId, qs]) => {
                const page = pageBySet[setId] ?? 0;
                const totalPages = Math.ceil(qs.length / PAGE_SIZE);
                const visible = qs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                const activeCount = qs.filter(q => q.is_active).length;
                const setIds = qs.map(q => q.id);
                const allSetSelected = setIds.length > 0 && setIds.every(i => selectedIds.has(i));
                const someSetSelected = setIds.some(i => selectedIds.has(i));
                return (
                  <AccordionItem key={setId} value={setId}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3 text-sm">
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleSelectSet(setIds, allSetSelected); }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="flex items-center"
                        >
                          <Checkbox checked={allSetSelected ? true : someSetSelected ? "indeterminate" as any : false} />
                        </span>
                        <span className="font-medium">{setId}</span>
                        <Badge variant="secondary" className="text-xs">{qs.length} questions</Badge>
                        <Badge variant="outline" className="text-xs">{activeCount} active</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="pb-2 pr-3 w-8"></th>
                              <th className="pb-2 pr-3">Code</th>
                              <th className="pb-2 pr-3">Section</th>
                              <th className="pb-2 pr-3">Topic</th>
                              <th className="pb-2 pr-3">Diff</th>
                              <th className="pb-2 pr-3">Rate</th>
                              <th className="pb-2 pr-3">IT</th>
                              <th className="pb-2 pr-3">Active</th>
                              <th className="pb-2 pr-3">Question</th>
                              <th className="pb-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((q) => (
                              <tr key={q.id} className="border-b last:border-0">
                                <td className="py-2 pr-3">
                                  <Checkbox checked={selectedIds.has(q.id)} onCheckedChange={() => toggleSelected(q.id)} />
                                </td>
                                <td className="py-2 pr-3 font-mono text-xs">{q.question_code}</td>
                                <td className="py-2 pr-3"><Badge variant="secondary" className="text-xs">{q.section}</Badge></td>
                                <td className="py-2 pr-3 text-xs">{q.topic}</td>
                                <td className="py-2 pr-3">
                                  <Badge variant={q.difficulty === "hard" ? "destructive" : "secondary"} className="text-xs">{q.difficulty}</Badge>
                                </td>
                                <td className="py-2 pr-3 text-xs">{successRate(q)}</td>
                                <td className="py-2 pr-3">
                                  <Badge variant={q.it_ready ? "default" : "outline"} className="text-xs">{q.it_ready ? "✓" : "✗"}</Badge>
                                </td>
                                <td className="py-2 pr-3">
                                  <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q.id, q.is_active)} />
                                </td>
                                <td className="py-2 pr-3 text-xs max-w-[200px] truncate"><MathText text={q.question_text_en} /></td>
                                <td className="py-2">
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => editQuestion(q.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPageBySet(p => ({ ...p, [setId]: page - 1 }))}>Prev</Button>
                            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPageBySet(p => ({ ...p, [setId]: page + 1 }))}>Next</Button>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {editorOpen && (
        <QuestionEditor
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditingQuestion(null); }}
          onSaved={loadQuestions}
          question={editingQuestion}
        />
      )}
    </div>
  );
}
