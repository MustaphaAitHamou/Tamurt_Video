-- =============================================================================
-- Tamurt Vidéo — Fondations : privilèges, types, paramètres, audit, rôles.
-- =============================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Moindre privilège : les objets créés ensuite dans `public` ne sont plus
-- accessibles par défaut aux rôles `anon` et `authenticated`. Chaque table et
-- fonction reçoit des droits explicites, puis la RLS filtre les lignes.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'catalog_editor', 'rights_manager');
create type public.plan_tier as enum ('free', 'founder', 'standard', 'premium');
create type public.subscription_status as enum (
  'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
);
create type public.title_kind as enum ('film', 'series', 'documentary', 'short', 'show', 'interview');
create type public.title_structure as enum ('single', 'episodic');
create type public.publication_status as enum (
  'draft', 'in_review', 'announced', 'published', 'unpublished', 'archived'
);
create type public.media_provider as enum ('cloudflare_stream', 'dev_local');
create type public.media_status as enum ('pending_upload', 'processing', 'ready', 'error', 'deleted');
create type public.media_kind as enum ('main', 'trailer', 'extra');
create type public.credit_role as enum (
  'director', 'actor', 'writer', 'producer', 'composer', 'cinematographer', 'editor', 'presenter', 'guest'
);
create type public.license_type as enum (
  'owned_production', 'exclusive_license', 'non_exclusive_license',
  'public_domain_verified', 'open_license', 'promotional'
);
create type public.license_status as enum ('draft', 'pending_signature', 'signed', 'suspended', 'terminated');
create type public.claim_status as enum ('received', 'reviewing', 'content_disabled', 'rejected', 'resolved');
create type public.request_status as enum (
  'received', 'under_review', 'rights_search', 'negotiation', 'acquisition_confirmed',
  'publication_planned', 'available', 'rejected', 'impossible'
);
create type public.request_content_type as enum ('film', 'series', 'documentary', 'short', 'show', 'other');
create type public.announcement_category as enum ('news', 'roadmap', 'partnership', 'feature', 'launch', 'catalog');
create type public.content_audience as enum ('public', 'members', 'subscribers', 'founders');
create type public.home_section_source as enum (
  'popular', 'new', 'collection', 'filter', 'continue_watching', 'watchlist', 'recommended', 'coming_soon'
);
create type public.payment_event_status as enum ('received', 'processing', 'processed', 'ignored', 'failed');
create type public.finance_category as enum (
  'subscription_revenue', 'ad_revenue', 'other_revenue',
  'payment_fees', 'hosting', 'streaming', 'storage', 'email', 'tools', 'content_licenses', 'other_cost'
);
create type public.data_request_type as enum ('access', 'export', 'rectification', 'erasure', 'restriction', 'objection');

-- -----------------------------------------------------------------------------
-- Fonctions utilitaires
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalisation pour la recherche et la détection de doublons
-- (minuscules, sans accents, espaces compactés).
create or replace function public.normalize_text(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, ''))),
    '[^[:alnum:]]+', ' ', 'g'
  ));
$$;

