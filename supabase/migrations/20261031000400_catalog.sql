-- =============================================================================
-- Catalogue : genres, personnes, œuvres, saisons, épisodes, médias,
-- sous-titres, collections et sections éditoriales de l'accueil.
-- =============================================================================

create table public.genres (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  labels jsonb not null check (labels ? 'fr'),
  position smallint not null default 0
);

insert into public.genres (slug, labels, position) values
  ('drame', '{"fr": "Drame", "en": "Drama", "ar": "دراما", "kab": "Drama"}', 1),
  ('comedie', '{"fr": "Comédie", "en": "Comedy", "ar": "كوميديا", "kab": "Taḍsa"}', 2),
  ('comedie-dramatique', '{"fr": "Comédie dramatique", "en": "Comedy-drama", "ar": "كوميديا درامية"}', 3),
  ('historique', '{"fr": "Historique", "en": "Historical", "ar": "تاريخي", "kab": "Amezruy"}', 4),
  ('societe', '{"fr": "Société", "en": "Society", "ar": "مجتمع"}', 5),
  ('culture-patrimoine', '{"fr": "Culture et patrimoine", "en": "Culture & heritage", "ar": "ثقافة وتراث"}', 6),
  ('famille', '{"fr": "Famille", "en": "Family", "ar": "عائلي", "kab": "Tawacult"}', 7),
  ('romance', '{"fr": "Romance", "en": "Romance", "ar": "رومانسي"}', 8),
  ('policier', '{"fr": "Policier", "en": "Crime", "ar": "بوليسي"}', 9),
  ('thriller', '{"fr": "Thriller", "en": "Thriller", "ar": "إثارة"}', 10),
  ('action', '{"fr": "Action", "en": "Action", "ar": "حركة"}', 11),
  ('aventure', '{"fr": "Aventure", "en": "Adventure", "ar": "مغامرة"}', 12),
  ('fantastique', '{"fr": "Fantastique", "en": "Fantasy", "ar": "خيال"}', 13),
  ('science-fiction', '{"fr": "Science-fiction", "en": "Science fiction", "ar": "خيال علمي"}', 14),
  ('animation', '{"fr": "Animation", "en": "Animation", "ar": "رسوم متحركة"}', 15),
  ('jeunesse', '{"fr": "Jeunesse", "en": "Kids", "ar": "أطفال", "kab": "Igerdan"}', 16),
  ('musique', '{"fr": "Musique", "en": "Music", "ar": "موسيقى", "kab": "Aẓawan"}', 17),
  ('biographie', '{"fr": "Biographie", "en": "Biography", "ar": "سيرة ذاتية"}', 18),
  ('guerre', '{"fr": "Guerre", "en": "War", "ar": "حرب"}', 19),
  ('nature', '{"fr": "Nature", "en": "Nature", "ar": "طبيعة"}', 20),
  ('humour', '{"fr": "Humour", "en": "Stand-up & sketches", "ar": "فكاهة"}', 21),
  ('magazine', '{"fr": "Magazine", "en": "Magazine", "ar": "مجلة"}', 22);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  full_name text not null check (char_length(full_name) between 1 and 160),
  original_name text,
  bio text,
  photo_path text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index people_name_trgm on public.people using gin (public.normalize_text(full_name) extensions.gin_trgm_ops);
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

