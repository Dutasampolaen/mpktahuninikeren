/*
  # Add Admin Insert Policy for Users Table
  
  Allows admins to create new users through the Members page.
  
  1. Changes
    - Add INSERT policy for authenticated users with admin role
*/

CREATE POLICY "Admins can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'::jsonb
    )
  );
