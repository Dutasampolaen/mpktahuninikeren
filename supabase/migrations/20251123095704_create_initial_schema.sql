/*
  # MPK System - Initial Database Schema
  
  This migration creates the complete database structure for the MPK scoring and panitia assignment system.
  
  ## Tables Created
  
  1. **commissions** - MPK commissions (Komisi A, B, C, etc.)
     - id, name, description, created_at
  
  2. **users** - MPK members with workload tracking
     - id, name, nis, class, commission_id, roles, is_active, email, password_hash
     - total_assigned_programs, total_assigned_roles, created_at, updated_at
  
  3. **user_availability** - Track when members are unavailable
     - id, user_id, unavailable_date_start, unavailable_date_end, reason, created_at
  
  4. **programs** - Program proposals with timing information
     - id, name, description, type, category, proposer_id, status
     - start_datetime, end_datetime, preparation_days_before, cleanup_days_after
     - target_date, created_at, updated_at
  
  5. **scoring_rubrics** - Scoring standards per program type
     - id, program_type, standard_code, description, max_score, weight, created_at
  
  6. **scores** - Individual grader scores with comments
     - id, program_id, grader_id, standard_code, score_value, comment, is_draft
     - created_at, updated_at
  
  7. **final_scores** - Calculated final scores
     - id, program_id, final_score, breakdown, overall_comment, calculated_at
  
  8. **panitia_assignment_batches** - Track bulk assignments
     - id, created_by, created_at, description, program_ids, status
  
  9. **panitia_revisions** - Assignment revision history
     - id, program_id, revision_number, created_by, created_at, description
     - assignments_snapshot, change_reason
  
  10. **panitia_assignments** - Committee member assignments
      - id, program_id, user_id, role, commission_id, is_required_role
      - is_locked, batch_id, revision_id, created_at
  
  11. **system_settings** - Global configuration
      - id, key, value, description, updated_at
  
  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users based on roles
*/

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nis text UNIQUE NOT NULL,
  class text NOT NULL,
  commission_id uuid REFERENCES commissions(id),
  roles jsonb DEFAULT '["member"]'::jsonb,
  is_active boolean DEFAULT true,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  total_assigned_programs integer DEFAULT 0,
  total_assigned_roles jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_availability table
CREATE TABLE IF NOT EXISTS user_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  unavailable_date_start timestamptz NOT NULL,
  unavailable_date_end timestamptz NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (unavailable_date_end > unavailable_date_start)
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  category text NOT NULL,
  proposer_id uuid REFERENCES users(id),
  status text DEFAULT 'draft',
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  preparation_days_before integer DEFAULT 0,
  cleanup_days_after integer DEFAULT 0,
  target_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_datetime_range CHECK (end_datetime > start_datetime)
);

-- Create scoring_rubrics table
CREATE TABLE IF NOT EXISTS scoring_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type text NOT NULL,
  standard_code text NOT NULL,
  description text NOT NULL,
  max_score integer NOT NULL,
  weight numeric(5,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT positive_max_score CHECK (max_score > 0),
  CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 100),
  UNIQUE(program_type, standard_code)
);

-- Create scores table
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  grader_id uuid REFERENCES users(id) NOT NULL,
  standard_code text NOT NULL,
  score_value numeric(10,2) NOT NULL,
  comment text,
  is_draft boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT positive_score CHECK (score_value >= 0),
  UNIQUE(program_id, grader_id, standard_code)
);

-- Create final_scores table
CREATE TABLE IF NOT EXISTS final_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE UNIQUE NOT NULL,
  final_score numeric(10,2) NOT NULL,
  breakdown jsonb DEFAULT '{}'::jsonb,
  overall_comment text,
  calculated_at timestamptz DEFAULT now()
);

-- Create panitia_assignment_batches table
CREATE TABLE IF NOT EXISTS panitia_assignment_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  description text,
  program_ids uuid[] DEFAULT '{}',
  status text DEFAULT 'active'
);

-- Create panitia_revisions table
CREATE TABLE IF NOT EXISTS panitia_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  revision_number integer NOT NULL,
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  description text,
  assignments_snapshot jsonb NOT NULL,
  change_reason text,
  UNIQUE(program_id, revision_number)
);

-- Create panitia_assignments table
CREATE TABLE IF NOT EXISTS panitia_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  role text NOT NULL,
  commission_id uuid REFERENCES commissions(id) NOT NULL,
  is_required_role boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  batch_id uuid REFERENCES panitia_assignment_batches(id),
  revision_id uuid REFERENCES panitia_revisions(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, user_id, role)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_commission ON users(commission_id);
CREATE INDEX IF NOT EXISTS idx_users_nis ON users(nis);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_availability_dates ON user_availability(user_id, unavailable_date_start, unavailable_date_end);
CREATE INDEX IF NOT EXISTS idx_programs_dates ON programs(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_type ON programs(type);
CREATE INDEX IF NOT EXISTS idx_scores_program ON scores(program_id);
CREATE INDEX IF NOT EXISTS idx_scores_grader ON scores(grader_id);
CREATE INDEX IF NOT EXISTS idx_panitia_program ON panitia_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_panitia_user ON panitia_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_panitia_batch ON panitia_assignments(batch_id);

-- Enable Row Level Security
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE panitia_assignment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE panitia_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panitia_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commissions (readable by all authenticated users)
CREATE POLICY "Commissions are viewable by authenticated users"
  ON commissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage commissions"
  ON commissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for user_availability
CREATE POLICY "Users can view own availability"
  ON user_availability FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own availability"
  ON user_availability FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all availability"
  ON user_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for programs
CREATE POLICY "Programs are viewable by authenticated users"
  ON programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create programs"
  ON programs FOR INSERT
  TO authenticated
  WITH CHECK (proposer_id = auth.uid());

CREATE POLICY "Proposers can update own programs"
  ON programs FOR UPDATE
  TO authenticated
  USING (proposer_id = auth.uid())
  WITH CHECK (proposer_id = auth.uid());

CREATE POLICY "Admins can manage all programs"
  ON programs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for scoring_rubrics
CREATE POLICY "Rubrics are viewable by authenticated users"
  ON scoring_rubrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rubrics"
  ON scoring_rubrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for scores
CREATE POLICY "Users can view all scores"
  ON scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Graders can manage own scores"
  ON scores FOR ALL
  TO authenticated
  USING (grader_id = auth.uid())
  WITH CHECK (grader_id = auth.uid());

CREATE POLICY "Admins can manage all scores"
  ON scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for final_scores
CREATE POLICY "Final scores are viewable by authenticated users"
  ON final_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage final scores"
  ON final_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for panitia_assignment_batches
CREATE POLICY "Batches are viewable by authenticated users"
  ON panitia_assignment_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage batches"
  ON panitia_assignment_batches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for panitia_revisions
CREATE POLICY "Revisions are viewable by authenticated users"
  ON panitia_revisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage revisions"
  ON panitia_revisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for panitia_assignments
CREATE POLICY "Assignments are viewable by authenticated users"
  ON panitia_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage assignments"
  ON panitia_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

-- RLS Policies for system_settings
CREATE POLICY "Settings are viewable by authenticated users"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );
