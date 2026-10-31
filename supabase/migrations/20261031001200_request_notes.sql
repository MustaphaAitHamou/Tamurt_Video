-- Notes internes sur les demandes : rédigées par l'équipe de modération ou des droits.
grant insert on public.content_request_notes to authenticated;
create policy content_request_notes_insert on public.content_request_notes for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (public.has_permission('requests.moderate') or public.has_permission('requests.confirm_acquisition'))
  );