-- -----------------------------------------------------------------------------
-- Paramètres de la plateforme (administrables)
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value, is_public, description) values
  ('launch_phase', '"founder"', true, 'Phase commerciale : "founder" (soutien à 2 €) ou "commercial" (catalogue Standard lancé).'),
  ('founder_signups_open', 'true', true, 'Ouverture des nouvelles souscriptions Fondateur.'),
  ('grace_period_days', '7', false, 'Jours d''accès conservés après un échec de paiement ou une échéance non renouvelée.'),
  ('dzd_display_enabled', 'true', true, 'Afficher une conversion indicative en dinars algériens.'),
  ('eur_to_dzd_rate', '150', true, 'Taux EUR→DZD indicatif, à mettre à jour manuellement. N''est jamais utilisé pour facturer.'),
  ('eur_to_dzd_rate_updated_at', '"2026-10-31"', true, 'Date de dernière mise à jour du taux indicatif.'),
  ('admin_mfa_required', 'true', false, 'Exiger l''authentification à deux facteurs (TOTP) pour toute action de back-office.'),
  ('hide_unlicensed_titles', 'true', false, 'Masquer des listes les œuvres non licenciées dans le territoire du visiteur.'),
  ('show_demo_content', 'false', true, 'Afficher les œuvres fictives de démonstration (à désactiver en production).'),
  ('ads_enabled', 'false', true, 'Interrupteur général des emplacements publicitaires.'),
  ('maintenance_mode', 'false', true, 'Mode maintenance : la lecture est suspendue, le site reste consultable.'),
  ('premium_requests_per_month', '10', false, 'Nombre maximal de demandes de contenus par membre Premium et par période de 30 jours.'),
  ('stream_heartbeat_timeout_seconds', '90', false, 'Délai sans signal au-delà duquel un flux n''est plus compté comme actif.'),
  ('license_alert_days', '[30, 7, 1]', false, 'Seuils (en jours) des alertes d''expiration de licence.'),
  ('cost_stream_delivered_usd_per_1000_min', '1.0', false, 'Coût Cloudflare Stream par 1000 minutes diffusées (USD, à vérifier sur la grille tarifaire en vigueur).'),
  ('cost_stream_stored_usd_per_1000_min', '5.0', false, 'Coût Cloudflare Stream par 1000 minutes stockées et par mois (USD, à vérifier).'),
  ('usd_to_eur_rate', '0.86', false, 'Taux USD→EUR utilisé pour les estimations de coûts.'),
  ('payment_fee_percent', '1.5', false, 'Commission estimée du prestataire de paiement (%).'),
  ('payment_fee_fixed_cents', '25', false, 'Commission fixe estimée par transaction (centimes d''euro).'),
  ('fixed_monthly_costs_cents', '{"hosting": 2000, "database": 2500, "email": 0, "domain": 150, "other": 0}', false, 'Coûts fixes mensuels estimés (centimes d''euro).'),
  ('legal_entity', '{"name": "À compléter", "form": "À compléter", "address": "À compléter", "registration": "À compléter", "vat": "À compléter", "publication_director": "À compléter", "host": "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis"}', true, 'Informations légales de l''entité exploitante (mentions légales).'),
  ('support_email', '"contact@tamurt.example"', true, 'Adresse de contact affichée sur le site (à remplacer).');

create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

create or replace function public.setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::boolean from public.platform_settings where key = p_key), p_default);
$$;

create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::numeric::integer from public.platform_settings where key = p_key), p_default);
$$;

-- -----------------------------------------------------------------------------
-- Journal d'audit (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create or replace function public.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.audit_purge', true) = 'on' then
    return old;
  end if;
  raise exception 'Le journal d''audit est en ajout seul (%).', tg_op using errcode = 'P0001';
end;
$$;

create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

-- Journalisation automatique des modifications sur les tables sensibles.
-- Les arguments du trigger listent les colonnes volumineuses à ignorer.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_ignored text[] := array['updated_at', 'search_vector', 'popularity_score', 'view_count', 'vote_count'];
  v_entity_id text;
begin
  if tg_nargs > 0 then
    v_ignored := v_ignored || tg_argv;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old) - v_ignored;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new) - v_ignored;
  end if;
  v_entity_id := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key',
                          v_new ->> 'user_id', v_old ->> 'user_id');

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if (v_old -> v_key) is distinct from (v_new -> v_key) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'INSERT' then
    v_changes := v_new;
  else
    v_changes := v_old;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), lower(tg_op), tg_table_name, v_entity_id, jsonb_build_object('changes', v_changes));

  return coalesce(new, old);
end;
$$;

create trigger platform_settings_audit after insert or update or delete on public.platform_settings
  for each row execute function public.audit_row_change();

-- Écriture explicite d'une entrée d'audit par le serveur (rôle service uniquement).
create or replace function public.log_audit(
  p_actor uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_ip inet default null,
  p_user_agent text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
  values (p_actor, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb), p_ip, left(p_user_agent, 300));
$$;

-- -----------------------------------------------------------------------------
-- Rôles et permissions
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.role_permissions (
  role public.app_role not null,
  permission text not null check (permission ~ '^[a-z_]+\.[a-z_]+$'),
  primary key (role, permission)
);

