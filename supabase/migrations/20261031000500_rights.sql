-- =============================================================================
-- Droits de diffusion : ayants droit, licences, territoires, justificatifs,
-- réclamations, garde de publication et contrôle d'accès à la lecture.
-- =============================================================================

create table public.rights_holders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  legal_name text,
  kind text not null default 'producer'
    check (kind in ('producer', 'distributor', 'broadcaster', 'author', 'estate', 'institution', 'other')),
  contact_name text,
  contact_email text,
  contact_phone text,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  address text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rights_holders_updated_at before update on public.rights_holders
  for each row execute function public.set_updated_at();
create trigger rights_holders_audit after insert or update or delete on public.rights_holders
  for each row execute function public.audit_row_change();

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles (id) on delete restrict,
  rights_holder_id uuid references public.rights_holders (id) on delete restrict,
  contract_reference text,
  license_type public.license_type not null,
  status public.license_status not null default 'draft',
  exploitation_modes text[] not null default '{svod}'
    check (cardinality(exploitation_modes) > 0
           and exploitation_modes <@ array['svod', 'avod', 'free', 'trailer', 'promo']),
  supports text[] not null default '{web}'
    check (cardinality(supports) > 0 and supports <@ array['web', 'mobile_app', 'tv_app', 'download']),
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_exclusive boolean not null default false,
  max_quality text check (max_quality in ('sd', 'hd', 'fhd', 'uhd')),
  restrictions text,
  fee_terms text,
  notes text,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (ends_at is not null or license_type in ('owned_production', 'public_domain_verified', 'open_license'))
);
create index licenses_title_idx on public.licenses (title_id);
create index licenses_ends_at_idx on public.licenses (ends_at) where status = 'signed';
create trigger licenses_updated_at before update on public.licenses
  for each row execute function public.set_updated_at();
create trigger licenses_audit after insert or update or delete on public.licenses
  for each row execute function public.audit_row_change();

-- 'WW' désigne le monde entier ; une ligne exclue retire un pays d'une licence 'WW'.
create table public.license_territories (
  license_id uuid not null references public.licenses (id) on delete cascade,
  country_code text not null check (country_code ~ '^([A-Z]{2}|WW)$'),
  is_excluded boolean not null default false,
  primary key (license_id, country_code),
  check (not (country_code = 'WW' and is_excluded))
);
create index license_territories_country_idx on public.license_territories (country_code);
create trigger license_territories_audit after insert or update or delete on public.license_territories
  for each row execute function public.audit_row_change();

