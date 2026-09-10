-- Migration: 0009_composite_scores_rls.sql
-- Description: Enables Row Level Security (RLS) for candidate_composite_scores with fellow ownership & admin governance policies.

ALTER TABLE candidate_composite_scores ENABLE ROW LEVEL SECURITY;

-- Read Policy: Fellows can view their own composite score & tier placement
CREATE POLICY candidate_composite_scores_fellow_read_policy ON candidate_composite_scores
  FOR SELECT
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Write Policy: Fellows can calculate their own initial composite score
CREATE POLICY candidate_composite_scores_fellow_write_policy ON candidate_composite_scores
  FOR ALL
  USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Admin Policy: Full access for admins to inspect leaderboards and override candidate tiers
CREATE POLICY candidate_composite_scores_admin_all_policy ON candidate_composite_scores
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
