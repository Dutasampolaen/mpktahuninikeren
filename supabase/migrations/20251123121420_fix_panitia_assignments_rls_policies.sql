/*
  # Fix Panitia Assignments RLS Policies
  
  The current policies use cmd='ALL' which might not work properly.
  This migration splits them into explicit INSERT, UPDATE, DELETE policies.
  
  1. Changes
    - Drop existing 'ALL' policy
    - Create separate INSERT, UPDATE, DELETE policies for admins
    - Keep SELECT policy for authenticated users
*/

-- Drop existing admin policy
DROP POLICY IF EXISTS "Assignments manageable by admins" ON panitia_assignments;

-- Create explicit policies for each operation
CREATE POLICY "Admins can insert assignments"
  ON panitia_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

CREATE POLICY "Admins can update assignments"
  ON panitia_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );

CREATE POLICY "Admins can delete assignments"
  ON panitia_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );
