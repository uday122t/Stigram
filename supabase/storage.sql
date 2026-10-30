-- Run this after schema.sql in the Supabase SQL Editor.
-- Creates the public sticker media bucket expected by the current frontend.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stigrams',
  'stigrams',
  true,
  10485760,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view Stigram media" on storage.objects;
create policy "Public can view Stigram media"
on storage.objects for select
using (bucket_id = 'stigrams');

drop policy if exists "Users upload to own Stigram folder" on storage.objects;
create policy "Users upload to own Stigram folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'stigrams'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own Stigram media" on storage.objects;
create policy "Users update own Stigram media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'stigrams'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'stigrams'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own Stigram media" on storage.objects;
create policy "Users delete own Stigram media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'stigrams'
  and (storage.foldername(name))[1] = auth.uid()::text
);
