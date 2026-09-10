-- Enable Row Level Security on fellow_profiles table
ALTER TABLE fellow_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Fellows can read their own profile row
CREATE POLICY "Fellows can view own profile"
  ON fellow_profiles
  FOR SELECT
  USING (
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- Policy 2: Fellows can update their own profile row
CREATE POLICY "Fellows can update own profile"
  ON fellow_profiles
  FOR UPDATE
  USING (
    auth.jwt() ->> 'sub' = clerk_user_id
  )
  WITH CHECK (
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- Policy 3: Service role / Admin full access
CREATE POLICY "Service role full access"
  ON fellow_profiles
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin'
  );
