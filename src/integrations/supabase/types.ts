export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          created_at: string | null
          current_section: number | null
          id: string
          is_free_attempt: boolean | null
          lang: string | null
          score: number | null
          section_scores: Json | null
          set_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["attempt_status"] | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_section?: number | null
          id?: string
          is_free_attempt?: boolean | null
          lang?: string | null
          score?: number | null
          section_scores?: Json | null
          set_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"] | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_section?: number | null
          id?: string
          is_free_attempt?: boolean | null
          lang?: string | null
          score?: number | null
          section_scores?: Json | null
          set_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"] | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          discount_percent: number
          id: string
          is_active: boolean
          max_uses: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_percent: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_percent?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      exam_attempt_answers: {
        Row: {
          assigned_letter: string
          created_at: string | null
          exam_attempt_id: string
          id: string
          options_snapshot: Json
          question_id: string | null
          question_order: number
          section: string
          student_answer: string | null
        }
        Insert: {
          assigned_letter: string
          created_at?: string | null
          exam_attempt_id: string
          id?: string
          options_snapshot: Json
          question_id?: string | null
          question_order: number
          section: string
          student_answer?: string | null
        }
        Update: {
          assigned_letter?: string
          created_at?: string | null
          exam_attempt_id?: string
          id?: string
          options_snapshot?: Json
          question_id?: string | null
          question_order?: number
          section?: string
          student_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempt_answers_exam_attempt_id_fkey"
            columns: ["exam_attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          created_at: string | null
          id: string
          it_ready: boolean | null
          passage_text_en: string
          passage_text_it: string | null
          set_id: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          it_ready?: boolean | null
          passage_text_en: string
          passage_text_it?: string | null
          set_id: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          it_ready?: boolean | null
          passage_text_en?: string
          passage_text_it?: string | null
          set_id?: string
          title?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_expiry: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          preferred_lang: string | null
        }
        Insert: {
          access_expiry?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          preferred_lang?: string | null
        }
        Update: {
          access_expiry?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferred_lang?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answers: Json
          created_at: string | null
          difficulty: string
          id: string
          is_active: boolean | null
          it_ready: boolean | null
          passage_id: string | null
          passage_order: number | null
          question_code: string
          question_text_en: string
          question_text_it: string | null
          section: string
          set_id: string
          solution_en: string
          solution_it: string | null
          subtopic: string | null
          times_correct: number | null
          times_served: number | null
          topic: string
          wrong_answers: Json
        }
        Insert: {
          correct_answers: Json
          created_at?: string | null
          difficulty: string
          id?: string
          is_active?: boolean | null
          it_ready?: boolean | null
          passage_id?: string | null
          passage_order?: number | null
          question_code: string
          question_text_en: string
          question_text_it?: string | null
          section: string
          set_id: string
          solution_en: string
          solution_it?: string | null
          subtopic?: string | null
          times_correct?: number | null
          times_served?: number | null
          topic: string
          wrong_answers: Json
        }
        Update: {
          correct_answers?: Json
          created_at?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean | null
          it_ready?: boolean | null
          passage_id?: string | null
          passage_order?: number | null
          question_code?: string
          question_text_en?: string
          question_text_it?: string | null
          section?: string
          set_id?: string
          solution_en?: string
          solution_it?: string | null
          subtopic?: string | null
          times_correct?: number | null
          times_served?: number | null
          topic?: string
          wrong_answers?: Json
        }
        Relationships: [
          {
            foreignKeyName: "questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_expiry: string
          access_start: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          access_expiry: string
          access_start?: string
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          access_expiry?: string
          access_start?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_question_history: {
        Row: {
          exam_attempt_id: string
          question_id: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          exam_attempt_id: string
          question_id: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          exam_attempt_id?: string
          question_id?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_history_exam_attempt_id_fkey"
            columns: ["exam_attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      attempt_status: "in_progress" | "completed" | "auto_submitted"
      subscription_status: "active" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      attempt_status: ["in_progress", "completed", "auto_submitted"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const
