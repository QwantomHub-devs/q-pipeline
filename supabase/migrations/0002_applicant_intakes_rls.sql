-- Enable Row Level Security on applicant_intakes table
ALTER TABLE applicant_intakes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Fellows can view their own intake record
CREATE POLICY "Fellows can view own applicant intake"
  ON applicant_intakes
  FOR SELECT
  USING (
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- Policy 2: Fellows can submit their own intake record
CREATE POLICY "Fellows can insert own applicant intake"
  ON applicant_intakes
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- Policy 3: Service role / Admin full access
CREATE POLICY "Service role full access on applicant intakes"
  ON applicant_intakes
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin'
  );
