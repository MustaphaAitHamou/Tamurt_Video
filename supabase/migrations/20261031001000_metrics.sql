-- =============================================================================
-- Indicateurs agrégés (tableau de bord d'administration et API Tamurt HQ).
-- Fonction réservée au rôle serveur : aucune donnée personnelle n'est exposée.
-- =============================================================================

create or replace function public.platform_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with live_subs as (
    select s.*, p.tier
    from public.subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
    where s.status in ('active', 'trialing', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now() - make_interval(days => public.setting_int('grace_period_days', 7)))
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'users', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'new_in_period', (select count(*) from public.profiles where created_at >= p_from and created_at < p_to),
      'suspended', (select count(*) from public.profiles where suspended_at is not null),
      'founders_ever', (select count(*) from public.profiles where founder_since is not null)
    ),
    'subscriptions', jsonb_build_object(
      'active_total', (select count(*) from live_subs),
      'founder', (select count(*) from live_subs where tier = 'founder'),
      'standard', (select count(*) from live_subs where tier = 'standard'),
      'premium', (select count(*) from live_subs where tier = 'premium'),
      'past_due', (select count(*) from live_subs where status = 'past_due'),
      'cancel_scheduled', (select count(*) from live_subs where cancel_at_period_end),
      'manual', (select count(*) from live_subs where provider = 'manual'),
      'mrr_cents', (select coalesce(sum(unit_amount_cents), 0) from live_subs where provider = 'stripe' and status <> 'past_due'),
      'mrr_by_tier_cents', (
        select coalesce(jsonb_object_agg(tier, total), '{}'::jsonb)
        from (select tier, sum(unit_amount_cents) as total from live_subs where provider = 'stripe' and status <> 'past_due' group by tier) t
      ),
      'canceled_in_period', (select count(*) from public.subscriptions where canceled_at >= p_from and canceled_at < p_to)
    ),
    'revenue', jsonb_build_object(
      'gross_paid_cents', (select coalesce(sum(amount_paid_cents), 0) from public.invoices where paid_at >= p_from and paid_at < p_to),
      'refunded_cents', (select coalesce(sum(amount_cents), 0) from public.refunds where created_at >= p_from and created_at < p_to),
      'fees_cents', (select coalesce(sum(fee_cents), 0) from public.invoices where paid_at >= p_from and paid_at < p_to),
      'tax_cents', (select coalesce(sum(tax_cents), 0) from public.invoices where paid_at >= p_from and paid_at < p_to),
      'invoices_paid', (select count(*) from public.invoices where paid_at >= p_from and paid_at < p_to),
      'payment_failures', (select count(*) from public.payment_events where event_type = 'invoice.payment_failed' and received_at >= p_from and received_at < p_to),
      'webhook_failures', (select count(*) from public.payment_events where status = 'failed' and received_at >= p_from and received_at < p_to)
    ),
    'catalog', jsonb_build_object(
      'titles_published', (select count(*) from public.titles where status = 'published' and deleted_at is null and takedown_at is null),
      'titles_announced', (select count(*) from public.titles where status = 'announced' and deleted_at is null),
      'titles_draft', (select count(*) from public.titles where status in ('draft', 'in_review') and deleted_at is null),
      'titles_taken_down', (select count(*) from public.titles where takedown_at is not null and deleted_at is null),
      'demo_titles', (select count(*) from public.titles where is_demo and deleted_at is null),
      'episodes_published', (select count(*) from public.episodes where status = 'published' and deleted_at is null),
      'media_ready', (select count(*) from public.media_assets where status = 'ready' and deleted_at is null),
      'media_minutes_stored', (select coalesce(round(sum(duration_seconds) / 60.0), 0) from public.media_assets where status = 'ready' and deleted_at is null and provider = 'cloudflare_stream'),
      'licenses_expiring_30d', (select count(*) from public.licenses where status = 'signed' and ends_at between now() and now() + interval '30 days'),
      'claims_open', (select count(*) from public.content_claims where status in ('received', 'reviewing'))
    ),
    'streaming', jsonb_build_object(
      'sessions', (select count(*) from public.watch_history where started_at >= p_from and started_at < p_to),
      'minutes_watched', (select coalesce(round(sum(watched_seconds) / 60.0), 0) from public.watch_history where started_at >= p_from and started_at < p_to),
      'unique_viewers', (select count(distinct account_id) from public.watch_history where started_at >= p_from and started_at < p_to),
      'active_streams_now', (select count(*) from public.watch_history where ended_at is null and last_heartbeat_at > now() - make_interval(secs => public.setting_int('stream_heartbeat_timeout_seconds', 90))),
      'minutes_by_tier', (
        select coalesce(jsonb_object_agg(tier, minutes), '{}'::jsonb) from (
          select coalesce(e.tier::text, 'free') as tier, round(sum(w.watched_seconds) / 60.0) as minutes
          from public.watch_history w
          left join lateral (select tier from public.get_entitlements_internal(w.account_id)) e on true
          where w.started_at >= p_from and w.started_at < p_to
          group by 1
        ) m
      )
    ),
    'requests', jsonb_build_object(
      'open', (select count(*) from public.content_requests where status not in ('available', 'rejected', 'impossible') and not is_hidden and duplicate_of is null),
      'new_in_period', (select count(*) from public.content_requests where created_at >= p_from and created_at < p_to),
      'votes_in_period', (select count(*) from public.content_request_votes where created_at >= p_from and created_at < p_to)
    ),
    'incidents', jsonb_build_object(
      'open', (select count(*) from public.incidents where status <> 'resolved'),
      'critical_open', (select count(*) from public.incidents where status <> 'resolved' and severity = 'critical')
    ),
    'finance_entries', (
      select coalesce(jsonb_object_agg(category, total), '{}'::jsonb) from (
        select category::text, sum(amount_cents) as total
        from public.finance_entries
        where period_month >= date_trunc('month', p_from)::date and period_month < p_to
        group by 1
      ) f
    )
  );
$$;

revoke execute on function public.platform_metrics(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.platform_metrics(timestamptz, timestamptz) to service_role;

-- Abonnements Stripe dont l'échéance est dépassée sans renouvellement reçu (rattrapage planifié).
create or replace function public.subscriptions_needing_reconciliation(p_limit integer default 50)
returns table (provider_subscription_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.provider_subscription_id
  from public.subscriptions s
  where s.provider = 'stripe'
    and s.status in ('active', 'trialing', 'past_due')
    and s.current_period_end < now() - interval '1 hour'
  order by s.current_period_end
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

revoke execute on function public.subscriptions_needing_reconciliation(integer) from public, anon, authenticated;
grant execute on function public.subscriptions_needing_reconciliation(integer) to service_role;
