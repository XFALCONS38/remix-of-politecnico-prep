import { z } from "zod";

const AnswerSchema = z.object({
  text_en: z.string().min(1, "text_en required"),
  text_it: z.string().nullable().optional(),
  error_label: z.string().nullable().optional(),
  explanation_en: z.string().nullable().optional(),
  explanation_it: z.string().nullable().optional(),
});

export const QuestionSchema = z.object({
  set_id: z.string().min(1),
  section: z.enum(["mathematics", "logic", "physics", "technical"]),
  question_code: z.string().min(1),
  topic: z.string().min(1),
  subtopic: z.string().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  question_text_en: z.string().min(1),
  question_text_it: z.string().nullable().optional(),
  correct_answers: z.array(AnswerSchema).min(1),
  wrong_answers: z.array(AnswerSchema).min(4),
  solution_en: z.string().min(1),
  solution_it: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  it_ready: z.boolean().optional(),
  passage_id: z.string().nullable().optional(),
  passage_order: z.number().nullable().optional(),
});

export const QuestionsArraySchema = z.array(QuestionSchema);

export type ValidationResult = {
  valid: z.infer<typeof QuestionSchema>[];
  errors: { index: number; message: string }[];
};

export function validateQuestions(input: unknown): ValidationResult {
  if (!Array.isArray(input)) {
    return { valid: [], errors: [{ index: -1, message: "Top-level value must be a JSON array" }] };
  }
  const valid: z.infer<typeof QuestionSchema>[] = [];
  const errors: { index: number; message: string }[] = [];
  input.forEach((item, i) => {
    const r = QuestionSchema.safeParse(item);
    if (r.success) valid.push(r.data);
    else errors.push({ index: i, message: r.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join("; ") });
  });
  return { valid, errors };
}
