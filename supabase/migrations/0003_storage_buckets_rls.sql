-- Create Supabase Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('resumes', 'resumes', true, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('certificates', 'certificates', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('contracts', 'contracts', false, 15728640, ARRAY['application/pdf']),
  ('module3_videos', 'module3_videos', false, 262144000, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Candidates can upload files into their own folder (folder name matching clerk_user_id)
CREATE POLICY "Users can upload to own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );

-- Policy 2: Candidates can view/download public bucket files or their own private files
CREATE POLICY "Users can view public or own private files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id IN ('resumes', 'certificates') OR
    auth.jwt() ->> 'sub' = (storage.foldername(name))[1]
  );

-- Policy 3: Service role / Admin full access on storage
CREATE POLICY "Service role full access on storage"
  ON storage.objects
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin'
  );
