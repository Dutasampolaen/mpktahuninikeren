import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'mpk-supabase-auth',
  },
  global: {
    headers: {
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
    },
  },
  db: {
    schema: 'public',
  },
});

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          nis: string;
          class: string;
          commission_id: string | null;
          roles: string[];
          is_active: boolean;
          email: string;
          total_assigned_programs: number;
          total_assigned_roles: Record<string, number>;
          created_at: string;
          updated_at: string;
        };
      };
      commissions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
      };
      programs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: string;
          category: string;
          proposer_id: string | null;
          status: string;
          start_datetime: string;
          end_datetime: string;
          preparation_days_before: number;
          cleanup_days_after: number;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      scoring_rubrics: {
        Row: {
          id: string;
          program_type: string;
          standard_code: string;
          description: string;
          max_score: number;
          weight: number;
          created_at: string;
        };
      };
      scores: {
        Row: {
          id: string;
          program_id: string;
          grader_id: string;
          standard_code: string;
          score_value: number;
          comment: string | null;
          is_draft: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      final_scores: {
        Row: {
          id: string;
          program_id: string;
          final_score: number;
          breakdown: Record<string, any>;
          overall_comment: string | null;
          calculated_at: string;
        };
      };
      panitia_assignments: {
        Row: {
          id: string;
          program_id: string;
          user_id: string;
          role: string;
          commission_id: string;
          is_required_role: boolean;
          is_locked: boolean;
          batch_id: string | null;
          revision_id: string | null;
          created_at: string;
        };
      };
      panitia_revisions: {
        Row: {
          id: string;
          program_id: string;
          revision_number: number;
          created_by: string;
          created_at: string;
          description: string | null;
          assignments_snapshot: Record<string, any>;
          change_reason: string | null;
        };
      };
      panitia_assignment_batches: {
        Row: {
          id: string;
          created_by: string;
          created_at: string;
          description: string | null;
          program_ids: string[];
          status: string;
        };
      };
    };
  };
}
