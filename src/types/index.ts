export interface User {
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
}

export interface Commission {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Program {
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
}

export interface ScoringRubric {
  id: string;
  program_type: string;
  standard_code: string;
  description: string;
  max_score: number;
  weight: number;
  created_at: string;
}

export interface Score {
  id: string;
  program_id: string;
  grader_id: string;
  standard_code: string;
  score_value: number;
  comment: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinalScore {
  id: string;
  program_id: string;
  final_score: number;
  breakdown: Record<string, any>;
  overall_comment: string | null;
  calculated_at: string;
}

export interface PanitiaAssignment {
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
}

export interface PanitiaRevision {
  id: string;
  program_id: string;
  revision_number: number;
  created_by: string;
  created_at: string;
  description: string | null;
  assignments_snapshot: Record<string, any>;
  change_reason: string | null;
}

export interface PanitiaAssignmentBatch {
  id: string;
  created_by: string;
  created_at: string;
  description: string | null;
  program_ids: string[];
  status: string;
}

export const PROGRAM_TYPES = [
  { value: 'kegiatan_besar', label: 'Kegiatan Besar' },
  { value: 'kegiatan_kecil', label: 'Kegiatan Kecil' },
  { value: 'advokasi', label: 'Advokasi' },
];

export const PROGRAM_CATEGORIES = [
  { value: 'pendidikan', label: 'Pendidikan' },
  { value: 'sosial', label: 'Sosial' },
  { value: 'olahraga', label: 'Olahraga' },
  { value: 'seni_budaya', label: 'Seni & Budaya' },
  { value: 'lingkungan', label: 'Lingkungan' },
  { value: 'kesehatan', label: 'Kesehatan' },
];

export const PROGRAM_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export const PANITIA_ROLES = [
  { value: 'ketua', label: 'Ketua' },
  { value: 'wakil_ketua', label: 'Wakil Ketua' },
  { value: 'sekretaris', label: 'Sekretaris' },
  { value: 'bendahara', label: 'Bendahara' },
  { value: 'divisi_acara', label: 'Divisi Acara' },
  { value: 'divisi_humas', label: 'Divisi Humas' },
  { value: 'divisi_dokumentasi', label: 'Divisi Dokumentasi' },
  { value: 'divisi_konsumsi', label: 'Divisi Konsumsi' },
  { value: 'divisi_perlengkapan', label: 'Divisi Perlengkapan' },
  { value: 'divisi_dekorasi', label: 'Divisi Dekorasi' },
];