-- Source de vérité des permissions (miroir TypeScript : src/lib/permissions.ts,
-- dont la cohérence est vérifiée par les tests d'intégration).
insert into public.role_permissions (role, permission) values
  ('admin', 'admin.access'),
  ('admin', 'catalog.read_all'),
  ('admin', 'catalog.write'),
  ('admin', 'catalog.publish'),
  ('admin', 'media.upload'),
  ('admin', 'rights.read'),
  ('admin', 'rights.write'),
  ('admin', 'rights.documents'),
  ('admin', 'takedown.execute'),
  ('admin', 'requests.moderate'),
  ('admin', 'requests.confirm_acquisition'),
  ('admin', 'editorial.write'),
  ('admin', 'users.read'),
  ('admin', 'users.manage'),
  ('admin', 'billing.read'),
  ('admin', 'billing.manage'),
  ('admin', 'finance.read'),
  ('admin', 'finance.write'),
  ('admin', 'settings.write'),
  ('admin', 'audit.read'),
  ('admin', 'hq.manage'),
  ('admin', 'ads.manage'),
  ('admin', 'messages.read'),
  ('catalog_editor', 'admin.access'),
  ('catalog_editor', 'catalog.read_all'),
  ('catalog_editor', 'catalog.write'),
  ('catalog_editor', 'catalog.publish'),
  ('catalog_editor', 'media.upload'),
  ('catalog_editor', 'rights.read'),
  ('catalog_editor', 'requests.moderate'),
  ('catalog_editor', 'editorial.write'),
  ('rights_manager', 'admin.access'),
  ('rights_manager', 'catalog.read_all'),
  ('rights_manager', 'rights.read'),
  ('rights_manager', 'rights.write'),
  ('rights_manager', 'rights.documents'),
  ('rights_manager', 'takedown.execute'),
  ('rights_manager', 'requests.confirm_acquisition');

-- L'authentification renforcée est satisfaite si le jeton porte aal2
-- ou si l'exigence est désactivée dans les paramètres.
create or replace function public.staff_mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.setting_bool('admin_mfa_required', true)
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role);
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and public.staff_mfa_satisfied()
     and exists (
       select 1
       from public.user_roles ur
       join public.role_permissions rp on rp.role = ur.role
       where ur.user_id = auth.uid() and rp.permission = p_permission
     );
$$;

-- Contexte d'équipe de l'utilisateur courant, utilisé par le serveur.
create or replace function public.my_staff_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'roles', coalesce((select jsonb_agg(role order by role) from public.user_roles where user_id = auth.uid()), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(distinct rp.permission)
      from public.user_roles ur join public.role_permissions rp on rp.role = ur.role
      where ur.user_id = auth.uid()
    ), '[]'::jsonb),
    'mfa_required', public.setting_bool('admin_mfa_required', true),
    'mfa_satisfied', public.staff_mfa_satisfied()
  );
$$;

-- Lecture d'un paramètre (les paramètres non publics sont réservés à l'administration).
create or replace function public.get_setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select value from public.platform_settings
  where key = p_key and (is_public or public.has_permission('settings.write'));
$$;

-- Empêche de retirer le dernier administrateur.
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and not exists (
    select 1 from public.user_roles where role = 'admin' and user_id <> old.user_id
  ) then
    raise exception 'LAST_ADMIN: impossible de retirer le dernier administrateur.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger user_roles_protect_last_admin before delete on public.user_roles
  for each row execute function public.protect_last_admin();

create trigger user_roles_audit after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.platform_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;

grant select on public.platform_settings to anon, authenticated;
grant insert, update on public.platform_settings to authenticated;
create policy platform_settings_public_read on public.platform_settings
  for select to anon, authenticated using (is_public or public.has_permission('settings.write'));
create policy platform_settings_admin_update on public.platform_settings
  for update to authenticated
  using (public.has_permission('settings.write'))
  with check (public.has_permission('settings.write'));
create policy platform_settings_admin_insert on public.platform_settings
  for insert to authenticated with check (public.has_permission('settings.write'));

grant select on public.audit_logs to authenticated;
create policy audit_logs_read on public.audit_logs
  for select to authenticated using (public.has_permission('audit.read'));

grant select, insert, delete on public.user_roles to authenticated;
create policy user_roles_read on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or public.has_permission('users.read'));
create policy user_roles_insert on public.user_roles
  for insert to authenticated with check (public.has_permission('users.manage'));
create policy user_roles_delete on public.user_roles
  for delete to authenticated using (public.has_permission('users.manage'));

grant select on public.role_permissions to authenticated;
create policy role_permissions_read on public.role_permissions
  for select to authenticated using (true);

grant execute on function public.normalize_text(text) to anon, authenticated;
grant execute on function public.get_setting(text) to authenticated;
grant execute on function public.setting_bool(text, boolean) to anon, authenticated;
grant execute on function public.setting_int(text, integer) to anon, authenticated;
grant execute on function public.staff_mfa_satisfied() to anon, authenticated;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.has_permission(text) to anon, authenticated;
grant execute on function public.my_staff_context() to authenticated;
revoke execute on function public.log_audit(uuid, text, text, text, jsonb, inet, text) from public, anon, authenticated;
grant execute on function public.log_audit(uuid, text, text, text, jsonb, inet, text) to service_role;
