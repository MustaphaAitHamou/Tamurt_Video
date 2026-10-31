-- =============================================================================
-- Communauté : demandes Premium, votes, notifications, actualités, roadmap.
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type ~ '^[a-z_]+\.[a-z_]+$'),
  title text not null,
  body text,
  link text check (link is null or link ~ '^/'),
  data jsonb not null default '{}'::jsonb,
  email_status text not null default 'none' check (email_status in ('none', 'pending', 'sent', 'skipped', 'failed')),
  email_attempts smallint not null default 0,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_email_pending_idx on public.notifications (created_at) where email_status = 'pending';

create or replace function public.notify(
  p_user uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_data jsonb default '{}'::jsonb,
  p_email boolean default false
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link, data, email_status)
  values (p_user, p_type, left(p_title, 200), left(p_body, 2000), p_link, coalesce(p_data, '{}'::jsonb),
          case when p_email then 'pending' else 'none' end)
  returning id;
$$;

-- Notifie l'équipe disposant d'une permission (alertes internes).
create or replace function public.notify_staff(
  p_permission text, p_type text, p_title text, p_body text default null, p_link text default null,
  p_data jsonb default '{}'::jsonb
)
returns integer
language sql
security definer
set search_path = ''
as $$
  with targets as (
    select distinct ur.user_id
    from public.user_roles ur join public.role_permissions rp on rp.role = ur.role
    where rp.permission = p_permission
  ), inserted as (
    insert into public.notifications (user_id, type, title, body, link, data, email_status)
    select user_id, p_type, left(p_title, 200), left(p_body, 2000), p_link, coalesce(p_data, '{}'::jsonb), 'pending'
    from targets
    returning 1
  )
  select count(*)::integer from inserted;
$$;

-- -----------------------------------------------------------------------------
-- Demandes de contenus (Premium)
-- -----------------------------------------------------------------------------
create table public.content_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  release_year smallint check (release_year between 1888 and 2100),
  country text check (char_length(country) <= 80),
  director text check (char_length(director) <= 160),
  content_type public.request_content_type not null,
  comment text check (char_length(comment) <= 2000),
  info_url text check (info_url ~* '^https?://[^\s]+$' and char_length(info_url) <= 500),
  normalized_title text not null default '',
  normalized_key text not null default '',
  status public.request_status not null default 'received',
  duplicate_of uuid references public.content_requests (id) on delete set null,
  vote_count integer not null default 0,
  is_hidden boolean not null default false,
  public_note text check (char_length(public_note) <= 1000),
  linked_title_id uuid references public.titles (id) on delete set null,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_requests_board_idx on public.content_requests (vote_count desc, created_at desc)
  where not is_hidden and duplicate_of is null;
create index content_requests_user_idx on public.content_requests (user_id, created_at desc);
create index content_requests_key_idx on public.content_requests (normalized_key);
create index content_requests_trgm on public.content_requests using gin (normalized_title extensions.gin_trgm_ops);
create index content_requests_linked_idx on public.content_requests (linked_title_id) where linked_title_id is not null;
create trigger content_requests_updated_at before update on public.content_requests
  for each row execute function public.set_updated_at();
create trigger content_requests_audit after update of status, is_hidden, duplicate_of, linked_title_id
  on public.content_requests for each row execute function public.audit_row_change('comment');