create table public.titles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind public.title_kind not null,
  structure public.title_structure not null default 'single',
  title text not null check (char_length(title) between 1 and 200),
  original_title text,
  alternative_titles text[] not null default '{}',
  tagline text check (char_length(tagline) <= 200),
  synopsis_short text check (char_length(synopsis_short) <= 500),
  description_long text check (char_length(description_long) <= 10000),
  release_year smallint check (release_year between 1888 and 2100),
  countries text[] not null default '{}' check (array_to_string(countries, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$'),
  original_languages text[] not null default '{}',
  audio_languages text[] not null default '{}',
  runtime_minutes smallint check (runtime_minutes between 1 and 1000),
  age_rating smallint not null default 0 check (age_rating in (0, 10, 12, 16, 18)),
  content_warnings text[] not null default '{}',
  poster_path text,
  backdrop_path text,
  logo_path text,
  min_tier public.plan_tier not null default 'standard',
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  is_original boolean not null default false,
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  tags text[] not null default '{}',
  main_asset_id uuid,
  trailer_asset_id uuid,
  intro_start_seconds integer check (intro_start_seconds >= 0),
  intro_end_seconds integer check (intro_end_seconds >= 0),
  credits_start_seconds integer check (credits_start_seconds >= 0),
  popularity_score double precision not null default 0,
  view_count bigint not null default 0,
  availability_notified_at timestamptz,
  takedown_at timestamptz,
  takedown_reason text,
  search_vector tsvector,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (intro_end_seconds is null or intro_start_seconds is null or intro_end_seconds > intro_start_seconds),
  check (kind not in ('series', 'show') or structure = 'episodic'),
  check (kind not in ('film', 'short') or structure = 'single')
);

create index titles_status_published_idx on public.titles (status, published_at desc) where deleted_at is null;
create index titles_kind_idx on public.titles (kind) where deleted_at is null;
create index titles_popularity_idx on public.titles (popularity_score desc) where deleted_at is null;
create index titles_release_year_idx on public.titles (release_year);
create index titles_countries_idx on public.titles using gin (countries);
create index titles_languages_idx on public.titles using gin (original_languages);
create index titles_tags_idx on public.titles using gin (tags);
create index titles_search_idx on public.titles using gin (search_vector);
create index titles_title_trgm on public.titles using gin (public.normalize_text(title) extensions.gin_trgm_ops);

create trigger titles_updated_at before update on public.titles
  for each row execute function public.set_updated_at();
create trigger titles_audit after insert or update or delete on public.titles
  for each row execute function public.audit_row_change('description_long', 'synopsis_short', 'availability_notified_at');

create table public.title_genres (
  title_id uuid not null references public.titles (id) on delete cascade,
  genre_id smallint not null references public.genres (id) on delete cascade,
  primary key (title_id, genre_id)
);
create index title_genres_genre_idx on public.title_genres (genre_id);

create table public.credits (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  role public.credit_role not null,
  character_name text,
  position smallint not null default 0,
  constraint credits_unique unique nulls not distinct (title_id, person_id, role, character_name)
);
create index credits_title_idx on public.credits (title_id, role, position);
create index credits_person_idx on public.credits (person_id);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles (id) on delete cascade,
  season_number smallint not null check (season_number between 0 and 200),
  name text,
  synopsis text,
  release_year smallint check (release_year between 1888 and 2100),
  poster_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title_id, season_number),
  unique (id, title_id)
);
create trigger seasons_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles (id) on delete cascade,
  season_id uuid not null,
  episode_number smallint not null check (episode_number between 0 and 2000),
  name text not null check (char_length(name) between 1 and 200),
  synopsis text check (char_length(synopsis) <= 2000),
  runtime_minutes smallint check (runtime_minutes between 1 and 1000),
  still_path text,
  main_asset_id uuid,
  intro_start_seconds integer check (intro_start_seconds >= 0),
  intro_end_seconds integer check (intro_end_seconds >= 0),
  credits_start_seconds integer check (credits_start_seconds >= 0),
  status public.publication_status not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (season_id, episode_number),
  foreign key (season_id, title_id) references public.seasons (id, title_id) on delete cascade,
  check (intro_end_seconds is null or intro_start_seconds is null or intro_end_seconds > intro_start_seconds)
);
create index episodes_title_idx on public.episodes (title_id);
create trigger episodes_updated_at before update on public.episodes
  for each row execute function public.set_updated_at();
create trigger episodes_audit after insert or update or delete on public.episodes
  for each row execute function public.audit_row_change('synopsis');

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind public.media_kind not null default 'main',
  provider public.media_provider not null,
  provider_asset_id text,
  status public.media_status not null default 'pending_upload',
  title_id uuid references public.titles (id) on delete set null,
  episode_id uuid references public.episodes (id) on delete set null,
  duration_seconds integer check (duration_seconds >= 0),
  width integer,
  height integer,
  qualities text[] not null default '{}',
  size_bytes bigint,
  original_filename text,
  rights_attestation jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (provider, provider_asset_id)
);
create index media_assets_title_idx on public.media_assets (title_id);
create index media_assets_episode_idx on public.media_assets (episode_id);
create trigger media_assets_updated_at before update on public.media_assets
  for each row execute function public.set_updated_at();
create trigger media_assets_audit after insert or update or delete on public.media_assets
  for each row execute function public.audit_row_change('metadata');

alter table public.titles
  add constraint titles_main_asset_fk foreign key (main_asset_id) references public.media_assets (id) on delete set null,
  add constraint titles_trailer_asset_fk foreign key (trailer_asset_id) references public.media_assets (id) on delete set null;
