/*
  # Enable Realtime for Key Tables
  
  Enable realtime subscriptions for tables that need live updates:
  - panitia_assignments: For live committee assignment updates
  - programs: For live program updates
  - users: For live user status updates
  - notifications: For live notification updates
*/

-- Enable realtime for panitia_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE panitia_assignments;

-- Enable realtime for programs
ALTER PUBLICATION supabase_realtime ADD TABLE programs;

-- Enable realtime for users (for workload updates)
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
