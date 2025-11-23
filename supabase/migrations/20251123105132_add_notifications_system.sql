/*
  # Add Notifications System
  
  1. New Table
    - notifications: Store system notifications
  
  2. Changes
    - Trigger to create notification when user becomes overloaded
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text DEFAULT 'info',
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to check and notify on overload
CREATE OR REPLACE FUNCTION check_user_overload()
RETURNS TRIGGER AS $$
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
    
    -- Also notify admins
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
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_check_user_overload ON users;
CREATE TRIGGER trigger_check_user_overload
AFTER UPDATE OF total_assigned_programs ON users
FOR EACH ROW
EXECUTE FUNCTION check_user_overload();

-- Create index
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
