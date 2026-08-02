begin;

create or replace function public.admin_receive_stock(
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_supplier_name text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_supplier_id uuid;
  v_purchase_id uuid;
  v_product_unit_id uuid;
  v_before numeric;
  v_old_cost numeric;
  v_new_cost numeric;
  v_cost_method text;
  v_number text;
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat menerima barang'; end if;
  if coalesce(p_quantity, 0) <= 0 then raise exception 'Jumlah barang harus lebih dari nol'; end if;
  if coalesce(p_unit_cost, 0) < 0 then raise exception 'Harga modal tidak valid'; end if;

  select o.cost_method into v_cost_method from public.organizations o where o.id = v_organization_id;
  select pu.id into v_product_unit_id from public.product_units pu
  join public.products p on p.id = pu.product_id
  where pu.product_id = p_product_id and pu.is_default_sale_unit and p.organization_id = v_organization_id limit 1;
  if v_product_unit_id is null then raise exception 'Satuan produk tidak ditemukan'; end if;

  if nullif(trim(coalesce(p_supplier_name, '')), '') is not null then
    select id into v_supplier_id from public.suppliers
    where organization_id = v_organization_id and lower(name) = lower(trim(p_supplier_name)) limit 1;
    if v_supplier_id is null then
      insert into public.suppliers (organization_id, name) values (v_organization_id, trim(p_supplier_name)) returning id into v_supplier_id;
    end if;
  end if;

  insert into public.branch_products (branch_id, product_id) values (p_branch_id, p_product_id)
  on conflict (branch_id, product_id) do nothing;
  select stock_base_qty, average_cost_per_base into v_before, v_old_cost
  from public.branch_products where branch_id = p_branch_id and product_id = p_product_id for update;

  v_new_cost := case
    when v_cost_method = 'last_purchase' then p_unit_cost
    when v_before + p_quantity > 0 then ((greatest(v_before, 0) * v_old_cost) + (p_quantity * p_unit_cost)) / (greatest(v_before, 0) + p_quantity)
    else p_unit_cost end;

  update public.branch_products set stock_base_qty = v_before + p_quantity,
    average_cost_per_base = v_new_cost, last_purchase_cost_per_base = p_unit_cost
  where branch_id = p_branch_id and product_id = p_product_id;

  v_number := 'PO-' || to_char(clock_timestamp() at time zone 'Asia/Jakarta', 'YYYYMMDD-HH24MISS-MS');
  insert into public.purchases (organization_id, branch_id, supplier_id, purchase_number, status, order_date, total_amount, notes, created_by)
  values (v_organization_id, p_branch_id, v_supplier_id, v_number, 'received', current_date, p_quantity * p_unit_cost, nullif(trim(coalesce(p_notes, '')), ''), auth.uid())
  returning id into v_purchase_id;
  insert into public.purchase_items (purchase_id, product_id, product_unit_id, quantity, received_quantity, unit_cost)
  values (v_purchase_id, p_product_id, v_product_unit_id, p_quantity, p_quantity, p_unit_cost);

  insert into public.stock_movements (organization_id, branch_id, product_id, movement_type, base_quantity_delta, stock_before, stock_after, unit_cost_per_base, reference_type, reference_id, notes, created_by)
  values (v_organization_id, p_branch_id, p_product_id, 'purchase', p_quantity, v_before, v_before + p_quantity, p_unit_cost, 'purchase', v_purchase_id, nullif(trim(coalesce(p_notes, '')), ''), auth.uid());
  return v_purchase_id;
end;
$$;

create or replace function public.admin_transfer_stock(
  p_from_branch_id uuid,
  p_to_branch_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := public.current_organization_id();
  v_from_before numeric;
  v_to_before numeric;
  v_cost numeric;
  v_reference uuid := gen_random_uuid();
begin
  if not public.is_admin() then raise exception 'Hanya admin yang dapat mentransfer stok'; end if;
  if p_from_branch_id = p_to_branch_id then raise exception 'Cabang tujuan harus berbeda'; end if;
  if coalesce(p_quantity, 0) <= 0 then raise exception 'Jumlah transfer harus lebih dari nol'; end if;
  if not exists (select 1 from public.branches where id in (p_from_branch_id, p_to_branch_id) and organization_id = v_organization_id having count(*) = 2) then
    raise exception 'Cabang tidak valid';
  end if;

  select stock_base_qty, average_cost_per_base into v_from_before, v_cost from public.branch_products
  where branch_id = p_from_branch_id and product_id = p_product_id for update;
  if v_from_before is null or v_from_before < p_quantity then raise exception 'Stok cabang asal tidak cukup'; end if;

  insert into public.branch_products (branch_id, product_id, stock_base_qty, average_cost_per_base, last_purchase_cost_per_base)
  values (p_to_branch_id, p_product_id, 0, v_cost, v_cost) on conflict (branch_id, product_id) do nothing;
  select stock_base_qty into v_to_before from public.branch_products
  where branch_id = p_to_branch_id and product_id = p_product_id for update;

  update public.branch_products set stock_base_qty = stock_base_qty - p_quantity where branch_id = p_from_branch_id and product_id = p_product_id;
  update public.branch_products set stock_base_qty = stock_base_qty + p_quantity,
    average_cost_per_base = case when stock_base_qty + p_quantity > 0 then ((stock_base_qty * average_cost_per_base) + (p_quantity * v_cost)) / (stock_base_qty + p_quantity) else v_cost end
  where branch_id = p_to_branch_id and product_id = p_product_id;

  insert into public.stock_movements (organization_id, branch_id, product_id, movement_type, base_quantity_delta, stock_before, stock_after, unit_cost_per_base, reference_type, reference_id, notes, created_by)
  values
    (v_organization_id, p_from_branch_id, p_product_id, 'transfer_out', -p_quantity, v_from_before, v_from_before - p_quantity, v_cost, 'transfer', v_reference, p_notes, auth.uid()),
    (v_organization_id, p_to_branch_id, p_product_id, 'transfer_in', p_quantity, v_to_before, v_to_before + p_quantity, v_cost, 'transfer', v_reference, p_notes, auth.uid());
end;
$$;

grant execute on function public.admin_receive_stock(uuid, uuid, numeric, numeric, text, text) to authenticated;
grant execute on function public.admin_transfer_stock(uuid, uuid, uuid, numeric, text) to authenticated;

commit;
