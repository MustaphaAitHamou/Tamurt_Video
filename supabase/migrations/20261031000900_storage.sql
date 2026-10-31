-- =============================================================================
-- Stockage Supabase : images publiques, sous-titres et justificatifs privés.
-- Les vidéos ne sont jamais stockées ici (Cloudflare Stream).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media-public', 'media-public', true, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('subtitles', 'subtitles', false, 2097152,
   array['text/vtt', 'text/plain']),
  ('rights-documents', 'rights-documents', false, 26214400,
   array['application/pdf', 'image/jpeg', 'image/png',
         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Images publiques : lecture via l'URL publique, écriture par l'équipe éditoriale.
create policy "media_public_staff_select" on storage.objects for select to authenticated
  using (bucket_id = 'media-public' and (public.has_permission('catalog.write') or public.has_permission('editorial.write')));
create policy "media_public_staff_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media-public' and (public.has_permission('catalog.write') or public.has_permission('editorial.write')));
create policy "media_public_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'media-public' and (public.has_permission('catalog.write') or public.has_permission('editorial.write')))
  with check (bucket_id = 'media-public' and (public.has_permission('catalog.write') or public.has_permission('editorial.write')));
create policy "media_public_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media-public' and (public.has_permission('catalog.write') or public.has_permission('editorial.write')));

-- Sous-titres : servis aux spectateurs par le serveur après contrôle des droits.
create policy "subtitles_staff_select" on storage.objects for select to authenticated
  using (bucket_id = 'subtitles' and public.has_permission('catalog.read_all'));
create policy "subtitles_staff_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'subtitles' and public.has_permission('catalog.write'));
create policy "subtitles_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'subtitles' and public.has_permission('catalog.write'))
  with check (bucket_id = 'subtitles' and public.has_permission('catalog.write'));
create policy "subtitles_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'subtitles' and public.has_permission('catalog.write'));

-- Justificatifs de droits : archivage privé, accès restreint aux gestionnaires des droits.
create policy "rights_documents_select" on storage.objects for select to authenticated
  using (bucket_id = 'rights-documents' and public.has_permission('rights.documents'));
create policy "rights_documents_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'rights-documents' and public.has_permission('rights.documents'));
create policy "rights_documents_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'rights-documents' and public.has_permission('rights.documents'));
