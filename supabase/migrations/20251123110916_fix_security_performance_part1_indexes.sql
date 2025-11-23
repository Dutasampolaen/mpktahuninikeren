/*
  # Fix Security Issues - Part 1: Indexes and Basic Optimizations
  
  This migration adds missing indexes on foreign keys for better query performance.
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_panitia_assignment_batches_created_by 
  ON panitia_assignment_batches(created_by);

CREATE INDEX IF NOT EXISTS idx_panitia_assignments_commission_id 
  ON panitia_assignments(commission_id);

CREATE INDEX IF NOT EXISTS idx_panitia_assignments_revision_id 
  ON panitia_assignments(revision_id);

CREATE INDEX IF NOT EXISTS idx_panitia_revisions_created_by 
  ON panitia_revisions(created_by);

CREATE INDEX IF NOT EXISTS idx_programs_proposer_id 
  ON programs(proposer_id);
