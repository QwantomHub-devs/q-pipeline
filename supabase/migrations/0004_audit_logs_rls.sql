-- Enable Row Level Security on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admin users can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy 2: Authenticated users/system can insert audit log events
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- IMMUTABILITY INVARIANT: Disallow UPDATE and DELETE policies for all non-superusers.
-- No UPDATE or DELETE policies created on audit_logs.
