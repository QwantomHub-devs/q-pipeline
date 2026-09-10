-- Migration: 0008_module3_rls.sql
-- Description: Enables Row Level Security (RLS) for recorded_explanation_submissions with fellow ownership & admin policies.

ALTER TABLE recorded_explanation_submissions ENABLE ROW LEVEL SECURITY;

-- Submissions Policy: Fellows can view their own recorded explanation submissions
CREATE POLICY recorded_explanation_submissions_fellow_read_policy ON recorded_explanation_submissions
  FOR SELECT
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Submissions Policy: Fellows can insert/update their own recorded explanation submissions
CREATE POLICY recorded_explanation_submissions_fellow_write_policy ON recorded_explanation_submissions
  FOR ALL
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Admin Policy: Full access for admins across recorded explanation submissions
CREATE POLICY recorded_explanation_admin_all_policy ON recorded_explanation_submissions
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
