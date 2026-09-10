-- Migration: 0010_bootcamp_cohorts_rls.sql
-- Enables Row Level Security for bootcamp tracks, cohorts, enrollments, milestones, and progress.

-- 1. Enable RLS on all bootcamp tables
ALTER TABLE bootcamp_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootcamp_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootcamp_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE fellow_milestone_progress ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for bootcamp_tracks & cohorts (Public Read for Active Tracks, Admin Full Access)
CREATE POLICY "Public read active bootcamp tracks" ON bootcamp_tracks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access to bootcamp_tracks" ON bootcamp_tracks
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Public read active cohorts" ON cohorts
  FOR SELECT USING (status IN ('upcoming', 'active', 'completed'));

CREATE POLICY "Admin full access to cohorts" ON cohorts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 3. RLS Policies for bootcamp_enrollments
CREATE POLICY "Fellow read own enrollment" ON bootcamp_enrollments
  FOR SELECT USING (
    fellow_profile_id IN (
      SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Admin full access to bootcamp_enrollments" ON bootcamp_enrollments
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 4. RLS Policies for bootcamp_milestones & fellow_milestone_progress
CREATE POLICY "Enrolled fellows read milestones" ON bootcamp_milestones
  FOR SELECT USING (
    cohort_id IN (
      SELECT cohort_id FROM bootcamp_enrollments
      WHERE fellow_profile_id IN (
        SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

CREATE POLICY "Admin full access to bootcamp_milestones" ON bootcamp_milestones
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Fellow manage own milestone progress" ON fellow_milestone_progress
  FOR ALL USING (
    enrollment_id IN (
      SELECT id FROM bootcamp_enrollments
      WHERE fellow_profile_id IN (
        SELECT id FROM fellow_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

CREATE POLICY "Admin full access to fellow_milestone_progress" ON fellow_milestone_progress
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
