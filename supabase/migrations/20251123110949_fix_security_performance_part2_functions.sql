/*
  # Fix Security Issues - Part 2: Function Search Paths
  
  This migration fixes function search paths to be immutable and secure.
*/

-- Drop and recreate calculate_final_score with secure search path
DROP FUNCTION IF EXISTS calculate_final_score(uuid);

CREATE FUNCTION calculate_final_score(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_program_type text;
  v_final_score numeric;
  v_total_weight numeric;
  v_weighted_sum numeric;
BEGIN
  SELECT type INTO v_program_type FROM programs WHERE id = p_program_id;
  
  SELECT 
    COALESCE(SUM(
      (s.score_value * sr.weight) / 
      (SELECT COUNT(DISTINCT grader_id) FROM scores WHERE program_id = p_program_id)
    ), 0),
    COALESCE(SUM(sr.weight), 0)
  INTO v_weighted_sum, v_total_weight
  FROM scores s
  JOIN scoring_rubrics sr ON s.standard_id = sr.id
  WHERE s.program_id = p_program_id 
    AND s.is_final = true
    AND sr.program_type = v_program_type;
  
  IF v_total_weight > 0 THEN
    v_final_score := v_weighted_sum / v_total_weight;
  ELSE
    v_final_score := 0;
  END IF;
  
  INSERT INTO final_scores (program_id, final_score)
  VALUES (p_program_id, v_final_score)
  ON CONFLICT (program_id) 
  DO UPDATE SET 
    final_score = EXCLUDED.final_score,
    updated_at = now();
END;
$$;

-- Drop and recreate update_user_workload with secure search path
DROP FUNCTION IF EXISTS update_user_workload() CASCADE;

CREATE FUNCTION update_user_workload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE users
    SET 
      total_assigned_programs = (
        SELECT COUNT(DISTINCT program_id)
        FROM panitia_assignments
        WHERE user_id = NEW.user_id
      ),
      total_assigned_roles = (
        SELECT jsonb_object_agg(role, count)
        FROM (
          SELECT role, COUNT(*) as count
          FROM panitia_assignments
          WHERE user_id = NEW.user_id
          GROUP BY role
        ) subq
      )
    WHERE id = NEW.user_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE users
    SET 
      total_assigned_programs = (
        SELECT COUNT(DISTINCT program_id)
        FROM panitia_assignments
        WHERE user_id = OLD.user_id
      ),
      total_assigned_roles = (
        SELECT jsonb_object_agg(role, count)
        FROM (
          SELECT role, COUNT(*) as count
          FROM panitia_assignments
          WHERE user_id = OLD.user_id
          GROUP BY role
        ) subq
      )
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_user_workload ON panitia_assignments;
CREATE TRIGGER trigger_update_user_workload
AFTER INSERT OR UPDATE OR DELETE ON panitia_assignments
FOR EACH ROW
EXECUTE FUNCTION update_user_workload();

-- Drop and recreate check_time_conflicts with secure search path
DROP FUNCTION IF EXISTS check_time_conflicts(uuid, timestamptz, timestamptz, uuid);

CREATE FUNCTION check_time_conflicts(
  p_user_id uuid,
  p_start_datetime timestamptz,
  p_end_datetime timestamptz,
  p_exclude_program_id uuid DEFAULT NULL
)
RETURNS TABLE (
  program_id uuid,
  program_name text,
  start_datetime timestamptz,
  end_datetime timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name,
    p.start_datetime - (p.preparation_days_before || ' days')::interval as start_datetime,
    p.end_datetime + (p.cleanup_days_after || ' days')::interval as end_datetime
  FROM programs p
  INNER JOIN panitia_assignments pa ON pa.program_id = p.id
  WHERE pa.user_id = p_user_id
    AND (p_exclude_program_id IS NULL OR p.id != p_exclude_program_id)
    AND (
      (p.start_datetime - (p.preparation_days_before || ' days')::interval, 
       p.end_datetime + (p.cleanup_days_after || ' days')::interval)
      OVERLAPS
      (p_start_datetime, p_end_datetime)
    );
END;
$$;

-- Drop and recreate get_available_members_for_timerange with secure search path
DROP FUNCTION IF EXISTS get_available_members_for_timerange(timestamptz, timestamptz);

CREATE FUNCTION get_available_members_for_timerange(
  p_start_datetime timestamptz,
  p_end_datetime timestamptz
)
RETURNS TABLE (
  id uuid,
  name text,
  nis text,
  commission_id uuid,
  total_assigned_programs int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.nis,
    u.commission_id,
    u.total_assigned_programs
  FROM users u
  WHERE u.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM panitia_assignments pa
      INNER JOIN programs p ON p.id = pa.program_id
      WHERE pa.user_id = u.id
        AND (
          (p.start_datetime - (p.preparation_days_before || ' days')::interval,
           p.end_datetime + (p.cleanup_days_after || ' days')::interval)
          OVERLAPS
          (p_start_datetime, p_end_datetime)
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM user_availability ua
      WHERE ua.user_id = u.id
        AND (ua.start_datetime, ua.end_datetime) OVERLAPS (p_start_datetime, p_end_datetime)
    );
END;
$$;

-- Drop and recreate check_user_overload with secure search path
DROP FUNCTION IF EXISTS check_user_overload() CASCADE;

CREATE FUNCTION check_user_overload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.total_assigned_programs > 5 AND OLD.total_assigned_programs <= 5 THEN
    INSERT INTO notifications (user_id, type, title, message, severity, metadata)
    VALUES (
      NEW.id,
      'workload_overload',
      'Workload Warning',
      'You have been assigned to more than 5 programs. Please review your assignments.',
      'warning',
      jsonb_build_object('total_programs', NEW.total_assigned_programs)
    );
    
    INSERT INTO notifications (user_id, type, title, message, severity, metadata)
    SELECT 
      u.id,
      'member_overload',
      'Member Overloaded',
      NEW.name || ' has been assigned to ' || NEW.total_assigned_programs || ' programs.',
      'warning',
      jsonb_build_object('member_id', NEW.id, 'member_name', NEW.name, 'total_programs', NEW.total_assigned_programs)
    FROM users u
    WHERE u.roles @> '["admin"]'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_check_user_overload ON users;
CREATE TRIGGER trigger_check_user_overload
AFTER UPDATE OF total_assigned_programs ON users
FOR EACH ROW
EXECUTE FUNCTION check_user_overload();
