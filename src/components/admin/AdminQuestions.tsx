import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Upload, RefreshCw, Plus, Pencil, Trash2, FileText, Wand2 } from "lucide-react";
import MathText from "@/components/MathText";
import QuestionEditor from "./QuestionEditor";

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
const DIFFICULTIES = ["medium", "hard"];

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ section: "", topic: "", difficulty: "", set_id: "" });
  const [bulkJson, setBulkJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState<"questions" | "passages">("questions");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [pdfText, setPdfText] = useState("");
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfSetId, setPdfSetId] = useState("SET_01");
  const [pdfSection, setPdfSection] = useState("mathematics");

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const body: any = { action: "list", limit: 200 };
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
    }
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

  const handleBulkImport = async () => {
    if (!bulkJson.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");

      const action = importType === "passages" ? "bulk_insert_passages" : "bulk_insert";
      const bodyKey = importType === "passages" ? "passages" : "questions";

      const { data, error } = await supabase.functions.invoke("admin-questions", {
        body: { action, [bodyKey]: parsed },
      });

      if (error || data?.error) {
        toast({ title: "Import failed", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Import successful", description: `${data.inserted} ${importType} inserted` });
        setBulkJson("");
        if (importType === "questions") loadQuestions();
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
      toast({ title: `Extracted ${data.count} questions`, description: "Review the JSON and import" });
    }
    setPdfParsing(false);
  };

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      toast({ title: "PDF Upload", description: "Please paste the extracted text from the PDF below, or use a PDF reader to copy the content." });
      return;
    }

    // Handle text files
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
              <div className="flex gap-3">
                <Select value={importType} onValueChange={(v) => setImportType(v as any)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="questions">Questions</SelectItem>
                    <SelectItem value="passages">Passages</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleBulkImport} disabled={importing || !bulkJson.trim()}>
                  {importing ? "Importing..." : "Import"}
                </Button>
              </div>
              <Textarea
                placeholder="Paste JSON array here..."
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4" /> AI-Powered Extraction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Paste text from a PDF or document. AI will extract and structure the questions.</p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Target Set</label>
                  <Input className="w-32" value={pdfSetId} onChange={(e) => setPdfSetId(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Section</label>
                  <Select value={pdfSection} onValueChange={setPdfSection}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="cursor-pointer">
                    <input type="file" accept=".txt,.md,.csv" className="hidden" onChange={handlePdfFileUpload} />
                    <Button variant="outline" size="sm" asChild><span><FileText className="h-3 w-3 mr-1" /> Load File</span></Button>
                  </label>
                </div>
              </div>
              <Textarea
                placeholder="Paste text content here..."
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

      {/* Question List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Questions ({questions.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadQuestions}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
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
          ) : questions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No questions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Code</th>
                    <th className="pb-2 pr-3">Section</th>
                    <th className="pb-2 pr-3">Topic</th>
                    <th className="pb-2 pr-3">Diff</th>
                    <th className="pb-2 pr-3">Set</th>
                    <th className="pb-2 pr-3">Rate</th>
                    <th className="pb-2 pr-3">IT</th>
                    <th className="pb-2 pr-3">Active</th>
                    <th className="pb-2 pr-3">Question</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{q.question_code}</td>
                      <td className="py-2 pr-3"><Badge variant="secondary" className="text-xs">{q.section}</Badge></td>
                      <td className="py-2 pr-3 text-xs">{q.topic}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={q.difficulty === "hard" ? "destructive" : "secondary"} className="text-xs">{q.difficulty}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs">{q.set_id}</td>
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
