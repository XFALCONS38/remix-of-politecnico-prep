import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Upload, RefreshCw } from "lucide-react";
import MathText from "@/components/MathText";

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
  times_served: number;
  times_correct: number;
  created_at: string;
}

const SECTIONS = ["mathematics", "logic", "physics", "technical"];
const DIFFICULTIES = ["medium", "hard"];

const Admin = () => {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    section: "",
    topic: "",
    difficulty: "",
    set_id: "",
    is_active: undefined as boolean | undefined,
  });
  const [bulkJson, setBulkJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState<"questions" | "passages">("questions");

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const body: any = { action: "list", limit: 200 };
    if (filters.section) body.section = filters.section;
    if (filters.topic) body.topic = filters.topic;
    if (filters.difficulty) body.difficulty = filters.difficulty;
    if (filters.set_id) body.set_id = filters.set_id;
    if (filters.is_active !== undefined) body.is_active = filters.is_active;

    const { data, error } = await supabase.functions.invoke("admin-questions", { body });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setQuestions(data.questions ?? []);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const toggleActive = async (questionId: string, currentActive: boolean) => {
    const { data, error } = await supabase.functions.invoke("admin-questions", {
      body: { action: "toggle_active", question_id: questionId, is_active: !currentActive },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, is_active: !currentActive } : q))
      );
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

  const successRate = (q: AdminQuestion) =>
    q.times_served > 0 ? ((q.times_correct / q.times_served) * 100).toFixed(0) + "%" : "—";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight"><Link to="/" className="text-xl font-bold tracking-tight">TILPrep — Admin</Link></Link>
          <Link to="/dashboard"><Button variant="outline" size="sm">Dashboard</Button></Link>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Bulk Import */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Bulk Import</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Select value={importType} onValueChange={(v) => setImportType(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions ({questions.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadQuestions}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-3">
              <Select value={filters.section || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, section: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.difficulty || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, difficulty: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                placeholder="Set ID"
                className="w-32"
                value={filters.set_id}
                onChange={(e) => setFilters((p) => ({ ...p, set_id: e.target.value }))}
              />
              <Input
                placeholder="Topic"
                className="w-40"
                value={filters.topic}
                onChange={(e) => setFilters((p) => ({ ...p, topic: e.target.value }))}
              />
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
                      <th className="pb-2 pr-3">Active</th>
                      <th className="pb-2">Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">{q.question_code}</td>
                        <td className="py-2 pr-3"><Badge variant="secondary" className="text-xs">{q.section}</Badge></td>
                        <td className="py-2 pr-3 text-xs">{q.topic}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={q.difficulty === "hard" ? "destructive" : "secondary"} className="text-xs">
                            {q.difficulty}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs">{q.set_id}</td>
                        <td className="py-2 pr-3 text-xs">{successRate(q)}</td>
                        <td className="py-2 pr-3">
                          <Switch
                            checked={q.is_active}
                            onCheckedChange={() => toggleActive(q.id, q.is_active)}
                          />
                        </td>
                        <td className="py-2 text-xs max-w-xs truncate"><MathText text={q.question_text_en} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
