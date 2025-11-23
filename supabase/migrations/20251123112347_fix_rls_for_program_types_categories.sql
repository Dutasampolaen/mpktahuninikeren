/*
  # Fix RLS Policies for Program Types and Categories
  
  The current policies only allow service_role to insert/update.
  We need to allow authenticated admin users to manage these tables.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage program types" ON program_types;
DROP POLICY IF EXISTS "Admins can manage program categories" ON program_categories;

-- Create new policies that check for admin role
CREATE POLICY "Authenticated users can view program types"
  ON program_types FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage program types"
  ON program_types FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));

CREATE POLICY "Authenticated users can view program categories"
  ON program_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage program categories"
  ON program_categories FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND roles @> '["admin"]'::jsonb));
