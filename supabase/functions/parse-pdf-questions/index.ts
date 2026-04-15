import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData } = await anonClient.auth.getUser(token);
    if (!userData?.user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const body = await req.json();
    const { text, set_id, section } = body;
    if (!text) throw new Error("text content required");

    const systemPrompt = `You are a question extraction assistant for an Italian university admission test prep platform (TIL exam).
Extract questions from the provided text and return them in a structured format.

Each question MUST follow this exact JSON schema:
{
  "set_id": "${set_id || 'SET_XX'}",
  "section": "${section || 'mathematics'}",
  "question_code": "M01" (section letter + sequential number),
  "topic": "algebra" (relevant topic),
  "subtopic": null (optional),
  "difficulty": "medium" or "hard",
  "question_text_en": "The question text in English",
  "question_text_it": "The question text in Italian (if available, else null)",
  "correct_answers": [{"text_en": "correct answer", "text_it": "risposta corretta"}],
  "wrong_answers": [
    {"text_en": "wrong1", "text_it": "sbagliata1", "error_label": "common_error", "explanation_en": "why wrong", "explanation_it": "perché sbagliata"},
    {"text_en": "wrong2", "text_it": "sbagliata2", "error_label": "sign_error", "explanation_en": "why wrong", "explanation_it": "perché sbagliata"},
    {"text_en": "wrong3", "text_it": "sbagliata3", "error_label": "calculation_error", "explanation_en": "why wrong", "explanation_it": "perché sbagliata"},
    {"text_en": "wrong4", "text_it": "sbagliata4", "error_label": "conceptual_error", "explanation_en": "why wrong", "explanation_it": "perché sbagliata"}
  ],
  "solution_en": "Step by step solution in English",
  "solution_it": "Soluzione passo passo in italiano (if available, else null)"
}

IMPORTANT:
- Each question must have exactly 1 correct answer and at least 4 wrong answers
- Use LaTeX notation with \\\\( ... \\\\) for inline math and \\\\[ ... \\\\] for display math
- If the text is in Italian, provide Italian text and try to translate to English
- If the text is in English, provide English text and try to translate to Italian
- Assign appropriate topics based on content: algebra, functions, exp_log, trigonometry, analytic_geometry, sequences_series, probability, euclidean_geometry for math; kinematics, dynamics, energy_collisions, thermodynamics, fluid_mechanics, electrostatics, dc_circuits, magnetism, optics for physics; sequence_pattern, ordering_puzzle, syllogism, cipher, set_overlap, text_comprehension for logic; boolean_logic, pseudocode, bitwise, topology_3d, spatial_reasoning, cross_section for technical`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract all questions from this text and return a JSON array:\n\n${text}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_questions",
            description: "Return extracted questions as structured data",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      set_id: { type: "string" },
                      section: { type: "string" },
                      question_code: { type: "string" },
                      topic: { type: "string" },
                      subtopic: { type: ["string", "null"] },
                      difficulty: { type: "string", enum: ["medium", "hard"] },
                      question_text_en: { type: "string" },
                      question_text_it: { type: ["string", "null"] },
                      correct_answers: { type: "array" },
                      wrong_answers: { type: "array" },
                      solution_en: { type: "string" },
                      solution_it: { type: ["string", "null"] },
                    },
                    required: ["set_id", "section", "question_code", "topic", "difficulty", "question_text_en", "correct_answers", "wrong_answers", "solution_en"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limited, please try again shortly" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 402,
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const parsed = JSON.parse(toolCall.function.arguments);
    const questions = parsed.questions || [];

    return new Response(JSON.stringify({ questions, count: questions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("parse-pdf-questions error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