create table public.content_request_votes (
  request_id uuid not null references public.content_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
create index content_request_votes_user_idx on public.content_request_votes (user_id);

create table public.content_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.content_requests (id) on delete cascade,
  from_status public.request_status,
  to_status public.request_status not null,
  public_note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index content_request_events_request_idx on public.content_request_events (request_id, created_at);

-- Notes internes de l'équipe, jamais visibles par les membres.
create table public.content_request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.content_requests (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 2000),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index content_request_notes_request_idx on public.content_request_notes (request_id, created_at);

create or replace function public.content_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := public.setting_int('premium_requests_per_month', 10);
  v_recent integer;
  v_existing uuid;
begin
  new.title := btrim(new.title);
  new.normalized_title := public.normalize_text(new.title);
  new.normalized_key := new.normalized_title || '|' || coalesce(new.release_year::text, '');

  if auth.uid() is not null then
    select count(*) into v_recent from public.content_requests
     where user_id = auth.uid() and created_at > now() - interval '30 days';
    if v_recent >= v_limit then
      raise exception 'REQUEST_LIMIT: % demandes maximum par période de 30 jours.', v_limit using errcode = 'P0001';
    end if;

    select id into v_existing from public.content_requests
     where normalized_key = new.normalized_key and not is_hidden and duplicate_of is null
     limit 1;
    if v_existing is not null then
      raise exception 'DUPLICATE_REQUEST' using errcode = 'P0001', detail = v_existing::text;
    end if;
  end if;
  return new;
end;
$$;

create trigger content_requests_before_insert before insert on public.content_requests
  for each row execute function public.content_requests_before_insert();

create or replace function public.content_request_votes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.content_requests
     set vote_count = (select count(*) from public.content_request_votes where request_id = coalesce(new.request_id, old.request_id))
   where id = coalesce(new.request_id, old.request_id);
  return null;
end;
$$;

create trigger content_request_votes_count after insert or delete on public.content_request_votes
  for each row execute function public.content_request_votes_count();

-- Le demandeur vote automatiquement pour sa propre demande.
create or replace function public.content_requests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    insert into public.content_request_votes (request_id, user_id) values (new.id, new.user_id)
    on conflict do nothing;
  end if;
  insert into public.content_request_events (request_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, new.user_id);
  return null;
end;
$$;

create trigger content_requests_after_insert after insert on public.content_requests
  for each row execute function public.content_requests_after_insert();

create or replace function public.find_similar_requests(p_title text, p_year integer default null)
returns table (id uuid, title text, release_year smallint, status public.request_status, vote_count integer, similarity real)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.title, r.release_year, r.status, r.vote_count,
         extensions.similarity(r.normalized_title, public.normalize_text(p_title)) as similarity
  from public.content_requests r
  where not r.is_hidden and r.duplicate_of is null
    and public.normalize_text(p_title) <> ''
    and (r.normalized_title = public.normalize_text(p_title)
         or extensions.similarity(r.normalized_title, public.normalize_text(p_title)) > 0.4)
    and (p_year is null or r.release_year is null or abs(r.release_year - p_year) <= 1)
  order by similarity desc, r.vote_count desc
  limit 5;
$$;

-- Changement de statut avec matrice de permissions, historique et notifications.
create or replace function public.set_request_status(
  p_request uuid,
  p_status public.request_status,
  p_public_note text default null,
  p_internal_note text default null,
  p_linked_title uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.content_requests;
  v_labels jsonb := '{
    "received": "Demande reçue", "under_review": "En étude", "rights_search": "Recherche des ayants droit",
    "negotiation": "Négociation", "acquisition_confirmed": "Acquisition confirmée",
    "publication_planned": "Publication prévue", "available": "Disponible", "rejected": "Refusée",
    "impossible": "Impossible à acquérir"}'::jsonb;
begin
  if p_status in ('acquisition_confirmed', 'publication_planned', 'available') then
    if not public.has_permission('requests.confirm_acquisition') then
      raise exception 'FORBIDDEN: seule une personne habilitée aux droits peut confirmer une acquisition.' using errcode = '42501';
    end if;
  elsif not (public.has_permission('requests.moderate') or public.has_permission('requests.confirm_acquisition')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_req from public.content_requests where id = p_request for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_status = 'available' and coalesce(p_linked_title, v_req.linked_title_id) is null then
    raise exception 'LINKED_TITLE_REQUIRED: une demande disponible doit pointer vers l''œuvre publiée.' using errcode = 'P0001';
  end if;

  update public.content_requests
     set status = p_status,
         status_changed_at = case when status is distinct from p_status then now() else status_changed_at end,
         public_note = coalesce(nullif(btrim(p_public_note), ''), public_note),
         linked_title_id = coalesce(p_linked_title, linked_title_id)
   where id = p_request;

  insert into public.content_request_events (request_id, from_status, to_status, public_note, changed_by)
  values (p_request, v_req.status, p_status, nullif(btrim(p_public_note), ''), auth.uid());

  if nullif(btrim(p_internal_note), '') is not null then
    insert into public.content_request_notes (request_id, note, author_id)
    values (p_request, btrim(p_internal_note), auth.uid());
  end if;

  if v_req.status is distinct from p_status then
    insert into public.notifications (user_id, type, title, body, link, data, email_status)
    select distinct v.user_id, 'request.status_changed',
           'Demande « ' || left(v_req.title, 80) || ' » : ' || (v_labels ->> p_status::text),
           nullif(btrim(p_public_note), ''),
           '/demandes/' || p_request::text,
           jsonb_build_object('request_id', p_request, 'status', p_status),
           'pending'
    from public.content_request_votes v
    where v.request_id = p_request;
  end if;
end;
$$;

create or replace function public.moderate_content_request(p_request uuid, p_hidden boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('requests.moderate') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.content_requests set is_hidden = p_hidden where id = p_request;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_note), '') is not null then
    insert into public.content_request_notes (request_id, note, author_id)
    values (p_request, (case when p_hidden then 'Masquée : ' else 'Rétablie : ' end) || btrim(p_note), auth.uid());
  end if;
end;
$$;

-- Fusion d'un doublon : les votes sont reportés sur la demande conservée.
create or replace function public.merge_content_requests(p_duplicate uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('requests.moderate') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_duplicate = p_target then
    raise exception 'INVALID_MERGE' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.content_requests where id = p_target and duplicate_of is null) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  insert into public.content_request_votes (request_id, user_id, created_at)
  select p_target, user_id, created_at from public.content_request_votes where request_id = p_duplicate
  on conflict do nothing;
  update public.content_requests set duplicate_of = p_target where id = p_duplicate;
  insert into public.content_request_notes (request_id, note, author_id)
  values (p_duplicate, 'Fusionnée avec la demande ' || p_target::text, auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- Disponibilité d'une œuvre : notification des membres concernés
-- -----------------------------------------------------------------------------
create or replace function public.notify_title_available(p_title uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.titles;
  v_count integer := 0;
begin
  select * into v_title from public.titles
   where id = p_title and status = 'published' and published_at <= now()
     and availability_notified_at is null and deleted_at is null and takedown_at is null;
  if not found then
    return 0;
  end if;

  with targets as (
    select distinct w.account_id as user_id from public.watchlist_items w where w.title_id = p_title
    union
    select distinct v.user_id from public.content_request_votes v
    join public.content_requests r on r.id = v.request_id
    where r.linked_title_id = p_title
  ), inserted as (
    insert into public.notifications (user_id, type, title, body, link, data, email_status)
    select t.user_id, 'catalog.title_available', '« ' || left(v_title.title, 100) || ' » est disponible',
           'Une œuvre de votre liste ou de vos demandes vient d''être publiée.',
           '/titre/' || v_title.slug, jsonb_build_object('title_id', p_title), 'pending'
    from targets t
    returning 1
  )
  select count(*) into v_count from inserted;

  update public.content_requests set status = 'available', status_changed_at = now()
   where linked_title_id = p_title and status in ('acquisition_confirmed', 'publication_planned');

  update public.titles set availability_notified_at = now() where id = p_title;
  return v_count;
end;
$$;

create or replace function public.titles_after_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at <= now() and new.availability_notified_at is null then
    perform public.notify_title_available(new.id);
  end if;
  return null;
end;
$$;

create trigger titles_after_publication after insert or update of status, published_at on public.titles
  for each row execute function public.titles_after_publication();

-- Publications programmées arrivées à échéance (tâche planifiée).
create or replace function public.notify_due_publications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_total integer := 0;
begin
  for v_id in
    select id from public.titles
    where status = 'published' and published_at <= now() and availability_notified_at is null
      and deleted_at is null and takedown_at is null
  loop
    v_total := v_total + public.notify_title_available(v_id);
  end loop;
  return v_total;
end;
$$;

-- -----------------------------------------------------------------------------
-- Actualités et roadmap
-- -----------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text check (char_length(excerpt) <= 400),
  body text not null default '' check (char_length(body) <= 30000),
  category public.announcement_category not null default 'news',
  audience public.content_audience not null default 'public',
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  pinned boolean not null default false,
  partnership_authorized boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une annonce de partenariat exige une autorisation explicite de communication.
  check (category <> 'partnership' or status <> 'published' or partnership_authorized)
);
create index announcements_published_idx on public.announcements (published_at desc) where status = 'published';
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
create trigger announcements_audit after insert or update or delete on public.announcements
  for each row execute function public.audit_row_change('body');

create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 2000),
  category text not null default 'platform' check (category in ('platform', 'catalog', 'apps', 'community', 'business')),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done', 'paused')),
  target_label text check (char_length(target_label) <= 40),
  progress smallint not null default 0 check (progress between 0 and 100),
  position smallint not null default 0,
  is_public boolean not null default true,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger roadmap_items_updated_at before update on public.roadmap_items
  for each row execute function public.set_updated_at();

create or replace function public.can_view_audience(p_audience public.content_audience)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_audience
    when 'public' then true
    when 'members' then auth.uid() is not null
    when 'subscribers' then auth.uid() is not null
      and coalesce((select tier from public.get_entitlements_internal(auth.uid())), 'free') >= 'founder'
    when 'founders' then auth.uid() is not null
      and exists (select 1 from public.get_entitlements_internal(auth.uid()) e where e.plan_tier = 'founder')
    else false
  end or public.has_permission('editorial.write');
$$;

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.content_requests enable row level security;
alter table public.content_request_votes enable row level security;
alter table public.content_request_events enable row level security;
alter table public.content_request_notes enable row level security;
alter table public.announcements enable row level security;
alter table public.roadmap_items enable row level security;

grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.content_requests to authenticated;
grant insert (title, release_year, country, director, content_type, comment, info_url, user_id)
  on public.content_requests to authenticated;
create policy content_requests_select on public.content_requests for select to authenticated
  using (
    (not is_hidden and duplicate_of is null)
    or user_id = (select auth.uid())
    or public.has_permission('requests.moderate')
    or public.has_permission('requests.confirm_acquisition')
  );
create policy content_requests_insert on public.content_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_tier() = 'premium'
    and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.suspended_at is not null)
  );
