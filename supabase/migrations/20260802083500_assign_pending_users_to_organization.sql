begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_branch_id uuid;
  v_is_first_owner boolean;
begin
  select id into v_organization_id
  from public.organizations
  order by created_at asc
  limit 1;

  select not exists (
    select 1 from public.profiles where role = 'owner' and status = 'active'
  ) into v_is_first_owner;

  if v_is_first_owner then
    select id into v_branch_id
    from public.branches
    where organization_id = v_organization_id
    order by created_at asc
    limit 1;

    insert into public.profiles (
      id,
      organization_id,
      full_name,
      phone,
      address,
      role,
      status,
      approved_at
    ) values (
      new.id,
      v_organization_id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'Owner'), '@', 1)),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      nullif(new.raw_user_meta_data ->> 'address', ''),
      'owner',
      'active',
      now()
    )
    on conflict (id) do nothing;

    if v_branch_id is not null then
      insert into public.branch_members (branch_id, user_id, is_default)
      values (v_branch_id, new.id, true)
      on conflict do nothing;
    end if;
  else
    insert into public.profiles (id, organization_id, full_name, phone, address)
    values (
      new.id,
      v_organization_id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'Pegawai'), '@', 1)),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      nullif(new.raw_user_meta_data ->> 'address', '')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

update public.profiles p
set organization_id = o.id
from (
  select id from public.organizations order by created_at asc limit 1
) o
where p.organization_id is null and p.status = 'pending';

commit;
