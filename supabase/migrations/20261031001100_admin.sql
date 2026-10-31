-- =============================================================================
-- Back-office : recherche des utilisateurs (email issu du schéma auth),
-- réservée aux personnes habilitées (users.read).
-- =============================================================================

create or replace function public.admin_list_users(
  p_search text default null,
  p_role public.app_role default null,
  p_tier public.plan_tier default null,
  p_suspended boolean default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  roles public.app_role[],
  tier public.plan_tier,
  plan_code text,
  subscription_status public.subscription_status,
  founder_number integer,
  suspended_at timestamptz,
  total_count bigint
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
  return query
  with base as (
    select
      u.id,
      u.email::text as email,
      p.display_name,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at is not null as email_confirmed,
      coalesce((select array_agg(r.role order by r.role) from public.user_roles r where r.user_id = u.id), '{}') as roles,
      e.tier,
      e.plan_code,
      e.status as subscription_status,
      p.founder_number,
      p.suspended_at
    from auth.users u
    join public.profiles p on p.id = u.id
    left join lateral public.get_entitlements_internal(u.id) e on true
    where (p_search is null or p_search = ''
           or u.email ilike '%' || p_search || '%'
           or p.display_name ilike '%' || p_search || '%'
           or u.id::text = p_search)
      and (p_suspended is null or (p.suspended_at is not null) = p_suspended)
  )
  select b.*, count(*) over () as total_count
  from base b
  where (p_role is null or p_role = any (b.roles))
    and (p_tier is null or b.tier = p_tier)
  order by b.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_list_users(text, public.app_role, public.plan_tier, boolean, integer, integer) to authenticated;
