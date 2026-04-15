import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from "lucide-react";

interface QuestionData {
  id?: string;
  set_id: string;
  section: string;
  question_code: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  question_text_en: string;
  question_text_it: string;
  correct_answers: any[];
  wrong_answers: any[];
  solution_en: string;
  solution_it: string;
  is_active: boolean;
  it_ready: boolean;
  passage_id: string;
  passage_order: string;
}

const SECTIONS = ["mathematics", "logic", "physics", "technical"];
const DIFFICULTIES = ["medium", "hard"];

const emptyQuestion: QuestionData = {
  set_id: "SET_01",
  section: "mathematics",
  question_code: "",
  topic: "",
  subtopic: "",
  difficulty: "medium",
  question_text_en: "",
  question_text_it: "",
  correct_answers: [{ text_en: "", text_it: "" }],
  wrong_answers: [
    { text_en: "", text_it: "", error_label: "", explanation_en: "", explanation_it: "" },
    { text_en: "", text_it: "", error_label: "", explanation_en: "", explanation_it: "" },
    { text_en: "", text_it: "", error_label: "", explanation_en: "", explanation_it: "" },
    { text_en: "", text_it: "", error_label: "", explanation_en: "", explanation_it: "" },
  ],
  solution_en: "",
  solution_it: "",
  is_active: true,
  it_ready: false,
  passage_id: "",
  passage_order: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  question?: any; // existing question to edit
}

