-- =============================================================================
-- Comptes : profils, profils de visionnage, création à l'inscription.
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  avatar_key text not null default 'ochre' check (avatar_key ~ '^[a-z0-9_-]{1,40}$'),
  preferred_locale text not null default 'fr' check (preferred_locale in ('fr', 'en', 'ar', 'kab')),
  subtitle_locale text check (subtitle_locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  autoplay_next boolean not null default true,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  marketing_opt_in boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  search_history_enabled boolean not null default false,
  personalized_recommendations boolean not null default true,
  notification_preferences jsonb not null default
    '{"email_billing": true, "email_requests": true, "email_catalog": true, "email_news": false}'::jsonb,
  founder_since timestamptz,
  founder_number integer unique,
  suspended_at timestamptz,
  suspension_reason text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_suspended_idx on public.profiles (suspended_at) where suspended_at is not null;
create index profiles_founder_idx on public.profiles (founder_since) where founder_since is not null;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create sequence public.founder_number_seq start 1;

create table public.viewer_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  avatar_key text not null default 'ochre' check (avatar_key ~ '^[a-z0-9_-]{1,40}$'),
  is_kids boolean not null default false,
  max_age_rating smallint check (max_age_rating in (0, 10, 12, 16, 18)),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index viewer_profiles_one_default on public.viewer_profiles (account_id) where is_default;
create unique index viewer_profiles_unique_name on public.viewer_profiles (account_id, lower(name));
create index viewer_profiles_account_idx on public.viewer_profiles (account_id);

create trigger viewer_profiles_updated_at before update on public.viewer_profiles
  for each row execute function public.set_updated_at();

-- Un profil enfant est limité par défaut aux contenus tous publics / -10.
create or replace function public.viewer_profiles_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  if new.is_kids and new.max_age_rating is null then
    new.max_age_rating := 10;
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_default then
    raise exception 'DEFAULT_PROFILE: le profil principal ne peut pas perdre ce statut.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger viewer_profiles_defaults before insert or update on public.viewer_profiles
  for each row execute function public.viewer_profiles_defaults();

-- Création du profil et du profil de visionnage principal à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_locale text;
begin
  v_name := nullif(btrim(left(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  ), 60)), '');
  v_locale := case
    when new.raw_user_meta_data ->> 'locale' in ('fr', 'en', 'ar', 'kab') then new.raw_user_meta_data ->> 'locale'
    else 'fr'
  end;

  insert into public.profiles (id, display_name, preferred_locale, marketing_opt_in, terms_accepted_at, terms_version)
  values (
    new.id,
    v_name,
    v_locale,
    coalesce(lower(new.raw_user_meta_data ->> 'marketing_opt_in') in ('true', 't', '1'), false),
    case when new.raw_user_meta_data ? 'terms_version' then now() end,
    left(new.raw_user_meta_data ->> 'terms_version', 40)
  );

  insert into public.viewer_profiles (account_id, name, is_default)
  values (new.id, coalesce(left(v_name, 30), 'Profil principal'), true);

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Suspension / réactivation d'un compte par l'administration (journalisée).
create or replace function public.admin_set_suspension(p_user uuid, p_suspended boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'SELF_SUSPENSION: impossible de suspendre son propre compte.' using errcode = 'P0001';
  end if;
  update public.profiles
     set suspended_at = case when p_suspended then now() else null end,
         suspension_reason = case when p_suspended then left(p_reason, 500) else null end
   where id = p_user;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

create trigger profiles_audit after update of suspended_at, suspension_reason, founder_since, founder_number
  on public.profiles for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.viewer_profiles enable row level security;

grant select on public.profiles to authenticated;
-- Seules les préférences sont modifiables par l'utilisateur ; les colonnes de
-- statut (fondateur, suspension) passent par des fonctions contrôlées.
grant update (
  display_name, avatar_key, preferred_locale, subtitle_locale, autoplay_next, country_code,
  marketing_opt_in, search_history_enabled, personalized_recommendations, notification_preferences, last_seen_at
) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.has_permission('users.read'));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select, insert, update, delete on public.viewer_profiles to authenticated;
create policy viewer_profiles_select on public.viewer_profiles
  for select to authenticated using (account_id = (select auth.uid()) or public.has_permission('users.read'));
create policy viewer_profiles_insert on public.viewer_profiles
  for insert to authenticated with check (account_id = (select auth.uid()) and not is_default);
create policy viewer_profiles_update on public.viewer_profiles
  for update to authenticated using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));
create policy viewer_profiles_delete on public.viewer_profiles
  for delete to authenticated using (account_id = (select auth.uid()) and not is_default);

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.admin_set_suspension(uuid, boolean, text) to authenticated;
