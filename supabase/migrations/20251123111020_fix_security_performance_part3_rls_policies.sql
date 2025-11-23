/*
  # Fix Security Issues - Part 3: Optimize RLS Policies
  
  This migration optimizes all RLS policies by:
  1. Using (SELECT auth.uid()) instead of auth.uid() to prevent re-evaluation
  2. Consolidating duplicate permissive policies into single policies
*/

-- =============================================
-- USERS TABLE
-- =============================================
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- =============================================
-- PROGRAMS TABLE
-- =============================================
DROP POLICY IF EXISTS "Users can create programs" ON programs;
DROP POLICY IF EXISTS "Proposers can update own programs" ON programs;
DROP POLICY IF EXISTS "Admins can manage all programs" ON programs;
DROP POLICY IF EXISTS "Programs are viewable by authenticated users" ON programs;

CREATE POLICY "Programs viewable by authenticated"
  ON programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Programs manageable by proposers and admins"
  ON programs FOR ALL
  TO authenticated
  USING (
    proposer_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb)
  )
  WITH CHECK (
    proposer_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb)
  );

-- =============================================
-- SCORES TABLE
-- =============================================
DROP POLICY IF EXISTS "Graders can manage own scores" ON scores;
DROP POLICY IF EXISTS "Admins can manage all scores" ON scores;
DROP POLICY IF EXISTS "Users can view all scores" ON scores;

CREATE POLICY "Scores viewable by authenticated"
  ON scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Scores manageable by graders and admins"
  ON scores FOR ALL
  TO authenticated
  USING (
    grader_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb)
  )
  WITH CHECK (
    grader_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb)
  );

-- =============================================
-- FINAL_SCORES TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can manage final scores" ON final_scores;
DROP POLICY IF EXISTS "Final scores are viewable by authenticated users" ON final_scores;

CREATE POLICY "Final scores viewable by authenticated"
  ON final_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Final scores manageable by admins"
  ON final_scores FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

-- =============================================
-- PANITIA_ASSIGNMENTS TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can manage assignments" ON panitia_assignments;
DROP POLICY IF EXISTS "Assignments are viewable by authenticated users" ON panitia_assignments;

CREATE POLICY "Assignments viewable by authenticated"
  ON panitia_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Assignments manageable by admins"
  ON panitia_assignments FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

-- =============================================
-- PANITIA_REVISIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can manage revisions" ON panitia_revisions;
DROP POLICY IF EXISTS "Revisions are viewable by authenticated users" ON panitia_revisions;

CREATE POLICY "Revisions viewable by authenticated"
  ON panitia_revisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Revisions manageable by admins"
  ON panitia_revisions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

-- =============================================
-- PANITIA_ASSIGNMENT_BATCHES TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can manage batches" ON panitia_assignment_batches;
DROP POLICY IF EXISTS "Batches are viewable by authenticated users" ON panitia_assignment_batches;

CREATE POLICY "Batches viewable by authenticated"
  ON panitia_assignment_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Batches manageable by admins"
  ON panitia_assignment_batches FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

-- =============================================
-- SCORING_RUBRICS TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can manage rubrics" ON scoring_rubrics;
DROP POLICY IF EXISTS "Rubrics are viewable by authenticated users" ON scoring_rubrics;

CREATE POLICY "Rubrics viewable by authenticated"
  ON scoring_rubrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Rubrics manageable by admins"
  ON scoring_rubrics FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

-- =============================================
-- SYSTEM_SETTINGS TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;
DROP POLICY IF EXISTS "Settings are viewable by authenticated users" ON system_settings;

CREATE POLICY "Settings viewable by authenticated"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Settings manageable by admins"
  ON system_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

-- =============================================
-- COMMISSIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "Admins can manage commissions" ON commissions;
DROP POLICY IF EXISTS "Commissions are viewable by authenticated users" ON commissions;

CREATE POLICY "Commissions viewable by authenticated"
  ON commissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Commissions manageable by admins"
  ON commissions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

-- =============================================
-- USER_AVAILABILITY TABLE
-- =============================================
DROP POLICY IF EXISTS "Users can view own availability" ON user_availability;
DROP POLICY IF EXISTS "Users can manage own availability" ON user_availability;
DROP POLICY IF EXISTS "Admins can view all availability" ON user_availability;

CREATE POLICY "Availability viewable by user and admins"
  ON user_availability FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb)
  );

CREATE POLICY "Availability manageable by user and admins"
  ON user_availability FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb)
  );

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Notifications viewable by user"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR user_id IS NULL);

CREATE POLICY "Notifications manageable by user"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Notifications insertable by authenticated"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
