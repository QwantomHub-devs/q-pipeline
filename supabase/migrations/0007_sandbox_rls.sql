-- Migration: 0007_sandbox_rls.sql
-- Description: Enables Row Level Security (RLS) for build_sandbox_tickets & build_sandbox_submissions with fellow ownership & admin policies.

ALTER TABLE build_sandbox_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_sandbox_submissions ENABLE ROW LEVEL SECURITY;

-- Tickets Policy: All authenticated fellows can read ticket scenarios
CREATE POLICY build_sandbox_tickets_read_policy ON build_sandbox_tickets
  FOR SELECT
  USING (true);

-- Submissions Policy: Fellows can view their own build sandbox submissions
CREATE POLICY build_sandbox_submissions_fellow_read_policy ON build_sandbox_submissions
  FOR SELECT
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Submissions Policy: Fellows can insert/update their own build sandbox submissions
CREATE POLICY build_sandbox_submissions_fellow_write_policy ON build_sandbox_submissions
  FOR ALL
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Admin Policy: Full access for admins across sandbox tickets & submissions
CREATE POLICY build_sandbox_admin_all_policy ON build_sandbox_submissions
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
