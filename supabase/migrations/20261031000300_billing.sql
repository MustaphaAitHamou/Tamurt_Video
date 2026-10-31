-- =============================================================================
-- Facturation : formules, prix historiques, abonnements, événements, factures.
-- =============================================================================

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  tier public.plan_tier not null check (tier <> 'free'),
  name text not null,
  tagline text,
  description text,
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  max_streams smallint not null default 1 check (max_streams between 1 and 10),
  max_profiles smallint not null default 1 check (max_profiles between 1 and 10),
  max_quality text not null default 'fhd' check (max_quality in ('sd', 'hd', 'fhd', 'uhd')),
  includes_ads boolean not null default false,
  is_active boolean not null default true,
  is_public boolean not null default true,
  available_in_phases text[] not null default '{founder,commercial}'
    check (available_in_phases <@ array['founder', 'commercial']),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscription_plans_updated_at before update on public.subscription_plans
  for each row execute function public.set_updated_at();
create trigger subscription_plans_audit after insert or update or delete on public.subscription_plans
  for each row execute function public.audit_row_change();

-- Chaque changement de tarif crée un nouveau prix : les abonnements existants
-- restent rattachés au prix souscrit (tarif historique des fondateurs).
create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  provider text not null default 'stripe',
  provider_price_id text unique,
  is_current boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index plan_prices_one_current on public.plan_prices (plan_id) where is_current;
create index plan_prices_plan_idx on public.plan_prices (plan_id);

create trigger plan_prices_audit after insert or update or delete on public.plan_prices
  for each row execute function public.audit_row_change();

insert into public.subscription_plans
  (code, tier, name, tagline, description, features, price_cents, max_streams, max_profiles, max_quality,
   includes_ads, available_in_phases, sort_order)
values
  ('founder', 'founder', 'Fondateur', 'Soutenez la naissance de Tamurt Vidéo',
   'Abonnement de soutien mensuel pendant la phase de construction de la plateforme. Il ne donne pas accès à un catalogue de films commerciaux tant que les droits correspondants n''ont pas été acquis.',
   '["Badge Membre fondateur", "Espace membre et actualités du développement", "Consultation du catalogue annoncé", "Liste de souhaits", "Accès aux contenus légalement disponibles", "Historique de soutien et gestion de l''abonnement", "Accès Standard au tarif fondateur au lancement du catalogue, tant que l''abonnement reste actif"]'::jsonb,
   200, 1, 1, 'hd', false, '{founder}', 1),
  ('standard', 'standard', 'Standard', 'Le catalogue Tamurt sous licence',
   'Accès au catalogue sous licence disponible dans votre territoire.',
   '["Films et séries disponibles dans votre territoire", "Lecture HD et Full HD selon la source", "Favoris, historique et reprise de lecture", "Suggestions personnalisées", "Sous-titres disponibles", "2 profils, 2 écrans simultanés"]'::jsonb,
   1000, 2, 2, 'fhd', false, '{commercial}', 2),
  ('premium', 'premium', 'Premium', 'Participez aux prochaines acquisitions',
   'Toutes les fonctionnalités Standard, plus les demandes et votes pour les prochaines acquisitions.',
   '["Toutes les fonctionnalités Standard", "Demandes de films et séries", "Votes pour les prochaines acquisitions", "Suivi et notifications des demandes", "Avantages Premium configurables", "Accès anticipé lorsque les droits le permettent", "4 profils, 4 écrans simultanés"]'::jsonb,
   2000, 4, 4, 'fhd', false, '{commercial}', 3);

insert into public.plan_prices (plan_id, amount_cents, currency, billing_interval)
select id, price_cents, currency, billing_interval from public.subscription_plans;

create table public.billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_customer_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  plan_price_id uuid references public.plan_prices (id) on delete restrict,
  provider text not null check (provider in ('stripe', 'manual')),
  provider_subscription_id text,
  provider_customer_id text,
  status public.subscription_status not null,
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  trial_end timestamptz,
  is_founder_rate boolean not null default false,
  provider_updated_at timestamptz,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id),
  check (provider = 'manual' or provider_subscription_id is not null)
);

