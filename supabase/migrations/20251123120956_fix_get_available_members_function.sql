/*
  # Fix get_available_members_for_timerange Function
  
  The function had wrong column names for user_availability table.
  - Changed ua.start_datetime to ua.unavailable_date_start
  - Changed ua.end_datetime to ua.unavailable_date_end
*/

CREATE OR REPLACE FUNCTION get_available_members_for_timerange(
  p_start_datetime timestamptz,
  p_end_datetime timestamptz
)
RETURNS TABLE(
  id uuid,
  name text,
  nis text,
  commission_id uuid,
  total_assigned_programs integer
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
    AND u.commission_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM panitia_assignments pa
      INNER JOIN programs p ON p.id = pa.program_id
      WHERE pa.user_id = u.id
        AND (
          (p.start_datetime - (COALESCE(p.preparation_days_before, 0) || ' days')::interval,
           p.end_datetime + (COALESCE(p.cleanup_days_after, 0) || ' days')::interval)
          OVERLAPS
          (p_start_datetime, p_end_datetime)
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM user_availability ua
      WHERE ua.user_id = u.id
        AND (ua.unavailable_date_start, ua.unavailable_date_end) OVERLAPS (p_start_datetime, p_end_datetime)
    )
  ORDER BY u.total_assigned_programs ASC, u.name ASC;
END;
$$;
