/*
  # Fix All Critical Issues
  
  1. Fix calculate_final_score to use standard_code (not standard_id)
  2. Add is_final column to scores table if missing
  3. Update scores upsert to handle conflicts properly
*/

-- Check if is_final column exists, add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scores' AND column_name = 'is_final'
  ) THEN
    ALTER TABLE scores ADD COLUMN is_final boolean DEFAULT false;
  END IF;
END $$;

-- Recreate calculate_final_score with correct column names
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
  JOIN scoring_rubrics sr ON s.standard_code = sr.standard_code AND sr.program_type = v_program_type
  WHERE s.program_id = p_program_id 
    AND (s.is_final = true OR NOT EXISTS (SELECT 1 FROM scores WHERE program_id = p_program_id AND is_final = true))
    AND s.is_draft = false;
  
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
