-- Run after creating a Storage bucket named "stigrams" in Supabase Storage.
-- Public reads; authenticated users may upload/update/delete only inside their own user-id folder.
create policy "Public sticker media read" on storage.objects for select
using (bucket_id = 'stigrams');
create policy "Users upload to own folder" on storage.objects for insert
with check (bucket_id = 'stigrams' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own media" on storage.objects for update
using (bucket_id = 'stigrams' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'stigrams' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own media" on storage.objects for delete
using (bucket_id = 'stigrams' and auth.uid()::text = (storage.foldername(name))[1]);
