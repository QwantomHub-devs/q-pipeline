-- Migration: 0006_code_review_rls.sql
-- Description: Enables Row Level Security (RLS) for code_review_assignments & code_review_submissions with fellow ownership & admin access policies.

ALTER TABLE code_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_review_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments Policy: Public/Fellow read access for scenarios
CREATE POLICY code_review_assignments_read_policy ON code_review_assignments
  FOR SELECT
  USING (true);

-- Submissions Policy: Fellows can view their own code review submissions
CREATE POLICY code_review_submissions_fellow_read_policy ON code_review_submissions
  FOR SELECT
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Submissions Policy: Fellows can insert/update their own code review submissions
CREATE POLICY code_review_submissions_fellow_write_policy ON code_review_submissions
  FOR ALL
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Admin Policy: Full access for admins across code review assignments & submissions
CREATE POLICY code_review_admin_all_policy ON code_review_submissions
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
