begin;

create table if not exists public.product_rack_placements (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rack_id uuid not null references public.racks(id) on delete cascade,
  shelf_number integer not null default 1 check (shelf_number > 0),
  position_number integer not null default 1 check (position_number > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (branch_id, product_id)
);

create index if not exists product_rack_placements_rack_idx
  on public.product_rack_placements(rack_id, shelf_number, position_number);

alter table public.product_rack_placements enable row level security;

drop policy if exists product_rack_placements_select on public.product_rack_placements;
create policy product_rack_placements_select on public.product_rack_placements
for select to authenticated
using (
  organization_id = public.current_organization_id()
  and public.has_branch_access(branch_id)
);

drop policy if exists product_rack_placements_write on public.product_rack_placements;
create policy product_rack_placements_write on public.product_rack_placements
for all to authenticated
using (
  organization_id = public.current_organization_id()
  and public.has_branch_access(branch_id)
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
      and role::text in ('owner', 'admin', 'warehouse')
  )
)
with check (
  organization_id = public.current_organization_id()
  and public.has_branch_access(branch_id)
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
      and role::text in ('owner', 'admin', 'warehouse')
  )
);

create or replace function public.validate_rack_placement_links()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.racks
    where id = new.rack_id and branch_id = new.branch_id
      and organization_id = new.organization_id and is_active
  ) then raise exception 'Rak harus berasal dari cabang dan organisasi yang sama'; end if;
  if not exists (
    select 1 from public.products
    where id = new.product_id and organization_id = new.organization_id
  ) then raise exception 'Produk harus berasal dari organisasi yang sama'; end if;
  return new;
end;
$$;

drop trigger if exists product_rack_placements_validate_links on public.product_rack_placements;
create trigger product_rack_placements_validate_links
before insert or update on public.product_rack_placements
for each row execute function public.validate_rack_placement_links();

create or replace function public.set_product_rack_placement(
  p_branch_id uuid,
  p_product_id uuid,
  p_rack_id uuid,
  p_shelf_number integer default 1,
  p_position_number integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_rack_code text;
begin
  if not public.has_branch_access(p_branch_id) or not exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
      and role::text in ('owner', 'admin', 'warehouse')
  ) then raise exception 'Tidak memiliki akses penempatan rak'; end if;

  select code into v_rack_code from public.racks
  where id = p_rack_id and branch_id = p_branch_id
    and organization_id = v_organization_id and is_active;
  if not found then raise exception 'Rak tidak valid'; end if;

  if not exists (
    select 1 from public.products
    where id = p_product_id and organization_id = v_organization_id and is_active
  ) then raise exception 'Produk tidak valid'; end if;

  if p_shelf_number < 1 or p_position_number < 1 then
    raise exception 'Tingkat dan posisi harus lebih dari nol';
  end if;

  insert into public.product_rack_placements (
    organization_id, branch_id, product_id, rack_id,
    shelf_number, position_number, updated_by, updated_at
  ) values (
    v_organization_id, p_branch_id, p_product_id, p_rack_id,
    p_shelf_number, p_position_number, auth.uid(), now()
  )
  on conflict (branch_id, product_id) do update set
    rack_id = excluded.rack_id,
    shelf_number = excluded.shelf_number,
    position_number = excluded.position_number,
    updated_by = auth.uid(),
    updated_at = now();

  -- Keep the legacy location field synchronized for old reports and exports.
  update public.products set rack_location = v_rack_code, updated_at = now()
  where id = p_product_id;
end;
$$;

revoke all on function public.set_product_rack_placement(uuid, uuid, uuid, integer, integer) from public;
grant execute on function public.set_product_rack_placement(uuid, uuid, uuid, integer, integer) to authenticated;

commit;