alter table public.episodes
  add constraint episodes_main_asset_fk foreign key (main_asset_id) references public.media_assets (id) on delete set null;

create table public.subtitles (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets (id) on delete cascade,
  language text not null check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  label text not null check (char_length(label) between 1 and 60),
  kind text not null default 'subtitles' check (kind in ('subtitles', 'captions', 'forced')),
  storage_path text not null,
  is_default boolean not null default false,
  is_machine_generated boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (media_asset_id, language, kind)
);
create index subtitles_asset_idx on public.subtitles (media_asset_id);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  position smallint not null default 0,
  primary key (collection_id, title_id)
);
create index collection_items_position_idx on public.collection_items (collection_id, position);

create table public.home_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 80),
  title_i18n jsonb not null default '{}'::jsonb,
  source public.home_section_source not null,
  config jsonb not null default '{}'::jsonb,
  layout text not null default 'poster' check (layout in ('poster', 'landscape', 'top10', 'large')),
  max_items smallint not null default 20 check (max_items between 1 and 50),
  audience text not null default 'all' check (audience in ('all', 'visitors', 'members', 'subscribers')),
  position smallint not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index home_sections_position_idx on public.home_sections (position) where is_active;
create trigger home_sections_updated_at before update on public.home_sections
  for each row execute function public.set_updated_at();
create trigger home_sections_audit after insert or update or delete on public.home_sections
  for each row execute function public.audit_row_change();

