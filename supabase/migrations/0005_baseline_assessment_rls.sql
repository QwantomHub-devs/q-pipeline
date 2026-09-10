-- Migration: 0005_baseline_assessment_rls.sql
-- Description: Enables Row Level Security (RLS) for baseline_assessments table with fellow ownership & admin access policies.

ALTER TABLE baseline_assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Fellows can view their own baseline assessment record
CREATE POLICY baseline_assessments_fellow_read_policy ON baseline_assessments
  FOR SELECT
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Policy: Fellows can update their own baseline assessment record
CREATE POLICY baseline_assessments_fellow_update_policy ON baseline_assessments
  FOR UPDATE
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Policy: Admins have full access to all baseline assessment records
CREATE POLICY baseline_assessments_admin_all_policy ON baseline_assessments
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