create table public.license_documents (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses (id) on delete cascade,
  document_type text not null default 'contract'
    check (document_type in ('contract', 'amendment', 'chain_of_title', 'public_domain_proof',
                             'license_text', 'correspondence', 'other')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index license_documents_license_idx on public.license_documents (license_id);
create trigger license_documents_audit after insert or update or delete on public.license_documents
  for each row execute function public.audit_row_change();

create table public.content_claims (
  id uuid primary key default gen_random_uuid(),
  title_id uuid references public.titles (id) on delete set null,
  title_reference text,
  claimant_name text not null check (char_length(claimant_name) between 1 and 200),
  claimant_email text not null check (claimant_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  claimant_organization text,
  claim_type text not null check (claim_type in ('copyright', 'trademark', 'privacy', 'defamation', 'other')),
  description text not null check (char_length(description) between 10 and 5000),
  sworn_statement boolean not null default false,
  status public.claim_status not null default 'received',
  action_taken text,
  handled_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_claims_status_idx on public.content_claims (status, created_at desc);
create trigger content_claims_updated_at before update on public.content_claims
  for each row execute function public.set_updated_at();
create trigger content_claims_audit after insert or update or delete on public.content_claims
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Évaluation des droits
-- -----------------------------------------------------------------------------

-- Un pays inconnu n'est couvert que par une licence mondiale sans exclusion.
create or replace function public.license_covers_country(p_license uuid, p_country text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_country is null or p_country !~ '^[A-Z]{2}$' or p_country = 'XX' then
      exists (select 1 from public.license_territories where license_id = p_license and country_code = 'WW')
      and not exists (select 1 from public.license_territories where license_id = p_license and is_excluded)
    else
      exists (
        select 1 from public.license_territories
        where license_id = p_license and not is_excluded and country_code in ('WW', p_country)
      )
      and not exists (
        select 1 from public.license_territories
        where license_id = p_license and is_excluded and country_code = p_country
      )
  end;
$$;

-- État des droits d'une œuvre pour un pays, des modes d'exploitation et un support.
create or replace function public.title_rights_status(
  p_title uuid,
  p_country text,
  p_modes text[],
  p_support text default 'web'
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if exists (
    select 1 from public.licenses l
    where l.title_id = p_title and l.status = 'signed'
      and l.exploitation_modes && p_modes and p_support = any (l.supports)
      and l.starts_at <= v_now and (l.ends_at is null or l.ends_at > v_now)
      and public.license_covers_country(l.id, p_country)
  ) then
    return 'valid';
  end if;

  if exists (
    select 1 from public.licenses l
    where l.title_id = p_title and l.status = 'signed'
      and l.exploitation_modes && p_modes and p_support = any (l.supports)
      and l.starts_at > v_now and public.license_covers_country(l.id, p_country)
  ) then
    return 'not_started';
  end if;

  if exists (
    select 1 from public.licenses l
    where l.title_id = p_title and l.status = 'signed'
      and l.exploitation_modes && p_modes and p_support = any (l.supports)
      and l.ends_at is not null and l.ends_at <= v_now
      and public.license_covers_country(l.id, p_country)
  ) then
    return 'expired';
  end if;

  if exists (
    select 1 from public.licenses l
    where l.title_id = p_title and l.status = 'signed'
      and l.exploitation_modes && p_modes and p_support = any (l.supports)
      and l.starts_at <= v_now and (l.ends_at is null or l.ends_at > v_now)
  ) then
    return 'territory';
  end if;

  if exists (select 1 from public.licenses l where l.title_id = p_title and l.status = 'signed') then
    return 'mode';
  end if;

  return 'none';
end;
$$;

create or replace function public.title_required_modes(p_min_tier public.plan_tier)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case when p_min_tier = 'free' then array['free', 'avod'] else array['svod'] end;
$$;

-- Disponibilité d'une œuvre visible pour l'affichage dans les listes.
create or replace function public.title_is_available(p_title uuid, p_country text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.setting_bool('hide_unlicensed_titles', true) then true
    else exists (
      select 1 from public.titles t
      where t.id = p_title
        and (
          public.title_rights_status(t.id, p_country, public.title_required_modes(t.min_tier)) = 'valid'
          or (
            t.status = 'announced'
            and public.title_rights_status(t.id, p_country, public.title_required_modes(t.min_tier))
                in ('valid', 'not_started')
          )
        )
    )
  end;
$$;

-- Décision d'accès à la lecture, évaluée côté serveur pour chaque demande.
create or replace function public.check_playback(
  p_user uuid,
  p_viewer_profile uuid,
  p_title uuid,
  p_episode uuid,
  p_country text,
  p_kind text default 'main'
)
returns table (
  allowed boolean,
  reason text,
  required_tier public.plan_tier,
  media_asset_id uuid,
  provider public.media_provider,
  provider_asset_id text,
  episode_id uuid,
  viewer_profile_id uuid,
  duration_seconds integer,
  intro_start_seconds integer,
  intro_end_seconds integer,
  credits_start_seconds integer,
  max_quality text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_title public.titles;
  v_episode public.episodes;
  v_asset public.media_assets;
  v_profile public.viewer_profiles;
  v_ent record;
  v_rights text;
  v_asset_id uuid;
  v_intro_start integer;
  v_intro_end integer;
  v_credits integer;
  v_max_quality text;
begin
  select * into v_title from public.titles where id = p_title and deleted_at is null;
  if not found then
    return query select false, 'not_found', null::public.plan_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, null::uuid, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if v_title.takedown_at is not null then
    return query select false, 'taken_down', null::public.plan_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, null::uuid, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if not public.is_title_visible(p_title) then
    return query select false, 'not_found', null::public.plan_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, null::uuid, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  -- Bandes-annonces : accessibles sans compte si une licence promotionnelle couvre le territoire.
  if p_kind = 'trailer' then
    select * into v_asset from public.media_assets
     where id = v_title.trailer_asset_id and status = 'ready' and deleted_at is null;
    if not found then
      return query select false, 'media_unavailable', null::public.plan_tier, null::uuid,
        null::public.media_provider, null::text, null::uuid, null::uuid, null::integer, null::integer,
        null::integer, null::integer, null::text;
      return;
    end if;
    v_rights := public.title_rights_status(p_title, p_country, array['trailer', 'promo', 'svod', 'avod', 'free']);
    if v_rights not in ('valid', 'not_started') then
      return query select false, case v_rights when 'territory' then 'territory_not_allowed'
        when 'expired' then 'license_expired' else 'no_license' end, null::public.plan_tier, null::uuid,
        null::public.media_provider, null::text, null::uuid, null::uuid, null::integer, null::integer,
        null::integer, null::integer, null::text;
      return;
    end if;
    return query select true, 'ok', null::public.plan_tier, v_asset.id, v_asset.provider, v_asset.provider_asset_id,
      null::uuid, null::uuid, v_asset.duration_seconds, null::integer, null::integer, null::integer, 'hd'::text;
    return;
  end if;

  if p_user is null then
    return query select false, 'login_required', v_title.min_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, null::uuid, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  select * into v_ent from public.get_entitlements_internal(p_user);

  if v_ent.suspended then
    return query select false, 'account_suspended', null::public.plan_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, null::uuid, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if public.setting_bool('maintenance_mode', false) then
    return query select false, 'maintenance', null::public.plan_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, null::uuid, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if p_viewer_profile is null then
    select * into v_profile from public.viewer_profiles where account_id = p_user and is_default;
  else
    select * into v_profile from public.viewer_profiles where id = p_viewer_profile and account_id = p_user;
  end if;
  if not found then
    return query select false, 'invalid_profile', null::public.plan_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, null::uuid, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if v_title.status = 'announced' then
    return query select false, 'coming_soon', v_title.min_tier, null::uuid, null::public.media_provider,
      null::text, null::uuid, v_profile.id, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if v_title.structure = 'episodic' then
    if p_episode is null then
      return query select false, 'episode_required', v_title.min_tier, null::uuid, null::public.media_provider,
        null::text, null::uuid, v_profile.id, null::integer, null::integer, null::integer, null::integer, null::text;
      return;
    end if;
    select * into v_episode from public.episodes
     where id = p_episode and title_id = p_title and deleted_at is null
       and status = 'published' and published_at is not null and published_at <= now();
    if not found then
      return query select false, 'episode_not_found', v_title.min_tier, null::uuid, null::public.media_provider,
        null::text, null::uuid, v_profile.id, null::integer, null::integer, null::integer, null::integer, null::text;
      return;
    end if;
    v_asset_id := v_episode.main_asset_id;
    v_intro_start := v_episode.intro_start_seconds;
    v_intro_end := v_episode.intro_end_seconds;
    v_credits := v_episode.credits_start_seconds;
  else
    v_asset_id := v_title.main_asset_id;
    v_intro_start := v_title.intro_start_seconds;
    v_intro_end := v_title.intro_end_seconds;
    v_credits := v_title.credits_start_seconds;
  end if;

  select * into v_asset from public.media_assets
   where id = v_asset_id and status = 'ready' and deleted_at is null;
  if not found then
    return query select false, 'media_unavailable', v_title.min_tier, null::uuid, null::public.media_provider,
      null::text, v_episode.id, v_profile.id, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if v_profile.max_age_rating is not null and v_title.age_rating > v_profile.max_age_rating then
    return query select false, 'age_restricted', v_title.min_tier, null::uuid, null::public.media_provider,
      null::text, v_episode.id, v_profile.id, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  v_rights := public.title_rights_status(p_title, p_country, public.title_required_modes(v_title.min_tier));
  if v_rights <> 'valid' then
    return query select false,
      case v_rights
        when 'not_started' then 'license_not_started'
        when 'expired' then 'license_expired'
        when 'territory' then 'territory_not_allowed'
        when 'mode' then 'mode_not_covered'
        else 'no_license'
      end,
      v_title.min_tier, null::uuid, null::public.media_provider, null::text, v_episode.id, v_profile.id,
      null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  if v_ent.tier < v_title.min_tier then
    return query select false, 'subscription_required', v_title.min_tier, null::uuid, null::public.media_provider,
      null::text, v_episode.id, v_profile.id, null::integer, null::integer, null::integer, null::integer, null::text;
    return;
  end if;

  -- Qualité maximale : la plus restrictive entre la formule et la licence.
  select case
    when l.max_quality is null then v_ent.max_quality
    when array_position(array['sd', 'hd', 'fhd', 'uhd'], l.max_quality)
         < array_position(array['sd', 'hd', 'fhd', 'uhd'], v_ent.max_quality) then l.max_quality
    else v_ent.max_quality
  end into v_max_quality
  from public.licenses l
  where l.title_id = p_title and l.status = 'signed'
    and l.exploitation_modes && public.title_required_modes(v_title.min_tier)
    and 'web' = any (l.supports)
    and l.starts_at <= now() and (l.ends_at is null or l.ends_at > now())
    and public.license_covers_country(l.id, p_country)
  order by l.ends_at desc nulls first
  limit 1;

  return query select true, 'ok', v_title.min_tier, v_asset.id, v_asset.provider, v_asset.provider_asset_id,
    v_episode.id, v_profile.id, v_asset.duration_seconds, v_intro_start, v_intro_end, v_credits,
    coalesce(v_max_quality, v_ent.max_quality);
end;
$$;

-- -----------------------------------------------------------------------------
-- Garde de publication : pas de mise en ligne ni d'annonce sans licence signée
-- -----------------------------------------------------------------------------
create or replace function public.titles_publication_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('published', 'announced')
     and (tg_op = 'INSERT' or old.status is distinct from new.status
          or old.published_at is distinct from new.published_at) then

    if auth.uid() is not null and not public.has_permission('catalog.publish') then
      raise exception 'FORBIDDEN: permission catalog.publish requise.' using errcode = '42501';
    end if;

    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;

    if not exists (
      select 1 from public.licenses l
      where l.title_id = new.id
        and l.status = 'signed'
        and (l.ends_at is null or l.ends_at > now())
        and (new.status = 'announced' or l.starts_at <= greatest(new.published_at, now()))
        and exists (select 1 from public.license_territories lt where lt.license_id = l.id and not lt.is_excluded)
    ) then
      raise exception 'PUBLICATION_REQUIRES_VALID_LICENSE: une licence signée, en cours de validité et couvrant au moins un territoire est requise.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger titles_publication_guard before insert or update of status, published_at on public.titles
  for each row execute function public.titles_publication_guard();

-- -----------------------------------------------------------------------------
-- Retrait rapide (réclamation) et rétablissement
-- -----------------------------------------------------------------------------
create or replace function public.takedown_title(p_title uuid, p_reason text, p_claim uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('takedown.execute') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;
  update public.titles set takedown_at = now(), takedown_reason = left(p_reason, 1000), updated_by = auth.uid()
   where id = p_title;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_claim is not null then
    update public.content_claims
       set status = 'content_disabled', handled_by = auth.uid(),
           action_taken = coalesce(action_taken || E'\n', '') || 'Contenu retiré : ' || left(p_reason, 500)
     where id = p_claim;
  end if;
end;
$$;

create or replace function public.restore_title(p_title uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('takedown.execute') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.titles set takedown_at = null,
         takedown_reason = 'Rétabli : ' || left(coalesce(p_note, ''), 500), updated_by = auth.uid()
   where id = p_title and takedown_at is not null;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

-- Dépublie les œuvres dont aucune licence n'est plus valide (tâche planifiée).
create or replace function public.unpublish_titles_without_rights()
returns table (title_id uuid, title text)
language sql
security definer
set search_path = ''
as $$
  update public.titles t
     set status = 'unpublished'
   where t.status in ('published', 'announced')
     and t.deleted_at is null
     and not exists (
       select 1 from public.licenses l
       where l.title_id = t.id and l.status = 'signed' and (l.ends_at is null or l.ends_at > now())
     )
  returning t.id, t.title;
$$;

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.rights_holders enable row level security;
alter table public.licenses enable row level security;
alter table public.license_territories enable row level security;
alter table public.license_documents enable row level security;
alter table public.content_claims enable row level security;

grant select, insert, update, delete on public.rights_holders to authenticated;
create policy rights_holders_read on public.rights_holders for select to authenticated
  using (public.has_permission('rights.read'));
create policy rights_holders_write on public.rights_holders for all to authenticated
  using (public.has_permission('rights.write')) with check (public.has_permission('rights.write'));

grant select, insert, update, delete on public.licenses to authenticated;
create policy licenses_read on public.licenses for select to authenticated
  using (public.has_permission('rights.read'));
create policy licenses_write on public.licenses for all to authenticated
  using (public.has_permission('rights.write')) with check (public.has_permission('rights.write'));

grant select, insert, update, delete on public.license_territories to authenticated;
create policy license_territories_read on public.license_territories for select to authenticated
  using (public.has_permission('rights.read'));
create policy license_territories_write on public.license_territories for all to authenticated
  using (public.has_permission('rights.write')) with check (public.has_permission('rights.write'));

grant select, insert, delete on public.license_documents to authenticated;
create policy license_documents_read on public.license_documents for select to authenticated
  using (public.has_permission('rights.documents'));
create policy license_documents_write on public.license_documents for all to authenticated
  using (public.has_permission('rights.documents')) with check (public.has_permission('rights.documents'));

grant select, update on public.content_claims to authenticated;
create policy content_claims_read on public.content_claims for select to authenticated
  using (public.has_permission('rights.read') or public.has_permission('takedown.execute'));
create policy content_claims_update on public.content_claims for update to authenticated
  using (public.has_permission('takedown.execute')) with check (public.has_permission('takedown.execute'));

-- Les fonctions d'évaluation détaillée restent internes : seules la
-- disponibilité (booléen) et la décision de lecture (serveur) sont exposées.
revoke execute on function public.license_covers_country(uuid, text) from public, anon, authenticated;
grant execute on function public.license_covers_country(uuid, text) to service_role;
revoke execute on function public.title_rights_status(uuid, text, text[], text) from public, anon, authenticated;
grant execute on function public.title_rights_status(uuid, text, text[], text) to service_role;
grant execute on function public.title_required_modes(public.plan_tier) to anon, authenticated;
grant execute on function public.title_is_available(uuid, text) to anon, authenticated;
revoke execute on function public.check_playback(uuid, uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.check_playback(uuid, uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.takedown_title(uuid, text, uuid) to authenticated;
grant execute on function public.restore_title(uuid, text) to authenticated;
revoke execute on function public.unpublish_titles_without_rights() from public, anon, authenticated;
grant execute on function public.unpublish_titles_without_rights() to service_role;
