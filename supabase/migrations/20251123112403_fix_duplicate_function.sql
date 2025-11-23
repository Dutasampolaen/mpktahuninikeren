/*
  # Fix Duplicate Function Issue
  
  Remove the old 3-parameter version and keep only the 2-parameter version.
*/

-- Drop the 3-parameter version
DROP FUNCTION IF EXISTS get_available_members_for_timerange(timestamptz, timestamptz, uuid);
