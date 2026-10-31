-- =============================================================================
-- Opérations : publicité, finances, consentement, contact, RGPD, Tamurt HQ,
-- incidents, limitation de débit, journal des emails.
-- =============================================================================

create table public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  placement text not null,
  is_enabled boolean not null default false,
  provider text not null default 'house' check (provider in ('house', 'adsense')),
  config jsonb not null default '{}'::jsonb,
  audience text not null default 'non_paying' check (audience in ('visitors', 'non_paying')),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger ad_slots_updated_at before update on public.ad_slots
  for each row execute function public.set_updated_at();
create trigger ad_slots_audit after insert or update or delete on public.ad_slots
  for each row execute function public.audit_row_change();

-- Emplacements prévus, désactivés par défaut. Aucun ne s'affiche pendant la lecture.
insert into public.ad_slots (key, name, description, placement, audience) values
  ('home_bottom', 'Accueil — bas de page', 'Bannière au-dessus du pied de page de l''accueil public.', 'home', 'visitors'),
  ('news_inline', 'Actualités — dans l''article', 'Encart au milieu des articles d''actualité.', 'news', 'non_paying'),
  ('news_sidebar', 'Actualités — colonne', 'Encart latéral de la liste des actualités.', 'news', 'non_paying'),
  ('free_catalog_row', 'Catalogue gratuit — entre deux rangées', 'Encart entre deux rangées pour les comptes gratuits.', 'catalog', 'non_paying');

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  period_month date not null check (extract(day from period_month) = 1),
  category public.finance_category not null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  description text check (char_length(description) <= 500),
  source text not null default 'manual' check (source in ('manual', 'import', 'computed')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index finance_entries_period_idx on public.finance_entries (period_month, category);
create trigger finance_entries_audit after insert or update or delete on public.finance_entries
  for each row execute function public.audit_row_change();

create table public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id text check (char_length(anonymous_id) <= 64),
  choices jsonb not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);
create index consent_logs_user_idx on public.consent_logs (user_id, created_at desc);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  category text not null check (category in ('general', 'support', 'billing', 'rights', 'press', 'partnership', 'privacy')),
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  request_type public.data_request_type not null,
  details text check (char_length(details) <= 2000),
  status text not null default 'received' check (status in ('received', 'in_progress', 'completed', 'rejected')),
  response text,
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index data_requests_status_idx on public.data_requests (status, created_at);
create trigger data_requests_audit after insert or update on public.data_requests
  for each row execute function public.audit_row_change('details');

-- Clés d'accès de Tamurt HQ : seule l'empreinte SHA-256 est conservée.
create table public.hq_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  key_prefix text not null,
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default '{metrics:read}' check (scopes <@ array['metrics:read', 'incidents:read']),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz
);
create trigger hq_api_keys_audit after insert or update or delete on public.hq_api_keys
  for each row execute function public.audit_row_change('key_hash');

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text,
  component text not null default 'platform' check (component in ('platform', 'streaming', 'payments', 'auth', 'email', 'database')),
  severity text not null default 'minor' check (severity in ('minor', 'major', 'critical')),
  status text not null default 'open' check (status in ('open', 'monitoring', 'resolved')),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger incidents_updated_at before update on public.incidents
  for each row execute function public.set_updated_at();

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

-- Fenêtre fixe : renvoie l'autorisation et le nombre de requêtes restantes.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as rl (key, window_start, hits)
  values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = rl.hits + 1
  returning rl.hits into v_hits;
  return query select v_hits <= p_limit, greatest(p_limit - v_hits, 0),
    v_window + make_interval(secs => p_window_seconds);
end;
$$;

create or replace function public.purge_rate_limits()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.rate_limits where window_start < now() - interval '1 day' returning 1
  )
  select count(*)::integer from deleted;
$$;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  notification_id uuid references public.notifications (id) on delete set null,
  to_email text not null,
  template text not null,
  subject text not null,
  provider text not null,
  status text not null check (status in ('sent', 'failed', 'skipped', 'logged')),
  provider_message_id text,
  error text,
  preview_text text,
  created_at timestamptz not null default now()
);
create index email_outbox_created_idx on public.email_outbox (created_at desc);
create index email_outbox_to_idx on public.email_outbox (to_email, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.ad_slots enable row level security;
alter table public.finance_entries enable row level security;
alter table public.consent_logs enable row level security;
alter table public.contact_messages enable row level security;
alter table public.data_requests enable row level security;
alter table public.hq_api_keys enable row level security;
alter table public.incidents enable row level security;
alter table public.rate_limits enable row level security;
alter table public.email_outbox enable row level security;

grant select on public.ad_slots to anon, authenticated;
grant update (name, description, is_enabled, provider, config, audience) on public.ad_slots to authenticated;
create policy ad_slots_read on public.ad_slots for select to anon, authenticated
  using ((is_enabled and public.setting_bool('ads_enabled', false)) or public.has_permission('ads.manage'));
create policy ad_slots_update on public.ad_slots for update to authenticated
  using (public.has_permission('ads.manage')) with check (public.has_permission('ads.manage'));

grant select, insert, delete on public.finance_entries to authenticated;
create policy finance_entries_read on public.finance_entries for select to authenticated
  using (public.has_permission('finance.read'));
create policy finance_entries_write on public.finance_entries for insert to authenticated
  with check (public.has_permission('finance.write'));
create policy finance_entries_delete on public.finance_entries for delete to authenticated
  using (public.has_permission('finance.write'));

grant select on public.consent_logs to authenticated;
create policy consent_logs_read on public.consent_logs for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('users.read'));

grant select, update on public.contact_messages to authenticated;
create policy contact_messages_read on public.contact_messages for select to authenticated
  using (public.has_permission('messages.read'));
create policy contact_messages_update on public.contact_messages for update to authenticated
  using (public.has_permission('messages.read')) with check (public.has_permission('messages.read'));

grant select, insert on public.data_requests to authenticated;
grant update (status, response, handled_by, completed_at) on public.data_requests to authenticated;
create policy data_requests_read on public.data_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('users.manage'));
create policy data_requests_insert on public.data_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'received');
create policy data_requests_update on public.data_requests for update to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

grant select, update on public.hq_api_keys to authenticated;
create policy hq_api_keys_read on public.hq_api_keys for select to authenticated
  using (public.has_permission('hq.manage'));
create policy hq_api_keys_update on public.hq_api_keys for update to authenticated
  using (public.has_permission('hq.manage')) with check (public.has_permission('hq.manage'));

grant select, insert, update on public.incidents to authenticated;
create policy incidents_read on public.incidents for select to authenticated
  using (public.has_permission('admin.access'));
create policy incidents_write on public.incidents for all to authenticated
  using (public.has_permission('settings.write')) with check (public.has_permission('settings.write'));

grant select on public.email_outbox to authenticated;
create policy email_outbox_read on public.email_outbox for select to authenticated
  using (public.has_permission('messages.read'));

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
revoke execute on function public.purge_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_rate_limits() to service_role;
