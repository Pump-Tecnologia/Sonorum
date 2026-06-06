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
      charges: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          early_pay_amount: number | null
          enrollment_id: string | null
          id: string
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          school_id: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          early_pay_amount?: number | null
          enrollment_id?: string | null
          id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          school_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          early_pay_amount?: number | null
          enrollment_id?: string | null
          id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          school_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          cancelled_at: string | null
          created_at: string
          custom_amount: number | null
          due_day: number
          id: string
          plan_id: string
          school_id: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          custom_amount?: number | null
          due_day: number
          id?: string
          plan_id: string
          school_id?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          custom_amount?: number | null
          due_day?: number
          id?: string
          plan_id?: string
          school_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_pedagogical_resource: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          pedagogical_resource_id: string
          section: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          pedagogical_resource_id: string
          section?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          pedagogical_resource_id?: string
          section?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_pedagogical_resource_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_pedagogical_resource_pedagogical_resource_id_fkey"
            columns: ["pedagogical_resource_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          created_at: string
          homework: string | null
          id: string
          lesson_id: string
          notes: string | null
          repertoire: string | null
          school_id: string | null
          specific_data: Json | null
          target_bpm: string | null
          updated_at: string
          warmup: string | null
        }
        Insert: {
          created_at?: string
          homework?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          repertoire?: string | null
          school_id?: string | null
          specific_data?: Json | null
          target_bpm?: string | null
          updated_at?: string
          warmup?: string | null
        }
        Update: {
          created_at?: string
          homework?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          repertoire?: string | null
          school_id?: string | null
          specific_data?: Json | null
          target_bpm?: string | null
          updated_at?: string
          warmup?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_reports: {
        Row: {
          created_at: string
          current_song: string | null
          id: string
          initial_bpm: number | null
          lesson_id: string
          practice_score: number
          reached_bpm: number | null
          repertoire_score: number
          school_id: string | null
          technique_score: number
          theory_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_song?: string | null
          id?: string
          initial_bpm?: number | null
          lesson_id: string
          practice_score?: number
          reached_bpm?: number | null
          repertoire_score?: number
          school_id?: string | null
          technique_score?: number
          theory_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_song?: string | null
          id?: string
          initial_bpm?: number | null
          lesson_id?: string
          practice_score?: number
          reached_bpm?: number | null
          repertoire_score?: number
          school_id?: string | null
          technique_score?: number
          theory_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reports_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          end_datetime: string
          goals: string | null
          id: string
          notes: string | null
          private_notes: string | null
          room_id: string | null
          school_id: string | null
          series_id: string | null
          start_datetime: string
          status: string
          student_id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_datetime: string
          goals?: string | null
          id?: string
          notes?: string | null
          private_notes?: string | null
          room_id?: string | null
          school_id?: string | null
          series_id?: string | null
          start_datetime: string
          status?: string
          student_id: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_datetime?: string
          goals?: string | null
          id?: string
          notes?: string | null
          private_notes?: string | null
          room_id?: string | null
          school_id?: string | null
          series_id?: string | null
          start_datetime?: string
          status?: string
          student_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          file_type: string
          id: string
          instrument: string | null
          school_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          file_type: string
          id?: string
          instrument?: string | null
          school_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          file_type?: string
          id?: string
          instrument?: string | null
          school_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          event: string
          id: string
          payload: Json | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          related_id: string | null
          school_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          event: string
          id?: string
          payload?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          school_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          payload?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          related_id?: string | null
          school_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagogical_resources: {
        Row: {
          body: string | null
          category: string
          content_link: string | null
          content_type: string
          created_at: string
          created_by: string | null
          customized: boolean
          description: string | null
          difficulty: string
          file_path: string | null
          id: string
          instrument: string | null
          instrument_category: string | null
          school_id: string | null
          template_id: string | null
          template_version: number | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          category: string
          content_link?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          customized?: boolean
          description?: string | null
          difficulty?: string
          file_path?: string | null
          id?: string
          instrument?: string | null
          instrument_category?: string | null
          school_id?: string | null
          template_id?: string | null
          template_version?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          category?: string
          content_link?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          customized?: boolean
          description?: string | null
          difficulty?: string
          file_path?: string | null
          id?: string
          instrument?: string | null
          instrument_category?: string | null
          school_id?: string | null
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedagogical_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogical_resources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogical_resources_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "resource_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          amount: number
          billing_type: string
          created_at: string
          description: string | null
          early_pay_amount: number | null
          id: string
          max_age: number | null
          min_age: number | null
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          billing_type?: string
          created_at?: string
          description?: string | null
          early_pay_amount?: number | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          billing_type?: string
          created_at?: string
          description?: string | null
          early_pay_amount?: number | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_templates: {
        Row: {
          active: boolean
          body: string | null
          category: string | null
          content_link: string | null
          content_type: string
          created_at: string
          description: string | null
          difficulty: string | null
          file_path: string | null
          id: string
          instrument: string | null
          instrument_category: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          body?: string | null
          category?: string | null
          content_link?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          file_path?: string | null
          id?: string
          instrument?: string | null
          instrument_category?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          body?: string | null
          category?: string | null
          content_link?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          file_path?: string | null
          id?: string
          instrument?: string | null
          instrument_category?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      rooms: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_payments: {
        Row: {
          amount: number
          created_at: string
          external_reference: string | null
          id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          plan_type: string
          provider: string
          provider_payment_id: string | null
          provider_preference_id: string | null
          school_id: string
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_type: string
          provider?: string
          provider_payment_id?: string | null
          provider_preference_id?: string | null
          school_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_type?: string
          provider?: string
          provider_payment_id?: string | null
          provider_preference_id?: string | null
          school_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          id: string
          next_charge_at: string | null
          plan_type: string
          provider: string
          provider_subscription_id: string | null
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string
          id?: string
          next_charge_at?: string | null
          plan_type: string
          provider?: string
          provider_subscription_id?: string | null
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          id?: string
          next_charge_at?: string | null
          plan_type?: string
          provider?: string
          provider_subscription_id?: string | null
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          active_plan: string
          brand_primary: string | null
          brand_secondary: string | null
          cnpj: string | null
          created_at: string
          custom_name: string | null
          expiration_date: string | null
          id: string
          logo_path: string | null
          monthly_price: number
          name: string
          pix_city: string | null
          pix_key: string | null
          pix_key_type: string | null
          plan_type: string
          slug: string
          student_limit: number
          updated_at: string
        }
        Insert: {
          active_plan?: string
          brand_primary?: string | null
          brand_secondary?: string | null
          cnpj?: string | null
          created_at?: string
          custom_name?: string | null
          expiration_date?: string | null
          id?: string
          logo_path?: string | null
          monthly_price?: number
          name: string
          pix_city?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          plan_type?: string
          slug: string
          student_limit?: number
          updated_at?: string
        }
        Update: {
          active_plan?: string
          brand_primary?: string | null
          brand_secondary?: string | null
          cnpj?: string | null
          created_at?: string
          custom_name?: string | null
          expiration_date?: string | null
          id?: string
          logo_path?: string | null
          monthly_price?: number
          name?: string
          pix_city?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          plan_type?: string
          slug?: string
          student_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_goals: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          school_id: string | null
          student_id: string
          text: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          school_id?: string | null
          student_id: string
          text: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          school_id?: string | null
          student_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_goals_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          date?: string
          id?: string
          school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          id: string
          instruments: Json | null
          school_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instruments?: Json | null
          school_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instruments?: Json | null
          school_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_jobs: {
        Row: {
          audio_path: string
          body: string | null
          created_at: string
          created_by: string | null
          error: string | null
          external_id: string | null
          id: string
          instrument: string | null
          provider: string | null
          resource_id: string | null
          result: Json | null
          reviewed_by: string | null
          school_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audio_path: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          external_id?: string | null
          id?: string
          instrument?: string | null
          provider?: string | null
          resource_id?: string | null
          result?: Json | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audio_path?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          external_id?: string | null
          id?: string
          instrument?: string | null
          provider?: string | null
          resource_id?: string | null
          result?: Json | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcription_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcription_jobs_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "pedagogical_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcription_jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcription_jobs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_path: string | null
          created_at: string
          default_teacher_id: string | null
          due_day: number | null
          email: string
          id: string
          instrument: Json | null
          instrument_category: string | null
          monthly_fee: number | null
          name: string
          notify_email: boolean
          notify_to: string
          objectives: string | null
          parent_contact: string | null
          permanent_notes: string | null
          phone: string | null
          role: string
          school_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_path?: string | null
          created_at?: string
          default_teacher_id?: string | null
          due_day?: number | null
          email: string
          id: string
          instrument?: Json | null
          instrument_category?: string | null
          monthly_fee?: number | null
          name: string
          notify_email?: boolean
          notify_to?: string
          objectives?: string | null
          parent_contact?: string | null
          permanent_notes?: string | null
          phone?: string | null
          role?: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_path?: string | null
          created_at?: string
          default_teacher_id?: string | null
          due_day?: number | null
          email?: string
          id?: string
          instrument?: Json | null
          instrument_category?: string | null
          monthly_fee?: number | null
          name?: string
          notify_email?: boolean
          notify_to?: string
          objectives?: string | null
          parent_contact?: string | null
          permanent_notes?: string | null
          phone?: string | null
          role?: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_school_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
