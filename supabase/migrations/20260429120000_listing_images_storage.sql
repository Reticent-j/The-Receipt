-- Public bucket for listing photos. Path convention: {auth.uid()}/{filename}
-- Apply in Supabase SQL editor or via CLI. See docs/MARKETPLACE.md if added.

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "listing_images_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'listing-images');

CREATE POLICY "listing_images_authenticated_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "listing_images_authenticated_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "listing_images_authenticated_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