export default function QuestionEditor({ open, onClose, onSaved, question }: Props) {
  const isEdit = !!question;
  const [data, setData] = useState<QuestionData>(() => {
    if (question) {
      return {
        id: question.id,
        set_id: question.set_id ?? "SET_01",
        section: question.section ?? "mathematics",
        question_code: question.question_code ?? "",
        topic: question.topic ?? "",
        subtopic: question.subtopic ?? "",
        difficulty: question.difficulty ?? "medium",
        question_text_en: question.question_text_en ?? "",
        question_text_it: question.question_text_it ?? "",
        correct_answers: question.correct_answers ?? [{ text_en: "", text_it: "" }],
        wrong_answers: question.wrong_answers?.length >= 4
          ? question.wrong_answers
          : [...(question.wrong_answers ?? []), ...Array(4 - (question.wrong_answers?.length ?? 0)).fill({ text_en: "", text_it: "", error_label: "", explanation_en: "", explanation_it: "" })],
        solution_en: question.solution_en ?? "",
        solution_it: question.solution_it ?? "",
        is_active: question.is_active ?? true,
        it_ready: question.it_ready ?? false,
        passage_id: question.passage_id ?? "",
        passage_order: question.passage_order ? String(question.passage_order) : "",
      };
    }
    return { ...emptyQuestion };
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (key: keyof QuestionData, value: any) => setData(p => ({ ...p, [key]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "question_text_en" | "question_text_it") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error } = await supabase.storage
      .from("question-images")
      .upload(fileName, file);

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(fileName);
      const imgTag = `\n![image](${urlData.publicUrl})\n`;
      set(field, data[field] + imgTag);
      toast({ title: "Image uploaded" });
    }
    setUploading(false);
  };

  const save = async () => {
    if (!data.question_code || !data.topic || !data.question_text_en || !data.solution_en) {
      toast({ title: "Missing fields", description: "Fill in code, topic, question text, and solution", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      set_id: data.set_id,
      section: data.section,
      question_code: data.question_code,
      topic: data.topic,
      subtopic: data.subtopic || null,
      difficulty: data.difficulty,
      question_text_en: data.question_text_en,
      question_text_it: data.question_text_it || null,
      correct_answers: data.correct_answers.filter(a => a.text_en),
      wrong_answers: data.wrong_answers.filter(a => a.text_en),
      solution_en: data.solution_en,
      solution_it: data.solution_it || null,
      is_active: data.is_active,
      it_ready: data.it_ready,
      passage_id: data.passage_id || null,
      passage_order: data.passage_order ? parseInt(data.passage_order) : null,
    };

    if (isEdit) {
      const { data: result, error } = await supabase.functions.invoke("admin-questions", {
        body: { action: "update", question_id: data.id, ...payload },
      });
      if (error || result?.error) {
        toast({ title: "Error", description: result?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Question updated" });
        onSaved();
        onClose();
      }
    } else {
      const { data: result, error } = await supabase.functions.invoke("admin-questions", {
        body: { action: "bulk_insert", questions: [payload] },
      });
      if (error || result?.error) {
        toast({ title: "Error", description: result?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Question created" });
        onSaved();
        onClose();
      }
    }
    setSaving(false);
  };

  const updateCorrectAnswer = (idx: number, field: string, value: string) => {
    const updated = [...data.correct_answers];
    updated[idx] = { ...updated[idx], [field]: value };
    set("correct_answers", updated);
  };

  const updateWrongAnswer = (idx: number, field: string, value: string) => {
    const updated = [...data.wrong_answers];
    updated[idx] = { ...updated[idx], [field]: value };
    set("wrong_answers", updated);
  };

  const addWrongAnswer = () => {
    set("wrong_answers", [...data.wrong_answers, { text_en: "", text_it: "", error_label: "", explanation_en: "", explanation_it: "" }]);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Question" : "Create Question"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Set ID</Label>
              <Input value={data.set_id} onChange={(e) => set("set_id", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Section</Label>
              <Select value={data.section} onValueChange={(v) => set("section", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={data.question_code} onChange={(e) => set("question_code", e.target.value)} placeholder="M01" />
            </div>
            <div>
              <Label className="text-xs">Difficulty</Label>
              <Select value={data.difficulty} onValueChange={(v) => set("difficulty", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Topic</Label>
              <Input value={data.topic} onChange={(e) => set("topic", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Subtopic</Label>
              <Input value={data.subtopic} onChange={(e) => set("subtopic", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Passage ID</Label>
              <Input value={data.passage_id} onChange={(e) => set("passage_id", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Passage Order</Label>
              <Input type="number" value={data.passage_order} onChange={(e) => set("passage_order", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={data.is_active} onCheckedChange={(v) => set("is_active", v)} />
              <Label className="text-xs">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={data.it_ready} onCheckedChange={(v) => set("it_ready", v)} />
              <Label className="text-xs">Italian Ready</Label>
            </div>
          </div>

          {/* Question Text */}
          <Tabs defaultValue="en">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="it">Italian</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Question Text (EN)</Label>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "question_text_en")} />
                  <Button variant="outline" size="sm" disabled={uploading} asChild><span><Upload className="h-3 w-3 mr-1" /> Image</span></Button>
                </label>
              </div>
              <Textarea className="min-h-[120px] font-mono text-xs" value={data.question_text_en} onChange={(e) => set("question_text_en", e.target.value)} />
              <Label className="text-xs">Solution (EN)</Label>
              <Textarea className="min-h-[100px] font-mono text-xs" value={data.solution_en} onChange={(e) => set("solution_en", e.target.value)} />
            </TabsContent>
            <TabsContent value="it" className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Question Text (IT)</Label>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "question_text_it")} />
                  <Button variant="outline" size="sm" disabled={uploading} asChild><span><Upload className="h-3 w-3 mr-1" /> Image</span></Button>
                </label>
              </div>
              <Textarea className="min-h-[120px] font-mono text-xs" value={data.question_text_it} onChange={(e) => set("question_text_it", e.target.value)} />
              <Label className="text-xs">Solution (IT)</Label>
              <Textarea className="min-h-[100px] font-mono text-xs" value={data.solution_it} onChange={(e) => set("solution_it", e.target.value)} />
            </TabsContent>
          </Tabs>

          {/* Correct Answers */}
          <div>
            <Label className="text-xs font-medium">Correct Answers</Label>
            {data.correct_answers.map((a, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 mt-1">
                <Input placeholder="EN" className="text-xs" value={a.text_en} onChange={(e) => updateCorrectAnswer(i, "text_en", e.target.value)} />
                <Input placeholder="IT" className="text-xs" value={a.text_it ?? ""} onChange={(e) => updateCorrectAnswer(i, "text_it", e.target.value)} />
              </div>
            ))}
          </div>

          {/* Wrong Answers */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Wrong Answers ({data.wrong_answers.length})</Label>
              <Button variant="outline" size="sm" onClick={addWrongAnswer}>+ Add</Button>
            </div>
            {data.wrong_answers.map((a, i) => (
              <div key={i} className="mt-2 rounded border p-2 space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Answer EN" className="text-xs" value={a.text_en} onChange={(e) => updateWrongAnswer(i, "text_en", e.target.value)} />
                  <Input placeholder="Answer IT" className="text-xs" value={a.text_it ?? ""} onChange={(e) => updateWrongAnswer(i, "text_it", e.target.value)} />
                </div>
                <Input placeholder="Error label" className="text-xs" value={a.error_label ?? ""} onChange={(e) => updateWrongAnswer(i, "error_label", e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Explanation EN" className="text-xs" value={a.explanation_en ?? ""} onChange={(e) => updateWrongAnswer(i, "explanation_en", e.target.value)} />
                  <Input placeholder="Explanation IT" className="text-xs" value={a.explanation_it ?? ""} onChange={(e) => updateWrongAnswer(i, "explanation_it", e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
