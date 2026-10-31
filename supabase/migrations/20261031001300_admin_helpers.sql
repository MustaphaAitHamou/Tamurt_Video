-- Adresses email de comptes (issues du schéma auth) pour les listes du back-office.
create or replace function public.admin_user_emails(p_ids uuid[])
returns table (id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.has_permission('users.read') or public.has_permission('billing.read')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select u.id, u.email::text from auth.users u where u.id = any (coalesce(p_ids, '{}')) limit 500;
end;
$$;

revoke execute on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;
