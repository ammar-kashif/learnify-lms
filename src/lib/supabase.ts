import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

// Create Supabase client with fallback values for build time
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Database types based on our actual SQL schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'student' | 'teacher' | 'admin' | 'superadmin';
          avatar_url: string | null;
          demo_used: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role: 'student' | 'teacher' | 'admin' | 'superadmin';
          avatar_url?: string | null;
          demo_used?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'student' | 'teacher' | 'admin' | 'superadmin';
          avatar_url?: string | null;
          demo_used?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          file_url: string | null;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          file_url?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          file_url?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      teacher_courses: {
        Row: {
          teacher_id: string;
          course_id: string;
        };
        Insert: {
          teacher_id: string;
          course_id: string;
        };
        Update: {
          teacher_id?: string;
          course_id?: string;
        };
      };
      student_enrollments: {
        Row: {
          student_id: string;
          course_id: string;
          subscription_id: string | null;
          enrollment_type: 'paid' | 'demo';
        };
        Insert: {
          student_id: string;
          course_id: string;
          subscription_id?: string | null;
          enrollment_type?: 'paid' | 'demo';
        };
        Update: {
          student_id?: string;
          course_id?: string;
          subscription_id?: string | null;
          enrollment_type?: 'paid' | 'demo';
        };
      };
      payment_verifications: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          subscription_plan_id: string | null;
          amount: number;
          status: 'pending' | 'approved' | 'rejected';
          verified_at: string | null;
          verified_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          subscription_plan_id?: string | null;
          amount: number;
          status?: 'pending' | 'approved' | 'rejected';
          verified_at?: string | null;
          verified_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          subscription_plan_id?: string | null;
          amount?: number;
          status?: 'pending' | 'approved' | 'rejected';
          verified_at?: string | null;
          verified_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          questions: Array<{
            id: string;
            question: string;
            type: 'multiple_choice' | 'text';
            options?: string[];
            correct_answer?: number;
            correct_text_answer?: string;
            points: number;
            requires_manual_grading?: boolean;
          }>; // JSONB array of questions
          settings: {
            time_limit?: number;
            max_attempts?: number;
            shuffle_questions?: boolean;
            show_correct_answers?: boolean;
            allow_review?: boolean;
          }; // JSONB object with quiz settings
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          questions: Array<{
            id: string;
            question: string;
            type: 'multiple_choice' | 'text';
            options?: string[];
            correct_answer?: number;
            correct_text_answer?: string;
            points: number;
            requires_manual_grading?: boolean;
          }>;
          settings?: {
            time_limit?: number;
            max_attempts?: number;
            shuffle_questions?: boolean;
            show_correct_answers?: boolean;
            allow_review?: boolean;
          };
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          questions?: Array<{
            id: string;
            question: string;
            type: 'multiple_choice' | 'text';
            options?: string[];
            correct_answer?: number;
            correct_text_answer?: string;
            points: number;
            requires_manual_grading?: boolean;
          }>;
          settings?: {
            time_limit?: number;
            max_attempts?: number;
            shuffle_questions?: boolean;
            show_correct_answers?: boolean;
            allow_review?: boolean;
          };
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          answers: Array<{
            question_id: string;
            selected_answer?: number;
            text_answer?: string;
            is_correct: boolean;
            points_earned: number;
            manually_graded?: boolean;
            teacher_feedback?: string;
            question_text?: string;
            correct_answer?: string;
            points?: number;
          }>; // JSONB array of student answers
          score: number;
          max_score: number;
          status: 'pending_grading' | 'graded' | 'auto_graded';
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          answers?: Array<{
            question_id: string;
            selected_answer?: number;
            text_answer?: string;
            is_correct: boolean;
            points_earned: number;
            manually_graded?: boolean;
            teacher_feedback?: string;
            question_text?: string;
            correct_answer?: string;
            points?: number;
          }>;
          score?: number;
          max_score?: number;
          status?: 'pending_grading' | 'graded' | 'auto_graded';
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          student_id?: string;
          answers?: Array<{
            question_id: string;
            selected_answer?: number;
            text_answer?: string;
            is_correct: boolean;
            points_earned: number;
            manually_graded?: boolean;
            teacher_feedback?: string;
            question_text?: string;
            correct_answer?: string;
            points?: number;
          }>;
          score?: number;
          max_score?: number;
          status?: 'pending_grading' | 'graded' | 'auto_graded';
          completed_at?: string | null;
          created_at?: string;
        };
      };
      lecture_recordings: {
        Row: {
          id: string;
          course_id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          video_url: string;
          video_key: string;
          duration: number | null;
          file_size: number | null;
          thumbnail_url: string | null;
          is_published: boolean;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          video_url: string;
          video_key: string;
          duration?: number | null;
          file_size?: number | null;
          thumbnail_url?: string | null;
          is_published?: boolean;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          video_url?: string;
          video_key?: string;
          duration?: number | null;
          file_size?: number | null;
          thumbnail_url?: string | null;
          is_published?: boolean;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          type: 'recordings_only' | 'live_classes_only' | 'recordings_and_live';
          duration_months: number | null;
          duration_until_date: string | null;
          price_pkr: number;
          features: any; // JSONB
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'recordings_only' | 'live_classes_only' | 'recordings_and_live';
          duration_months?: number | null;
          duration_until_date?: string | null;
          price_pkr: number;
          features?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'recordings_only' | 'live_classes_only' | 'recordings_and_live';
          duration_months?: number | null;
          duration_until_date?: string | null;
          price_pkr?: number;
          features?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          subscription_plan_id: string;
          status: 'active' | 'expired' | 'cancelled';
          starts_at: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          subscription_plan_id: string;
          status?: 'active' | 'expired' | 'cancelled';
          starts_at?: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          subscription_plan_id?: string;
          status?: 'active' | 'expired' | 'cancelled';
          starts_at?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      demo_access: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          access_type: 'lecture_recording' | 'live_class';
          resource_id: string | null;
          used_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          access_type: 'lecture_recording' | 'live_class';
          resource_id?: string | null;
          used_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          access_type?: 'lecture_recording' | 'live_class';
          resource_id?: string | null;
          used_at?: string;
          expires_at?: string;
        };
      };
      live_classes: {
        Row: {
          id: string;
          course_id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          meeting_url: string | null;
          meeting_id: string | null;
          scheduled_date: string;
          duration_minutes: number;
          max_participants: number | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          meeting_url?: string | null;
          meeting_id?: string | null;
          scheduled_date: string;
          duration_minutes?: number;
          max_participants?: number | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          meeting_url?: string | null;
          meeting_id?: string | null;
          scheduled_at?: string;
          duration_minutes?: number;
          max_participants?: number | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          course_id: string;
          chapter_id: string | null;
          teacher_id: string;
          title: string;
          description: string | null;
          instructions: string | null;
          attachment_url: string | null;
          attachment_key: string | null;
          attachment_name: string | null;
          due_date: string | null;
          stop_submissions_after_due: boolean;
          max_points: number;
          allowed_file_types: string[];
          max_file_size_mb: number;
          max_submissions: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          chapter_id?: string | null;
          teacher_id: string;
          title: string;
          description?: string | null;
          instructions?: string | null;
          attachment_url?: string | null;
          attachment_key?: string | null;
          attachment_name?: string | null;
          due_date?: string | null;
          stop_submissions_after_due?: boolean;
          max_points?: number;
          allowed_file_types?: string[];
          max_file_size_mb?: number;
          max_submissions?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          chapter_id?: string | null;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          attachment_url?: string | null;
          attachment_key?: string | null;
          attachment_name?: string | null;
          due_date?: string | null;
          stop_submissions_after_due?: boolean;
          max_points?: number;
          allowed_file_types?: string[];
          max_file_size_mb?: number;
          max_submissions?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignment_submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          submission_number: number;
          file_url: string;
          file_key: string;
          file_name: string;
          file_size: number;
          file_type: string;
          submitted_at: string;
          grade: number | null;
          feedback: string | null;
          graded_by: string | null;
          graded_at: string | null;
          status: 'submitted' | 'graded' | 'returned';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          submission_number?: number;
          file_url: string;
          file_key: string;
          file_name: string;
          file_size: number;
          file_type: string;
          submitted_at?: string;
          grade?: number | null;
          feedback?: string | null;
          graded_by?: string | null;
          graded_at?: string | null;
          status?: 'submitted' | 'graded' | 'returned';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          submission_number?: number;
          file_url?: string;
          file_key?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          submitted_at?: string;
          grade?: number | null;
          feedback?: string | null;
          graded_by?: string | null;
          graded_at?: string | null;
          status?: 'submitted' | 'graded' | 'returned';
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          live_class_id: string;
          student_id: string;
          status: 'present' | 'absent' | 'late';
          marked_at: string;
          marked_by: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          live_class_id: string;
          student_id: string;
          status?: 'present' | 'absent' | 'late';
          marked_at?: string;
          marked_by: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          live_class_id?: string;
          student_id?: string;
          status?: 'present' | 'absent' | 'late';
          marked_at?: string;
          marked_by?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