create table public.home_banners (
  id uuid primary key default gen_random_uuid(),
  title_id uuid references public.titles (id) on delete cascade,
  headline text not null check (char_length(headline) between 1 and 120),
  subheadline text check (char_length(subheadline) <= 300),
  cta_label text check (char_length(cta_label) <= 40),
  cta_href text check (cta_href ~ '^/[^/]' or cta_href ~ '^https://'),
  image_path text,
  audience text not null default 'all' check (audience in ('all', 'visitors', 'members', 'subscribers')),
  position smallint not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger home_banners_updated_at before update on public.home_banners
  for each row execute function public.set_updated_at();
create trigger home_banners_audit after insert or update or delete on public.home_banners
  for each row execute function public.audit_row_change();

insert into public.collections (slug, name, description)
values ('selection-tamurt', 'Sélection Tamurt', 'Les œuvres mises en avant par l''équipe éditoriale.');

insert into public.home_sections (slug, title, title_i18n, source, config, layout, max_items, audience, position) values
  ('continuer', 'Continuer à regarder', '{"en": "Continue watching", "ar": "متابعة المشاهدة"}', 'continue_watching', '{}', 'landscape', 20, 'members', 10),
  ('ma-liste', 'Ma liste', '{"en": "My list", "ar": "قائمتي"}', 'watchlist', '{}', 'poster', 20, 'members', 20),
  ('pour-vous', 'Suggestions pour vous', '{"en": "Suggested for you", "ar": "مقترحات لك"}', 'recommended', '{}', 'poster', 20, 'members', 30),
  ('selection-tamurt', 'Sélection Tamurt', '{"en": "Tamurt picks", "ar": "مختارات تامورت"}', 'collection', '{"collection": "selection-tamurt"}', 'large', 12, 'all', 40),
  ('nouveautes', 'Nouveautés', '{"en": "New on Tamurt", "ar": "جديد"}', 'new', '{}', 'poster', 20, 'all', 50),
  ('films-populaires', 'Films populaires', '{"en": "Popular films", "ar": "أفلام رائجة"}', 'popular', '{"kind": "film"}', 'poster', 20, 'all', 60),
  ('series-populaires', 'Séries populaires', '{"en": "Popular series", "ar": "مسلسلات رائجة"}', 'popular', '{"kind": "series"}', 'top10', 10, 'all', 70),
  ('productions-algeriennes', 'Productions algériennes', '{"en": "Made in Algeria", "ar": "إنتاجات جزائرية"}', 'filter', '{"country": "DZ"}', 'poster', 20, 'all', 80),
  ('series-ramadan', 'Séries du Ramadan', '{"en": "Ramadan series", "ar": "مسلسلات رمضان"}', 'filter', '{"tag": "ramadan"}', 'landscape', 20, 'all', 90),
  ('documentaires', 'Documentaires', '{"en": "Documentaries", "ar": "وثائقيات"}', 'filter', '{"kind": "documentary"}', 'landscape', 20, 'all', 100),
  ('prochainement', 'Prochainement', '{"en": "Coming soon", "ar": "قريبًا"}', 'coming_soon', '{}', 'poster', 20, 'all', 110);

-- -----------------------------------------------------------------------------
-- Visibilité et recherche
-- -----------------------------------------------------------------------------
create or replace function public.is_title_visible(p_title uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.titles t
    where t.id = p_title
      and t.deleted_at is null
      and t.takedown_at is null
      and (
        t.status = 'announced'
        or (t.status = 'published' and t.published_at is not null and t.published_at <= now())
      )
      and (not t.is_demo or public.setting_bool('show_demo_content', false))
  );
$$;

create or replace function public.compute_title_search_vector(p_title uuid)
returns tsvector
language sql
stable
security definer
set search_path = ''
as $$
  select
    setweight(to_tsvector('simple', public.normalize_text(t.title)), 'A') ||
    setweight(to_tsvector('simple', public.normalize_text(
      coalesce(t.original_title, '') || ' ' || array_to_string(t.alternative_titles, ' '))), 'A') ||
    setweight(to_tsvector('simple', public.normalize_text(coalesce((
      select string_agg(p.full_name || ' ' || coalesce(p.original_name, ''), ' ')
      from public.credits c join public.people p on p.id = c.person_id
      where c.title_id = t.id
    ), ''))), 'B') ||
    setweight(to_tsvector('simple', public.normalize_text(array_to_string(t.tags, ' '))), 'C') ||
    setweight(to_tsvector('simple', public.normalize_text(coalesce(t.synopsis_short, ''))), 'D')
  from public.titles t
  where t.id = p_title;
$$;

create or replace function public.titles_search_vector_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', public.normalize_text(new.title)), 'A') ||
    setweight(to_tsvector('simple', public.normalize_text(
      coalesce(new.original_title, '') || ' ' || array_to_string(new.alternative_titles, ' '))), 'A') ||
    setweight(to_tsvector('simple', public.normalize_text(coalesce((
      select string_agg(p.full_name || ' ' || coalesce(p.original_name, ''), ' ')
      from public.credits c join public.people p on p.id = c.person_id
      where c.title_id = new.id
    ), ''))), 'B') ||
    setweight(to_tsvector('simple', public.normalize_text(array_to_string(new.tags, ' '))), 'C') ||
    setweight(to_tsvector('simple', public.normalize_text(coalesce(new.synopsis_short, ''))), 'D');
  return new;
end;
$$;

create trigger titles_search_vector before insert or update of title, original_title, alternative_titles, tags, synopsis_short
  on public.titles for each row execute function public.titles_search_vector_trigger();

create or replace function public.credits_refresh_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title uuid := coalesce(new.title_id, old.title_id);
begin
  update public.titles set search_vector = public.compute_title_search_vector(v_title) where id = v_title;
  if tg_op = 'UPDATE' and old.title_id <> new.title_id then
    update public.titles set search_vector = public.compute_title_search_vector(old.title_id) where id = old.title_id;
  end if;
  return null;
end;
$$;

create trigger credits_search_refresh after insert or update or delete on public.credits
  for each row execute function public.credits_refresh_search();

create or replace function public.people_refresh_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.titles t set search_vector = public.compute_title_search_vector(t.id)
  where t.id in (select c.title_id from public.credits c where c.person_id = new.id);
  return null;
end;
$$;

create trigger people_search_refresh after update of full_name, original_name on public.people
  for each row execute function public.people_refresh_search();

-- Construit une requête plein texte préfixée et sûre à partir d'un texte libre.
create or replace function public.prefix_tsquery(p_query text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select case
    when count(*) = 0 then null
    else to_tsquery('simple', string_agg(quote_literal(lexeme) || ':*', ' & '))
  end
  from unnest(to_tsvector('simple', public.normalize_text(left(p_query, 200))));
$$;

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.genres enable row level security;
alter table public.people enable row level security;
alter table public.titles enable row level security;
alter table public.title_genres enable row level security;
alter table public.credits enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.media_assets enable row level security;
alter table public.subtitles enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.home_sections enable row level security;
alter table public.home_banners enable row level security;

-- Genres
grant select on public.genres to anon, authenticated;
grant insert, update, delete on public.genres to authenticated;
create policy genres_read on public.genres for select to anon, authenticated using (true);
create policy genres_write on public.genres for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

-- Personnes
grant select on public.people to anon, authenticated;
grant insert, update, delete on public.people to authenticated;
create policy people_read on public.people for select to anon, authenticated
  using (not is_demo or public.setting_bool('show_demo_content', false) or public.has_permission('catalog.read_all'));
create policy people_write on public.people for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

-- Œuvres
grant select on public.titles to anon, authenticated;
grant insert, update on public.titles to authenticated;
create policy titles_read_public on public.titles for select to anon, authenticated
  using (public.is_title_visible(id));
create policy titles_read_staff on public.titles for select to authenticated
  using (public.has_permission('catalog.read_all'));
create policy titles_insert on public.titles for insert to authenticated
  with check (public.has_permission('catalog.write'));
create policy titles_update on public.titles for update to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

grant select on public.title_genres to anon, authenticated;
grant insert, delete on public.title_genres to authenticated;
create policy title_genres_read on public.title_genres for select to anon, authenticated
  using (public.is_title_visible(title_id) or public.has_permission('catalog.read_all'));
create policy title_genres_write on public.title_genres for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

grant select on public.credits to anon, authenticated;
grant insert, update, delete on public.credits to authenticated;
create policy credits_read on public.credits for select to anon, authenticated
  using (public.is_title_visible(title_id) or public.has_permission('catalog.read_all'));
create policy credits_write on public.credits for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

grant select on public.seasons to anon, authenticated;
grant insert, update, delete on public.seasons to authenticated;
create policy seasons_read on public.seasons for select to anon, authenticated
  using (public.is_title_visible(title_id) or public.has_permission('catalog.read_all'));
create policy seasons_write on public.seasons for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

grant select on public.episodes to anon, authenticated;
grant insert, update on public.episodes to authenticated;
create policy episodes_read on public.episodes for select to anon, authenticated
  using (
    (deleted_at is null and status = 'published' and published_at is not null and published_at <= now()
      and public.is_title_visible(title_id))
    or public.has_permission('catalog.read_all')
  );
create policy episodes_write on public.episodes for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

-- Médias et sous-titres : réservés à l'équipe (la lecture passe par le serveur).
grant select, insert, update on public.media_assets to authenticated;
create policy media_assets_staff_read on public.media_assets for select to authenticated
  using (public.has_permission('catalog.read_all'));
create policy media_assets_staff_write on public.media_assets for all to authenticated
  using (public.has_permission('media.upload')) with check (public.has_permission('media.upload'));

grant select, insert, update, delete on public.subtitles to authenticated;
create policy subtitles_staff_read on public.subtitles for select to authenticated
  using (public.has_permission('catalog.read_all'));
create policy subtitles_staff_write on public.subtitles for all to authenticated
  using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

-- Collections et éditorial
grant select on public.collections to anon, authenticated;
grant insert, update, delete on public.collections to authenticated;
create policy collections_read on public.collections for select to anon, authenticated
  using (is_public or public.has_permission('editorial.write'));
create policy collections_write on public.collections for all to authenticated
  using (public.has_permission('editorial.write')) with check (public.has_permission('editorial.write'));

grant select on public.collection_items to anon, authenticated;
grant insert, update, delete on public.collection_items to authenticated;
create policy collection_items_read on public.collection_items for select to anon, authenticated
  using (public.is_title_visible(title_id) or public.has_permission('editorial.write'));
create policy collection_items_write on public.collection_items for all to authenticated
  using (public.has_permission('editorial.write')) with check (public.has_permission('editorial.write'));

grant select on public.home_sections to anon, authenticated;
grant insert, update, delete on public.home_sections to authenticated;
create policy home_sections_read on public.home_sections for select to anon, authenticated
  using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or public.has_permission('editorial.write')
  );
create policy home_sections_write on public.home_sections for all to authenticated
  using (public.has_permission('editorial.write')) with check (public.has_permission('editorial.write'));

grant select on public.home_banners to anon, authenticated;
grant insert, update, delete on public.home_banners to authenticated;
create policy home_banners_read on public.home_banners for select to anon, authenticated
  using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
      and (title_id is null or public.is_title_visible(title_id)))
    or public.has_permission('editorial.write')
  );
create policy home_banners_write on public.home_banners for all to authenticated
  using (public.has_permission('editorial.write')) with check (public.has_permission('editorial.write'));

grant execute on function public.is_title_visible(uuid) to anon, authenticated;
grant execute on function public.prefix_tsquery(text) to anon, authenticated;
revoke execute on function public.compute_title_search_vector(uuid) from public, anon, authenticated;
