begin;

alter table public.organizations
  add column if not exists receipt_width smallint not null default 58 check (receipt_width in (58, 80)),
  add column if not exists website_url text,
  add column if not exists receipt_footer text not null default 'Terima kasih sudah berbelanja',
  add column if not exists dark_mode_enabled boolean not null default false,
  add column if not exists stock_notifications_enabled boolean not null default true,
  add column if not exists order_notifications_enabled boolean not null default true,
  add column if not exists shift_notifications_enabled boolean not null default true;

create table if not exists public.product_price_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_unit_id uuid not null references public.product_units(id) on delete cascade,
  old_price numeric(18,2) not null,
  new_price numeric(18,2) not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists product_price_history_product_idx
  on public.product_price_history(product_id, changed_at desc);

alter table public.product_price_history enable row level security;

drop policy if exists product_price_history_select on public.product_price_history;
create policy product_price_history_select on public.product_price_history
for select to authenticated
using (organization_id = public.current_organization_id() and public.is_admin());

create or replace function public.log_product_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  if new.selling_price is distinct from old.selling_price then
    select organization_id into v_organization_id
    from public.products where id = new.product_id;

    insert into public.product_price_history (
      organization_id, product_id, product_unit_id, old_price, new_price, changed_by
    ) values (
      v_organization_id, new.product_id, new.id, old.selling_price, new.selling_price, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists product_units_price_history on public.product_units;
create trigger product_units_price_history
after update of selling_price on public.product_units
for each row execute function public.log_product_price_change();

create or replace function public.admin_create_product_v2(
  p_branch_id uuid,
  p_name text,
  p_code text,
  p_category_id uuid,
  p_base_unit_id uuid,
  p_selling_price numeric,
  p_initial_stock numeric default 0,
  p_minimum_stock numeric default 0,
  p_cost_per_base numeric default 0,
  p_description text default null,
  p_units jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_product_id uuid;
  v_unit jsonb;
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat membuat produk'; end if;
  v_organization_id := public.current_organization_id();

  if not exists (select 1 from public.branches where id = p_branch_id and organization_id = v_organization_id) then
    raise exception 'Cabang tidak valid';
  end if;

  insert into public.products (
    organization_id, category_id, base_unit_id, code, name, description, minimum_stock
  ) values (
    v_organization_id, p_category_id, p_base_unit_id, upper(trim(p_code)), trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''), greatest(coalesce(p_minimum_stock, 0), 0)
  ) returning id into v_product_id;

  insert into public.product_units (product_id, unit_id, conversion_to_base, selling_price, is_default_sale_unit)
  values (v_product_id, p_base_unit_id, 1, greatest(coalesce(p_selling_price, 0), 0), true);

  for v_unit in select * from jsonb_array_elements(coalesce(p_units, '[]'::jsonb)) loop
    if (v_unit ->> 'unit_id')::uuid <> p_base_unit_id then
      insert into public.product_units (product_id, unit_id, conversion_to_base, selling_price, is_default_sale_unit)
      values (
        v_product_id,
        (v_unit ->> 'unit_id')::uuid,
        greatest(coalesce((v_unit ->> 'conversion_to_base')::numeric, 1), 0.001),
        greatest(coalesce((v_unit ->> 'selling_price')::numeric, 0), 0),
        false
      ) on conflict (product_id, unit_id) do update set
        conversion_to_base = excluded.conversion_to_base,
        selling_price = excluded.selling_price,
        is_active = true;
    end if;
  end loop;

  insert into public.branch_products (
    branch_id, product_id, stock_base_qty, average_cost_per_base, last_purchase_cost_per_base
  ) values (
    p_branch_id, v_product_id, coalesce(p_initial_stock, 0),
    greatest(coalesce(p_cost_per_base, 0), 0), greatest(coalesce(p_cost_per_base, 0), 0)
  );

  if coalesce(p_initial_stock, 0) <> 0 then
    insert into public.stock_movements (
      organization_id, branch_id, product_id, movement_type, base_quantity_delta,
      stock_before, stock_after, unit_cost_per_base, reference_type, reference_id, notes, created_by
    ) values (
      v_organization_id, p_branch_id, v_product_id, 'opening', p_initial_stock,
      0, p_initial_stock, p_cost_per_base, 'product', v_product_id,
      'Stok awal saat produk dibuat', auth.uid()
    );
  end if;

  insert into public.audit_logs (organization_id, branch_id, actor_id, action, entity_type, entity_id, after_data)
  values (v_organization_id, p_branch_id, auth.uid(), 'create', 'product', v_product_id::text,
    jsonb_build_object('name', trim(p_name), 'code', upper(trim(p_code))));

  return v_product_id;
end;
$$;

create or replace function public.admin_update_product_v2(
  p_product_id uuid,
  p_branch_id uuid,
  p_name text,
  p_code text,
  p_category_id uuid,
  p_base_unit_id uuid,
  p_selling_price numeric,
  p_minimum_stock numeric,
  p_cost_per_base numeric,
  p_description text,
  p_units jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_unit jsonb;
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat mengubah produk'; end if;
  v_organization_id := public.current_organization_id();

  if not exists (select 1 from public.products where id = p_product_id and organization_id = v_organization_id) then
    raise exception 'Produk tidak ditemukan';
  end if;

  update public.products set
    name = trim(p_name), code = upper(trim(p_code)), category_id = p_category_id,
    base_unit_id = p_base_unit_id, minimum_stock = greatest(coalesce(p_minimum_stock, 0), 0),
    description = nullif(trim(coalesce(p_description, '')), '')
  where id = p_product_id;

  insert into public.product_units (product_id, unit_id, conversion_to_base, selling_price, is_default_sale_unit)
  values (p_product_id, p_base_unit_id, 1, greatest(coalesce(p_selling_price, 0), 0), true)
  on conflict (product_id, unit_id) do update set
    conversion_to_base = 1, selling_price = excluded.selling_price,
    is_default_sale_unit = true, is_active = true;

  update public.product_units
  set is_default_sale_unit = false
  where product_id = p_product_id and unit_id <> p_base_unit_id;

  for v_unit in select * from jsonb_array_elements(coalesce(p_units, '[]'::jsonb)) loop
    if (v_unit ->> 'unit_id')::uuid <> p_base_unit_id then
      insert into public.product_units (product_id, unit_id, conversion_to_base, selling_price, is_default_sale_unit)
      values (
        p_product_id, (v_unit ->> 'unit_id')::uuid,
        greatest(coalesce((v_unit ->> 'conversion_to_base')::numeric, 1), 0.001),
        greatest(coalesce((v_unit ->> 'selling_price')::numeric, 0), 0), false
      ) on conflict (product_id, unit_id) do update set
        conversion_to_base = excluded.conversion_to_base,
        selling_price = excluded.selling_price,
        is_active = true;
    end if;
  end loop;

  insert into public.branch_products (branch_id, product_id, average_cost_per_base, last_purchase_cost_per_base)
  values (p_branch_id, p_product_id, greatest(coalesce(p_cost_per_base, 0), 0), greatest(coalesce(p_cost_per_base, 0), 0))
  on conflict (branch_id, product_id) do update set
    average_cost_per_base = excluded.average_cost_per_base,
    last_purchase_cost_per_base = excluded.last_purchase_cost_per_base;

  insert into public.audit_logs (organization_id, branch_id, actor_id, action, entity_type, entity_id, after_data)
  values (v_organization_id, p_branch_id, auth.uid(), 'update', 'product', p_product_id::text,
    jsonb_build_object('name', trim(p_name), 'code', upper(trim(p_code))));
end;
$$;

create or replace function public.admin_set_products_active(p_product_ids uuid[], p_is_active boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat mengubah produk'; end if;
  update public.products set is_active = p_is_active
  where id = any(p_product_ids) and organization_id = public.current_organization_id();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_cancel_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_before numeric;
begin
  select * into v_sale from public.sales
  where id = p_sale_id and organization_id = public.current_organization_id()
  for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_sale.status <> 'completed' then raise exception 'Hanya transaksi selesai yang dapat dibatalkan'; end if;
  if not public.is_admin() and not (
    v_sale.cashier_id = auth.uid() and coalesce((select cashier_cancel_enabled from public.feature_settings
      where organization_id = v_sale.organization_id and branch_id is null limit 1), false)
  ) then raise exception 'Anda tidak memiliki izin membatalkan transaksi'; end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    select stock_base_qty into v_before from public.branch_products
    where branch_id = v_sale.branch_id and product_id = v_item.product_id for update;
    update public.branch_products set stock_base_qty = stock_base_qty + (v_item.quantity * v_item.conversion_to_base)
    where branch_id = v_sale.branch_id and product_id = v_item.product_id;
    insert into public.stock_movements (
      organization_id, branch_id, product_id, movement_type, base_quantity_delta,
      stock_before, stock_after, reference_type, reference_id, notes, created_by
    ) values (
      v_sale.organization_id, v_sale.branch_id, v_item.product_id, 'sale_return',
      v_item.quantity * v_item.conversion_to_base, v_before,
      v_before + (v_item.quantity * v_item.conversion_to_base), 'sale', p_sale_id,
      'Pembatalan transaksi: ' || trim(p_reason), auth.uid()
    );
  end loop;

  update public.sales set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(), cancellation_reason = trim(p_reason)
  where id = p_sale_id;
end;
$$;

create or replace function public.admin_update_order_status(p_order_id uuid, p_status public.order_status, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.online_orders%rowtype;
  v_item record;
  v_delta numeric;
begin
  select * into v_order from public.online_orders
  where id = p_order_id and organization_id = public.current_organization_id()
  for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if not public.has_branch_access(v_order.branch_id) then raise exception 'Tidak memiliki akses cabang'; end if;

  if p_status = 'accepted' and v_order.status = 'pending' then
    for v_item in
      select oi.*, pu.conversion_to_base from public.online_order_items oi
      join public.product_units pu on pu.id = oi.product_unit_id
      where oi.order_id = p_order_id
    loop
      v_delta := v_item.quantity * v_item.conversion_to_base;
      if not exists (
        select 1 from public.branch_products where branch_id = v_order.branch_id and product_id = v_item.product_id
        and stock_base_qty - reserved_base_qty >= v_delta
      ) then raise exception 'Stok salah satu produk tidak cukup'; end if;
      update public.branch_products set reserved_base_qty = reserved_base_qty + v_delta
      where branch_id = v_order.branch_id and product_id = v_item.product_id;
    end loop;
    update public.online_orders set status = 'accepted', accepted_by = auth.uid(), accepted_at = now(),
      reservation_expires_at = now() + interval '24 hours', notes = coalesce(p_notes, notes)
    where id = p_order_id;
  elsif p_status in ('rejected', 'cancelled') and v_order.status in ('accepted', 'preparing', 'ready') then
    for v_item in
      select oi.*, pu.conversion_to_base from public.online_order_items oi
      join public.product_units pu on pu.id = oi.product_unit_id where oi.order_id = p_order_id
    loop
      v_delta := v_item.quantity * v_item.conversion_to_base;
      update public.branch_products set reserved_base_qty = greatest(reserved_base_qty - v_delta, 0)
      where branch_id = v_order.branch_id and product_id = v_item.product_id;
    end loop;
    update public.online_orders set status = p_status, notes = coalesce(p_notes, notes) where id = p_order_id;
  else
    update public.online_orders set status = p_status, notes = coalesce(p_notes, notes) where id = p_order_id;
  end if;
end;
$$;

create or replace function public.admin_open_shift(p_branch_id uuid, p_cashier_id uuid, p_opening_cash numeric default 0, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat membuka shift manual'; end if;
  if exists (select 1 from public.shifts where branch_id = p_branch_id and cashier_id = p_cashier_id and status = 'open') then
    raise exception 'Kasir masih memiliki shift yang berjalan';
  end if;
  insert into public.shifts (organization_id, branch_id, cashier_id, opening_cash, notes)
  values (public.current_organization_id(), p_branch_id, p_cashier_id, greatest(coalesce(p_opening_cash, 0), 0), nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_close_shift(p_shift_id uuid, p_actual_cash numeric, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_expected numeric;
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat menutup shift manual'; end if;
  select s.opening_cash + coalesce(sum(p.amount), 0) into v_expected
  from public.shifts s
  left join public.sales sa on sa.shift_id = s.id and sa.status = 'completed'
  left join public.payments p on p.sale_id = sa.id and p.method = 'cash'
  where s.id = p_shift_id and s.organization_id = public.current_organization_id() and s.status = 'open'
  group by s.opening_cash;
  if v_expected is null then raise exception 'Shift berjalan tidak ditemukan'; end if;
  update public.shifts set status = 'closed', expected_cash = v_expected,
    actual_cash = greatest(coalesce(p_actual_cash, 0), 0),
    cash_difference = greatest(coalesce(p_actual_cash, 0), 0) - v_expected,
    closed_at = now(), notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes)
  where id = p_shift_id;
end;
$$;

create or replace function public.admin_approve_shift(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat menyetujui shift'; end if;
  update public.shifts set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_shift_id and organization_id = public.current_organization_id() and status = 'closed';
  if not found then raise exception 'Shift tutup tidak ditemukan'; end if;
end;
$$;

create or replace view public.admin_notifications
with (security_invoker = true)
as
select
  'stock-' || bp.branch_id::text || '-' || bp.product_id::text as id,
  bp.branch_id,
  'stock'::text as kind,
  case when bp.stock_base_qty <= 0 then 'Stok habis' else 'Stok menipis' end as title,
  p.name || ' tersisa ' || bp.stock_base_qty::text || ' ' || u.symbol as description,
  bp.updated_at as created_at
from public.branch_products bp
join public.products p on p.id = bp.product_id
join public.units u on u.id = p.base_unit_id
where p.is_active and bp.stock_base_qty <= coalesce(bp.custom_minimum_stock, p.minimum_stock)
union all
select
  'order-' || o.id::text, o.branch_id, 'order', 'Pesanan baru',
  o.order_number || ' dari ' || o.customer_name, o.created_at
from public.online_orders o where o.status = 'pending'
union all
select
  'shift-' || s.id::text, s.branch_id, 'shift', 'Shift menunggu persetujuan',
  coalesce(p.full_name, 'Kasir') || ' telah menutup shift', s.closed_at
from public.shifts s join public.profiles p on p.id = s.cashier_id where s.status = 'closed';

grant select on public.product_price_history, public.admin_notifications to authenticated;
grant execute on function public.admin_create_product_v2(uuid, text, text, uuid, uuid, numeric, numeric, numeric, numeric, text, jsonb) to authenticated;
grant execute on function public.admin_update_product_v2(uuid, uuid, text, text, uuid, uuid, numeric, numeric, numeric, text, jsonb) to authenticated;
grant execute on function public.admin_set_products_active(uuid[], boolean) to authenticated;
grant execute on function public.admin_cancel_sale(uuid, text) to authenticated;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.admin_open_shift(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.admin_close_shift(uuid, numeric, text) to authenticated;
grant execute on function public.admin_approve_shift(uuid) to authenticated;

commit;