create policy content_requests_delete_own on public.content_requests for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'received');

grant select, insert, delete on public.content_request_votes to authenticated;
create policy content_request_votes_select on public.content_request_votes for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('requests.moderate'));
create policy content_request_votes_insert on public.content_request_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_tier() = 'premium'
    and exists (
      select 1 from public.content_requests r
      where r.id = request_id and not r.is_hidden and r.duplicate_of is null
        and r.status not in ('available', 'rejected', 'impossible')
    )
  );
create policy content_request_votes_delete on public.content_request_votes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.content_request_events to authenticated;
create policy content_request_events_select on public.content_request_events for select to authenticated
  using (exists (select 1 from public.content_requests r where r.id = request_id));

grant select on public.content_request_notes to authenticated;
create policy content_request_notes_select on public.content_request_notes for select to authenticated
  using (public.has_permission('requests.moderate') or public.has_permission('requests.confirm_acquisition'));

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
create policy announcements_read on public.announcements for select to anon, authenticated
  using (
    (status = 'published' and published_at <= now() and public.can_view_audience(audience))
    or public.has_permission('editorial.write')
  );
create policy announcements_write on public.announcements for all to authenticated
  using (public.has_permission('editorial.write')) with check (public.has_permission('editorial.write'));

grant select on public.roadmap_items to anon, authenticated;
grant insert, update, delete on public.roadmap_items to authenticated;
create policy roadmap_read on public.roadmap_items for select to anon, authenticated
  using (is_public or public.has_permission('editorial.write'));
create policy roadmap_write on public.roadmap_items for all to authenticated
  using (public.has_permission('editorial.write')) with check (public.has_permission('editorial.write'));

revoke execute on function public.notify(uuid, text, text, text, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.notify(uuid, text, text, text, text, jsonb, boolean) to service_role;
revoke execute on function public.notify_staff(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.notify_staff(text, text, text, text, text, jsonb) to service_role;
grant execute on function public.find_similar_requests(text, integer) to authenticated;
grant execute on function public.set_request_status(uuid, public.request_status, text, text, uuid) to authenticated;
grant execute on function public.moderate_content_request(uuid, boolean, text) to authenticated;
grant execute on function public.merge_content_requests(uuid, uuid) to authenticated;
revoke execute on function public.notify_title_available(uuid) from public, anon, authenticated;
grant execute on function public.notify_title_available(uuid) to service_role;
revoke execute on function public.notify_due_publications() from public, anon, authenticated;
grant execute on function public.notify_due_publications() to service_role;
grant execute on function public.can_view_audience(public.content_audience) to anon, authenticated;
