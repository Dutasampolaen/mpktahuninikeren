/*
  # Fix Users Table RLS Policies
  
  The previous policies had infinite recursion because they were querying
  the users table while checking users table permissions.
  
  This migration fixes the policies to avoid circular dependencies.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Create new simplified policies that don't cause recursion

-- Allow authenticated users to read all users (needed for the app)
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow service role (backend) to do everything
-- For admin operations, use service role key or create specific admin endpoints
CREATE POLICY "Service role can manage users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
