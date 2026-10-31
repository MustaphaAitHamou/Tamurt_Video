-- =============================================================================
-- Visionnage : liste, progression, sessions de lecture, recherche, catalogue.
-- =============================================================================

create table public.watchlist_items (
  viewer_profile_id uuid not null references public.viewer_profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  account_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_profile_id, title_id)
);
create index watchlist_items_account_idx on public.watchlist_items (account_id);
create index watchlist_items_title_idx on public.watchlist_items (title_id, created_at desc);

create table public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  viewer_profile_id uuid not null references public.viewer_profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  duration_seconds integer check (duration_seconds > 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint watch_progress_unique unique nulls not distinct (viewer_profile_id, title_id, episode_id)
);
create index watch_progress_profile_recent_idx on public.watch_progress (viewer_profile_id, updated_at desc);

-- Chaque ligne est une session de lecture : historique, écrans simultanés et statistiques.
create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  viewer_profile_id uuid not null references public.viewer_profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete set null,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  ended_at timestamptz,
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  last_position_seconds integer not null default 0,
  completed boolean not null default false,
  counted_view boolean not null default false,
  country_code text,
  device_label text
);
create index watch_history_active_idx on public.watch_history (account_id, last_heartbeat_at desc) where ended_at is null;
create index watch_history_profile_idx on public.watch_history (viewer_profile_id, started_at desc);
create index watch_history_title_idx on public.watch_history (title_id, started_at desc);
create index watch_history_started_idx on public.watch_history (started_at);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  viewer_profile_id uuid references public.viewer_profiles (id) on delete cascade,
  query text not null check (char_length(query) between 1 and 200),
  created_at timestamptz not null default now()
);
create index search_history_profile_idx on public.search_history (viewer_profile_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Sessions de lecture
-- -----------------------------------------------------------------------------

-- Ouvre une session après une décision d'accès favorable (rôle service).
create or replace function public.start_watch_session(
  p_user uuid,
  p_viewer_profile uuid,
  p_title uuid,
  p_episode uuid,
  p_asset uuid,
  p_country text,
  p_device_label text,
  p_max_streams integer
)
returns table (session_id uuid, allowed boolean, active_streams integer, resume_position_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timeout integer := public.setting_int('stream_heartbeat_timeout_seconds', 90);
  v_active integer;
  v_id uuid;
  v_resume integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('watch:' || p_user::text, 0));

  select count(*) into v_active
  from public.watch_history
  where account_id = p_user and ended_at is null
    and last_heartbeat_at > now() - make_interval(secs => v_timeout);

  if v_active >= greatest(coalesce(p_max_streams, 1), 1) then
    return query select null::uuid, false, v_active, 0;
    return;
  end if;

  select case
    when wp.completed then 0
    when wp.duration_seconds is not null and wp.position_seconds > wp.duration_seconds - 30 then 0
    else wp.position_seconds
  end into v_resume
  from public.watch_progress wp
  where wp.viewer_profile_id = p_viewer_profile and wp.title_id = p_title
    and wp.episode_id is not distinct from p_episode;

  insert into public.watch_history
    (account_id, viewer_profile_id, title_id, episode_id, media_asset_id, country_code, device_label, last_position_seconds)
  values
    (p_user, p_viewer_profile, p_title, p_episode, p_asset, p_country, left(p_device_label, 80), coalesce(v_resume, 0))
  returning id into v_id;

  return query select v_id, true, v_active + 1, coalesce(v_resume, 0);
end;
$$;

-- Enregistre la progression envoyée par le lecteur. La durée déclarée est
-- plafonnée par le temps réellement écoulé depuis le signal précédent.
create or replace function public.record_watch_progress(
  p_session uuid,
  p_position_seconds integer,
  p_duration_seconds integer,
  p_played_delta_seconds integer,
  p_event text default 'heartbeat'
)
returns table (ok boolean, is_completed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.watch_history;
  v_delta integer;
  v_duration integer;
  v_position integer;
  v_completed boolean;
  v_threshold integer;
begin
  if p_event not in ('heartbeat', 'pause', 'seek', 'ended', 'stop') then
    raise exception 'INVALID_EVENT' using errcode = '22023';
  end if;

  select * into v_session from public.watch_history
   where id = p_session and account_id = auth.uid()
   for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_session.ended_at is not null then
    return query select false, v_session.completed;
    return;
  end if;

  v_duration := nullif(greatest(coalesce(p_duration_seconds, 0), 0), 0);
  v_position := greatest(coalesce(p_position_seconds, 0), 0);
  if v_duration is not null then
    v_position := least(v_position, v_duration);
  end if;
  v_delta := least(
    greatest(coalesce(p_played_delta_seconds, 0), 0),
    ceil(extract(epoch from (now() - v_session.last_heartbeat_at)))::integer + 10,
    300
  );
  v_completed := p_event = 'ended'
    or (v_duration is not null and v_position >= floor(v_duration * 0.95));

  update public.watch_history set
    last_heartbeat_at = now(),
    last_position_seconds = v_position,
    watched_seconds = watched_seconds + v_delta,
    completed = completed or v_completed,
    ended_at = case when p_event in ('ended', 'stop') then now() else null end
  where id = v_session.id;

  insert into public.watch_progress
    (account_id, viewer_profile_id, title_id, episode_id, position_seconds, duration_seconds, completed, updated_at)
  values
    (v_session.account_id, v_session.viewer_profile_id, v_session.title_id, v_session.episode_id,
     v_position, v_duration, v_completed, now())
  on conflict on constraint watch_progress_unique do update set
    position_seconds = excluded.position_seconds,
    duration_seconds = coalesce(excluded.duration_seconds, public.watch_progress.duration_seconds),
    completed = excluded.completed,
    updated_at = now();

  -- Une vue compte pour la popularité après 5 minutes ou 20 % de la durée.
  v_threshold := least(300, greatest(30, coalesce(floor(v_duration * 0.2)::integer, 300)));
  if not v_session.counted_view and v_session.watched_seconds + v_delta >= v_threshold then
    update public.watch_history set counted_view = true where id = v_session.id;
    update public.titles set view_count = view_count + 1 where id = v_session.title_id;
  end if;

  return query select true, v_completed;
end;
$$;

-- Épisode suivant dans l'ordre saison / épisode.
create or replace function public.next_episode(p_episode uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with cur as (
    select e.title_id, s.season_number, e.episode_number
    from public.episodes e join public.seasons s on s.id = e.season_id
    where e.id = p_episode
  )
  select e.id
  from public.episodes e
  join public.seasons s on s.id = e.season_id
  join cur on cur.title_id = e.title_id
  where e.deleted_at is null and e.status = 'published' and e.published_at <= now()
    and (s.season_number, e.episode_number) > (cur.season_number, cur.episode_number)
  order by s.season_number, e.episode_number
  limit 1;
$$;

-- « Continuer à regarder » pour un profil de l'utilisateur courant.
create or replace function public.continue_watching(p_viewer_profile uuid, p_limit integer default 20)
returns table (
  title_id uuid,
  episode_id uuid,
  position_seconds integer,
  duration_seconds integer,
  is_next_episode boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select distinct on (wp.title_id)
      wp.title_id, wp.episode_id, wp.position_seconds, wp.duration_seconds, wp.completed, wp.updated_at
    from public.watch_progress wp
    join public.viewer_profiles vp on vp.id = wp.viewer_profile_id
    where wp.viewer_profile_id = p_viewer_profile and vp.account_id = auth.uid()
    order by wp.title_id, wp.updated_at desc
  ),
  resolved as (
    select
      l.title_id,
      case when l.completed and l.episode_id is not null then public.next_episode(l.episode_id) else l.episode_id end as episode_id,
      case when l.completed then 0 else l.position_seconds end as position_seconds,
      case when l.completed then null else l.duration_seconds end as duration_seconds,
      l.completed as is_next_episode,
      l.updated_at
    from latest l
  )
  select r.title_id, r.episode_id, r.position_seconds, r.duration_seconds, r.is_next_episode, r.updated_at
  from resolved r
  where public.is_title_visible(r.title_id)
    and (not r.is_next_episode or r.episode_id is not null)
  order by r.updated_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- -----------------------------------------------------------------------------
-- Catalogue et recherche (RLS appliquée : sécurité de l'appelant)
-- -----------------------------------------------------------------------------
create or replace function public.list_catalog(
  p_country text default null,
  p_kind public.title_kind default null,
  p_genre text default null,
  p_origin_country text default null,
  p_language text default null,
  p_year_min integer default null,
  p_year_max integer default null,
  p_tag text default null,
  p_collection text default null,
  p_status text default 'published',
  p_sort text default 'popular',
  p_max_age smallint default null,
  p_is_original boolean default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns setof public.titles
language sql
stable
security invoker
set search_path = ''
as $$
  select t.*
  from public.titles t
  left join lateral (
    select ci.position
    from public.collection_items ci
    join public.collections c on c.id = ci.collection_id
    where c.slug = p_collection and ci.title_id = t.id
  ) col on true
  where public.is_title_visible(t.id)
    and (p_status = 'any' or t.status::text = p_status)
    and (p_kind is null or t.kind = p_kind)
    and (p_genre is null or exists (
      select 1 from public.title_genres tg join public.genres g on g.id = tg.genre_id
      where tg.title_id = t.id and g.slug = p_genre))
    and (p_origin_country is null or p_origin_country = any (t.countries))
    and (p_language is null or p_language = any (t.original_languages) or p_language = any (t.audio_languages))
    and (p_year_min is null or t.release_year >= p_year_min)
    and (p_year_max is null or t.release_year <= p_year_max)
    and (p_tag is null or p_tag = any (t.tags))
    and (p_collection is null or col.position is not null)
    and (p_max_age is null or t.age_rating <= p_max_age)
    and (p_is_original is null or t.is_original = p_is_original)
    and public.title_is_available(t.id, p_country)
  order by
    case when p_sort = 'collection' then col.position end asc nulls last,
    case when p_sort = 'popular' then t.popularity_score end desc nulls last,
    case when p_sort = 'year' then t.release_year end desc nulls last,
    case when p_sort = 'title' then public.normalize_text(t.title) end asc,
    t.published_at desc nulls last,
    t.id
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.search_titles(
  p_query text,
  p_country text default null,
  p_max_age smallint default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  slug text,
  title text,
  original_title text,
  kind public.title_kind,
  status public.publication_status,
  release_year smallint,
  poster_path text,
  backdrop_path text,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select public.normalize_text(left(p_query, 200)) as nq, public.prefix_tsquery(p_query) as tsq
  )
  select t.id, t.slug, t.title, t.original_title, t.kind, t.status, t.release_year, t.poster_path, t.backdrop_path,
    (coalesce(ts_rank(t.search_vector, q.tsq), 0) * 2
      + extensions.similarity(public.normalize_text(t.title), q.nq)
      + least(t.popularity_score, 100) / 1000.0)::real as rank
  from public.titles t, q
  where q.nq <> ''
    and public.is_title_visible(t.id)
    and ((q.tsq is not null and t.search_vector @@ q.tsq)
         or extensions.similarity(public.normalize_text(t.title), q.nq) > 0.3)
    and (p_max_age is null or t.age_rating <= p_max_age)
    and public.title_is_available(t.id, p_country)
  order by rank desc, t.popularity_score desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Recalcul de la popularité (vues récentes pondérées et ajouts à « Ma liste »).
create or replace function public.refresh_popularity()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with activity as (
    select title_id, sum(exp(-extract(epoch from (now() - started_at)) / 1209600.0)) as views
    from public.watch_history
    where counted_view and started_at > now() - interval '90 days'
    group by title_id
  ),
  lists as (
    select title_id, count(*) as adds
    from public.watchlist_items
    where created_at > now() - interval '30 days'
    group by title_id
  ),
  scores as (
    select t.id, round((coalesce(a.views, 0) * 10 + coalesce(l.adds, 0) * 2)::numeric, 3)::double precision as score
    from public.titles t
    left join activity a on a.title_id = t.id
    left join lists l on l.title_id = t.id
  )
  update public.titles t set popularity_score = s.score
  from scores s
  where s.id = t.id and t.popularity_score is distinct from s.score;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Clôture des sessions sans signal (tâche planifiée).
create or replace function public.close_stale_watch_sessions()
returns integer
language sql
security definer
set search_path = ''
as $$
  with closed as (
    update public.watch_history
       set ended_at = last_heartbeat_at
     where ended_at is null
       and last_heartbeat_at < now() - make_interval(secs => public.setting_int('stream_heartbeat_timeout_seconds', 90) * 4)
    returning 1
  )
  select count(*)::integer from closed;
$$;

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.watchlist_items enable row level security;
alter table public.watch_progress enable row level security;
alter table public.watch_history enable row level security;
alter table public.search_history enable row level security;

grant select, insert, delete on public.watchlist_items to authenticated;
create policy watchlist_select on public.watchlist_items for select to authenticated
  using (account_id = (select auth.uid()));
create policy watchlist_insert on public.watchlist_items for insert to authenticated
  with check (
    account_id = (select auth.uid())
    and exists (select 1 from public.viewer_profiles vp where vp.id = viewer_profile_id and vp.account_id = (select auth.uid()))
    and public.is_title_visible(title_id)
  );
create policy watchlist_delete on public.watchlist_items for delete to authenticated
  using (account_id = (select auth.uid()));

grant select, delete on public.watch_progress to authenticated;
create policy watch_progress_select on public.watch_progress for select to authenticated
  using (account_id = (select auth.uid()));
create policy watch_progress_delete on public.watch_progress for delete to authenticated
  using (account_id = (select auth.uid()));

grant select, delete on public.watch_history to authenticated;
create policy watch_history_select on public.watch_history for select to authenticated
  using (account_id = (select auth.uid()));
create policy watch_history_delete on public.watch_history for delete to authenticated
  using (account_id = (select auth.uid()) and ended_at is not null);

grant select, insert, delete on public.search_history to authenticated;
create policy search_history_select on public.search_history for select to authenticated
  using (account_id = (select auth.uid()));
create policy search_history_insert on public.search_history for insert to authenticated
  with check (
    account_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.search_history_enabled)
    and (viewer_profile_id is null or exists (
      select 1 from public.viewer_profiles vp where vp.id = viewer_profile_id and vp.account_id = (select auth.uid())))
  );
create policy search_history_delete on public.search_history for delete to authenticated
  using (account_id = (select auth.uid()));

revoke execute on function public.start_watch_session(uuid, uuid, uuid, uuid, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.start_watch_session(uuid, uuid, uuid, uuid, uuid, text, text, integer) to service_role;
grant execute on function public.record_watch_progress(uuid, integer, integer, integer, text) to authenticated;
grant execute on function public.next_episode(uuid) to anon, authenticated;
grant execute on function public.continue_watching(uuid, integer) to authenticated;
grant execute on function public.list_catalog(text, public.title_kind, text, text, text, integer, integer, text, text, text, text, smallint, boolean, integer, integer) to anon, authenticated;
grant execute on function public.search_titles(text, text, smallint, integer) to anon, authenticated;
revoke execute on function public.refresh_popularity() from public, anon, authenticated;
grant execute on function public.refresh_popularity() to service_role;
revoke execute on function public.close_stale_watch_sessions() from public, anon, authenticated;
grant execute on function public.close_stale_watch_sessions() to service_role;
