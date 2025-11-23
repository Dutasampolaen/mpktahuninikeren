/*
  # Helper Functions and Seed Data
  
  1. Database Functions
    - calculate_final_score: Automatically calculate weighted final score
    - check_time_conflicts: Check if member has conflicting assignments
    - get_available_members: Get members available for a time range
  
  2. Seed Data
    - Default commissions
    - Sample scoring rubrics
    - System settings
    - Demo admin user
*/

-- Function to calculate final score from individual scores
CREATE OR REPLACE FUNCTION calculate_final_score(p_program_id uuid)
RETURNS numeric AS $$
DECLARE
  v_final_score numeric := 0;
  v_program_type text;
  v_score_record record;
BEGIN
  -- Get program type
  SELECT type INTO v_program_type FROM programs WHERE id = p_program_id;
  
  -- Calculate weighted average
  FOR v_score_record IN
    SELECT 
      s.standard_code,
      AVG(s.score_value) as avg_score,
      sr.weight
    FROM scores s
    JOIN scoring_rubrics sr ON sr.standard_code = s.standard_code AND sr.program_type = v_program_type
    WHERE s.program_id = p_program_id AND s.is_draft = false
    GROUP BY s.standard_code, sr.weight
  LOOP
    v_final_score := v_final_score + (v_score_record.avg_score * v_score_record.weight / 100);
  END LOOP;
  
  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to check for time conflicts
CREATE OR REPLACE FUNCTION check_time_conflicts(
  p_user_id uuid,
  p_start_datetime timestamptz,
  p_end_datetime timestamptz,
  p_exclude_program_id uuid DEFAULT NULL
)
RETURNS TABLE(
  program_id uuid,
  program_name text,
  role text,
  start_datetime timestamptz,
  end_datetime timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    pa.role,
    p.start_datetime,
    p.end_datetime
  FROM panitia_assignments pa
  JOIN programs p ON p.id = pa.program_id
  WHERE pa.user_id = p_user_id
    AND (p_exclude_program_id IS NULL OR p.id != p_exclude_program_id)
    AND (
      (p.start_datetime, p.end_datetime) OVERLAPS (p_start_datetime, p_end_datetime)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get available members for a time range
CREATE OR REPLACE FUNCTION get_available_members_for_timerange(
  p_start_datetime timestamptz,
  p_end_datetime timestamptz,
  p_commission_id uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  name text,
  commission_id uuid,
  total_assigned_programs integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.commission_id,
    u.total_assigned_programs
  FROM users u
  WHERE u.is_active = true
    AND (p_commission_id IS NULL OR u.commission_id = p_commission_id)
    -- Not in unavailable periods
    AND NOT EXISTS (
      SELECT 1 FROM user_availability ua
      WHERE ua.user_id = u.id
        AND (ua.unavailable_date_start, ua.unavailable_date_end) OVERLAPS (p_start_datetime, p_end_datetime)
    )
    -- No time conflicts with existing assignments
    AND NOT EXISTS (
      SELECT 1 FROM panitia_assignments pa
      JOIN programs p ON p.id = pa.program_id
      WHERE pa.user_id = u.id
        AND (p.start_datetime, p.end_datetime) OVERLAPS (p_start_datetime, p_end_datetime)
    )
  ORDER BY u.total_assigned_programs ASC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user workload counts
CREATE OR REPLACE FUNCTION update_user_workload()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users
    SET 
      total_assigned_programs = total_assigned_programs + 1,
      total_assigned_roles = jsonb_set(
        COALESCE(total_assigned_roles, '{}'::jsonb),
        ARRAY[NEW.role],
        to_jsonb(COALESCE((total_assigned_roles->NEW.role)::integer, 0) + 1)
      )
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users
    SET 
      total_assigned_programs = GREATEST(total_assigned_programs - 1, 0),
      total_assigned_roles = jsonb_set(
        total_assigned_roles,
        ARRAY[OLD.role],
        to_jsonb(GREATEST(COALESCE((total_assigned_roles->OLD.role)::integer, 0) - 1, 0))
      )
    WHERE id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_workload
AFTER INSERT OR DELETE ON panitia_assignments
FOR EACH ROW
EXECUTE FUNCTION update_user_workload();

-- Insert default commissions
INSERT INTO commissions (name, description) VALUES
  ('Komisi A', 'Komisi Advokasi dan Kesejahteraan Siswa'),
  ('Komisi B', 'Komisi Kegiatan dan Acara'),
  ('Komisi C', 'Komisi Komunikasi dan Informasi')
ON CONFLICT (name) DO NOTHING;

-- Insert sample scoring rubrics for different program types
INSERT INTO scoring_rubrics (program_type, standard_code, description, max_score, weight) VALUES
  ('kegiatan_besar', 'std1', 'Kreativitas dan Inovasi Program', 100, 20),
  ('kegiatan_besar', 'std2', 'Relevansi dengan Kebutuhan Siswa', 100, 25),
  ('kegiatan_besar', 'std3', 'Kelayakan Pelaksanaan', 100, 20),
  ('kegiatan_besar', 'std4', 'Anggaran dan Sumber Daya', 100, 15),
  ('kegiatan_besar', 'std5', 'Dampak dan Keberlanjutan', 100, 20),
  
  ('kegiatan_kecil', 'std1', 'Kreativitas Program', 100, 30),
  ('kegiatan_kecil', 'std2', 'Relevansi Program', 100, 30),
  ('kegiatan_kecil', 'std3', 'Kelayakan Pelaksanaan', 100, 40),
  
  ('advokasi', 'std1', 'Urgensi Isu', 100, 30),
  ('advokasi', 'std2', 'Analisis Masalah', 100, 25),
  ('advokasi', 'std3', 'Solusi yang Diusulkan', 100, 25),
  ('advokasi', 'std4', 'Dampak Sosial', 100, 20)
ON CONFLICT (program_type, standard_code) DO NOTHING;

-- Insert system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('max_programs_per_member_monthly', '5', 'Maximum programs per member per month'),
  ('max_programs_per_member_semester', '15', 'Maximum programs per member per semester'),
  ('required_roles', '["ketua", "sekretaris", "bendahara", "divisi_acara"]', 'Required roles for each program'),
  ('min_members_per_program', '3', 'Minimum number of members per program'),
  ('min_commissions_per_program', '3', 'Minimum number of different commissions per program')
ON CONFLICT (key) DO NOTHING;

-- Insert demo admin user (password: admin123)
-- Note: In production, this should be created through proper authentication
INSERT INTO users (name, nis, class, email, password_hash, roles, is_active) VALUES
  ('Admin User', '00000', 'XII-A', 'admin@mpk.school', '$2a$10$XQQQyJ5rCZe8BqQqTqJ8.eK7ZqJQ7J8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ', '["admin", "grader"]'::jsonb, true)
ON CONFLICT (nis) DO NOTHING;