create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_plan_idx on public.subscriptions (plan_id);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger subscriptions_audit after insert or update or delete on public.subscriptions
  for each row execute function public.audit_row_change('metadata');

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  event_created_at timestamptz,
  livemode boolean not null default false,
  status public.payment_event_status not null default 'received',
  attempts integer not null default 0,
  processing_started_at timestamptz,
  error text,
  related_user_id uuid,
  related_subscription_id uuid,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

create index payment_events_status_idx on public.payment_events (status, received_at desc);
create index payment_events_type_idx on public.payment_events (event_type, received_at desc);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider text not null,
  provider_invoice_id text not null,
  number text,
  status text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_due_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  amount_refunded_cents integer not null default 0,
  tax_cents integer not null default 0,
  fee_cents integer,
  hosted_invoice_url text,
  invoice_pdf_url text,
  billing_reason text,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_invoice_id)
);

create index invoices_user_idx on public.invoices (user_id, created_at desc);
create index invoices_paid_at_idx on public.invoices (paid_at) where paid_at is not null;

create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  provider text not null,
  provider_refund_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  reason text not null,
  status text not null default 'pending',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider, provider_refund_id)
);

create trigger refunds_audit after insert or update or delete on public.refunds
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Droits d'accès (source de vérité de l'autorisation par formule)
-- -----------------------------------------------------------------------------
create or replace function public.get_entitlements_internal(p_user uuid)
returns table (
  tier public.plan_tier,
  plan_tier public.plan_tier,
  plan_code text,
  plan_name text,
  subscription_id uuid,
  provider text,
  status public.subscription_status,
  current_period_end timestamptz,
  access_until timestamptz,
  in_grace boolean,
  cancel_at_period_end boolean,
  is_founder_rate boolean,
  unit_amount_cents integer,
  currency text,
  founder_since timestamptz,
  founder_number integer,
  max_streams smallint,
  max_profiles smallint,
  max_quality text,
  includes_ads boolean,
  suspended boolean,
  launch_phase text
)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select
      public.setting_int('grace_period_days', 7) as grace_days,
      coalesce((select value #>> '{}' from public.platform_settings where key = 'launch_phase'), 'founder') as phase
  ),
  candidates as (
    select
      s.id, s.provider, s.status, s.current_period_end, s.cancel_at_period_end, s.is_founder_rate,
      s.unit_amount_cents, s.currency,
      p.tier, p.code, p.name, p.max_streams, p.max_profiles, p.max_quality, p.includes_ads,
      case
        when s.current_period_end is null then 'infinity'::timestamptz
        else s.current_period_end + make_interval(days => cfg.grace_days)
      end as access_until
    from public.subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
    cross join cfg
    where s.user_id = p_user
      and s.status in ('active', 'trialing', 'past_due')
  ),
  best as (
    select * from candidates
    where access_until > now()
    order by tier desc, access_until desc
    limit 1
  ),
  standard_plan as (
    select sp.max_streams, sp.max_profiles, sp.max_quality
    from public.subscription_plans sp
    where sp.tier = 'standard'
    order by sp.is_active desc, sp.sort_order
    limit 1
  )
  select
    case
      when b.id is null then 'free'::public.plan_tier
      when b.tier = 'founder' and cfg.phase = 'commercial' then 'standard'::public.plan_tier
      else b.tier
    end,
    b.tier,
    b.code,
    b.name,
    b.id,
    b.provider,
    b.status,
    b.current_period_end,
    b.access_until,
    coalesce(b.status = 'past_due' or (b.current_period_end is not null and b.current_period_end < now()), false),
    coalesce(b.cancel_at_period_end, false),
    coalesce(b.is_founder_rate, false),
    b.unit_amount_cents,
    b.currency,
    pr.founder_since,
    pr.founder_number,
    case
      when b.id is null then 1::smallint
      when b.tier = 'founder' and cfg.phase = 'commercial' then greatest(b.max_streams, coalesce(st.max_streams, b.max_streams))
      else b.max_streams
    end,
    case
      when b.id is null then 1::smallint
      when b.tier = 'founder' and cfg.phase = 'commercial' then greatest(b.max_profiles, coalesce(st.max_profiles, b.max_profiles))
      else b.max_profiles
    end,
    case
      when b.id is null then 'hd'
      when b.tier = 'founder' and cfg.phase = 'commercial' then coalesce(st.max_quality, b.max_quality)
      else b.max_quality
    end,
    coalesce(b.includes_ads, true),
    pr.suspended_at is not null,
    cfg.phase
  from cfg
  left join best b on true
  left join standard_plan st on true
  left join public.profiles pr on pr.id = p_user;
$$;

create or replace function public.get_my_entitlements()
returns table (
  tier public.plan_tier, plan_tier public.plan_tier, plan_code text, plan_name text, subscription_id uuid,
  provider text, status public.subscription_status, current_period_end timestamptz, access_until timestamptz,
  in_grace boolean, cancel_at_period_end boolean, is_founder_rate boolean, unit_amount_cents integer,
  currency text, founder_since timestamptz, founder_number integer, max_streams smallint,
  max_profiles smallint, max_quality text, includes_ads boolean, suspended boolean, launch_phase text
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.get_entitlements_internal(auth.uid());
$$;

create or replace function public.current_tier()
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then 'free'::public.plan_tier
              else (select tier from public.get_entitlements_internal(auth.uid())) end;
$$;

create or replace function public.admin_get_entitlements(p_user uuid)
returns table (
  tier public.plan_tier, plan_tier public.plan_tier, plan_code text, plan_name text, subscription_id uuid,
  provider text, status public.subscription_status, current_period_end timestamptz, access_until timestamptz,
  in_grace boolean, cancel_at_period_end boolean, is_founder_rate boolean, unit_amount_cents integer,
  currency text, founder_since timestamptz, founder_number integer, max_streams smallint,
  max_profiles smallint, max_quality text, includes_ads boolean, suspended boolean, launch_phase text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query select * from public.get_entitlements_internal(p_user);
end;
$$;

-- Nombre de profils de visionnage limité par la formule.
create or replace function public.viewer_profiles_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_count integer;
begin
  select max_profiles into v_max from public.get_entitlements_internal(new.account_id);
  select count(*) into v_count from public.viewer_profiles where account_id = new.account_id;
  if v_count >= coalesce(v_max, 1) then
    raise exception 'PROFILE_LIMIT: votre formule permet % profil(s).', coalesce(v_max, 1) using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger viewer_profiles_limit before insert on public.viewer_profiles
  for each row execute function public.viewer_profiles_enforce_limit();

-- Attribution du statut de membre fondateur (date d'adhésion et numéro).
create or replace function public.subscriptions_track_founder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('active', 'trialing')
     and exists (select 1 from public.subscription_plans where id = new.plan_id and tier = 'founder') then
    update public.profiles
       set founder_since = coalesce(founder_since, now()),
           founder_number = coalesce(founder_number, nextval('public.founder_number_seq')::integer)
     where id = new.user_id
       and (founder_since is null or founder_number is null);
  end if;
  return new;
end;
$$;

create trigger subscriptions_founder after insert or update of status, plan_id on public.subscriptions
  for each row execute function public.subscriptions_track_founder();

-- -----------------------------------------------------------------------------
-- Fonctions réservées au serveur (rôle service) pour les webhooks
-- -----------------------------------------------------------------------------

-- Réserve le traitement d'un événement : idempotence et protection contre
-- les livraisons concurrentes.
create or replace function public.claim_payment_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_livemode boolean,
  p_payload jsonb
)
returns table (event_row_id uuid, should_process boolean, previous_status public.payment_event_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.payment_events;
begin
  insert into public.payment_events
    (provider, event_id, event_type, event_created_at, livemode, payload, status, attempts, processing_started_at)
  values
    (p_provider, p_event_id, p_event_type, p_event_created_at, coalesce(p_livemode, false), p_payload, 'processing', 1, now())
  on conflict (provider, event_id) do nothing
  returning * into v_row;

  if found then
    return query select v_row.id, true, null::public.payment_event_status;
    return;
  end if;

  select * into v_row from public.payment_events
   where provider = p_provider and event_id = p_event_id
   for update;

  if v_row.status in ('processed', 'ignored') then
    return query select v_row.id, false, v_row.status;
    return;
  end if;

  if v_row.status = 'processing' and v_row.processing_started_at > now() - interval '2 minutes' then
    return query select v_row.id, false, v_row.status;
    return;
  end if;

  update public.payment_events
     set status = 'processing', attempts = attempts + 1, processing_started_at = now(), error = null
   where id = v_row.id;

  return query select v_row.id, true, v_row.status;
end;
$$;

create or replace function public.complete_payment_event(
  p_event_row_id uuid,
  p_status public.payment_event_status,
  p_error text default null,
  p_related_user uuid default null,
  p_related_subscription uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payment_events
     set status = p_status,
         error = left(p_error, 2000),
         processed_at = case when p_status in ('processed', 'ignored') then now() else processed_at end,
         related_user_id = coalesce(p_related_user, related_user_id),
         related_subscription_id = coalesce(p_related_subscription, related_subscription_id)
   where id = p_event_row_id;
$$;

-- Applique l'état d'un abonnement fourni par le prestataire. Un état plus
-- ancien que celui déjà enregistré est ignoré (événements désordonnés).
create or replace function public.upsert_provider_subscription(
  p_user uuid,
  p_provider text,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_provider_price_id text,
  p_status public.subscription_status,
  p_unit_amount_cents integer,
  p_currency text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_cancel_at timestamptz,
  p_canceled_at timestamptz,
  p_ended_at timestamptz,
  p_trial_end timestamptz,
  p_state_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns table (subscription_id uuid, applied boolean, previous_status public.subscription_status, plan_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price public.plan_prices;
  v_plan public.subscription_plans;
  v_existing public.subscriptions;
  v_id uuid;
begin
  select * into v_price from public.plan_prices where provider_price_id = p_provider_price_id;
  if not found then
    raise exception 'UNKNOWN_PRICE: prix % non rattaché à une formule.', p_provider_price_id using errcode = 'P0001';
  end if;
  select * into v_plan from public.subscription_plans where id = v_price.plan_id;

  select * into v_existing from public.subscriptions
   where provider = p_provider and provider_subscription_id = p_provider_subscription_id
   for update;

  if found then
    if v_existing.provider_updated_at is not null and v_existing.provider_updated_at > p_state_at then
      return query select v_existing.id, false, v_existing.status, v_plan.code;
      return;
    end if;
    update public.subscriptions set
      plan_id = v_plan.id,
      plan_price_id = v_price.id,
      provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
      status = p_status,
      unit_amount_cents = p_unit_amount_cents,
      currency = upper(p_currency),
      current_period_start = p_current_period_start,
      current_period_end = p_current_period_end,
      cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
      cancel_at = p_cancel_at,
      canceled_at = p_canceled_at,
      ended_at = p_ended_at,
      trial_end = p_trial_end,
      is_founder_rate = (v_plan.tier = 'founder'),
      provider_updated_at = p_state_at,
      metadata = coalesce(p_metadata, '{}'::jsonb)
    where id = v_existing.id;
    return query select v_existing.id, true, v_existing.status, v_plan.code;
    return;
  end if;

  insert into public.subscriptions (
    user_id, plan_id, plan_price_id, provider, provider_subscription_id, provider_customer_id, status,
    unit_amount_cents, currency, current_period_start, current_period_end, cancel_at_period_end, cancel_at,
    canceled_at, ended_at, trial_end, is_founder_rate, provider_updated_at, metadata
  ) values (
    p_user, v_plan.id, v_price.id, p_provider, p_provider_subscription_id, p_provider_customer_id, p_status,
    p_unit_amount_cents, upper(p_currency), p_current_period_start, p_current_period_end,
    coalesce(p_cancel_at_period_end, false), p_cancel_at, p_canceled_at, p_ended_at, p_trial_end,
    v_plan.tier = 'founder', p_state_at, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return query select v_id, true, null::public.subscription_status, v_plan.code;
end;
$$;

-- Changement du tarif d'une formule (n'affecte que les nouvelles souscriptions).
create or replace function public.admin_set_plan_price(p_plan uuid, p_amount_cents integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
  v_id uuid;
begin
  if not public.has_permission('billing.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_amount_cents is null or p_amount_cents < 0 or p_amount_cents > 100000 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;
  select * into v_plan from public.subscription_plans where id = p_plan for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  update public.plan_prices set is_current = false where plan_id = p_plan and is_current;
  insert into public.plan_prices (plan_id, amount_cents, currency, billing_interval, created_by)
  values (p_plan, p_amount_cents, v_plan.currency, v_plan.billing_interval, auth.uid())
  returning id into v_id;
  update public.subscription_plans set price_cents = p_amount_cents where id = p_plan;
  return v_id;
end;
$$;

-- Abonnement accordé manuellement (partenaires, presse, comptes de test).
create or replace function public.admin_grant_manual_subscription(
  p_user uuid, p_plan uuid, p_until timestamptz, p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
  v_price uuid;
  v_id uuid;
begin
  if not public.has_permission('billing.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_until is null or p_until <= now() then
    raise exception 'INVALID_END_DATE' using errcode = 'P0001';
  end if;
  select * into v_plan from public.subscription_plans where id = p_plan;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  select id into v_price from public.plan_prices where plan_id = p_plan and is_current;
  insert into public.subscriptions (
    user_id, plan_id, plan_price_id, provider, status, unit_amount_cents, currency,
    current_period_start, current_period_end, is_founder_rate, note, created_by
  ) values (
    p_user, p_plan, v_price, 'manual', 'active', 0, v_plan.currency,
    now(), p_until, false, left(p_note, 500), auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_end_manual_subscription(p_subscription uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('billing.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.subscriptions
     set status = 'canceled', ended_at = now(), canceled_at = now(), current_period_end = now()
   where id = p_subscription and provider = 'manual';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS et privilèges
-- -----------------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.plan_prices enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.invoices enable row level security;
alter table public.refunds enable row level security;

grant select on public.subscription_plans to anon, authenticated;
grant update (name, tagline, description, features, max_streams, max_profiles, max_quality, includes_ads,
  is_active, is_public, available_in_phases, sort_order) on public.subscription_plans to authenticated;
create policy plans_read on public.subscription_plans
  for select to anon, authenticated using (is_public or public.has_permission('billing.read'));
create policy plans_update on public.subscription_plans
  for update to authenticated
  using (public.has_permission('billing.manage')) with check (public.has_permission('billing.manage'));

grant select on public.plan_prices to authenticated;
grant update (provider_price_id) on public.plan_prices to authenticated;
create policy plan_prices_read on public.plan_prices
  for select to authenticated using (public.has_permission('billing.read'));
create policy plan_prices_update on public.plan_prices
  for update to authenticated
  using (public.has_permission('billing.manage')) with check (public.has_permission('billing.manage'));

grant select on public.billing_customers to authenticated;
create policy billing_customers_read on public.billing_customers
  for select to authenticated using (user_id = (select auth.uid()) or public.has_permission('billing.read'));

grant select on public.subscriptions to authenticated;
create policy subscriptions_read on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()) or public.has_permission('billing.read'));

grant select on public.payment_events to authenticated;
create policy payment_events_read on public.payment_events
  for select to authenticated using (public.has_permission('billing.read'));

grant select on public.invoices to authenticated;
create policy invoices_read on public.invoices
  for select to authenticated using (user_id = (select auth.uid()) or public.has_permission('billing.read'));

grant select on public.refunds to authenticated;
create policy refunds_read on public.refunds
  for select to authenticated using (user_id = (select auth.uid()) or public.has_permission('billing.read'));

revoke execute on function public.get_entitlements_internal(uuid) from public, anon, authenticated;
grant execute on function public.get_entitlements_internal(uuid) to service_role;
grant execute on function public.get_my_entitlements() to authenticated;
grant execute on function public.current_tier() to anon, authenticated;
grant execute on function public.admin_get_entitlements(uuid) to authenticated;
revoke execute on function public.claim_payment_event(text, text, text, timestamptz, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.claim_payment_event(text, text, text, timestamptz, boolean, jsonb) to service_role;
revoke execute on function public.complete_payment_event(uuid, public.payment_event_status, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_payment_event(uuid, public.payment_event_status, text, uuid, uuid) to service_role;
revoke execute on function public.upsert_provider_subscription(uuid, text, text, text, text, public.subscription_status, integer, text, timestamptz, timestamptz, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_provider_subscription(uuid, text, text, text, text, public.subscription_status, integer, text, timestamptz, timestamptz, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.admin_set_plan_price(uuid, integer) to authenticated;
grant execute on function public.admin_grant_manual_subscription(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.admin_end_manual_subscription(uuid) to authenticated;
