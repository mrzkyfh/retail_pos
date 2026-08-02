begin;

create or replace function public.admin_create_product(
  p_branch_id uuid,
  p_name text,
  p_code text,
  p_category_id uuid,
  p_base_unit_id uuid,
  p_selling_price numeric,
  p_initial_stock numeric default 0,
  p_minimum_stock numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_product_id uuid;
  v_product_unit_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat membuat produk';
  end if;

  v_organization_id := public.current_organization_id();
  if v_organization_id is null then
    raise exception 'Profil aktif tidak ditemukan';
  end if;

  if not exists (
    select 1 from public.branches
    where id = p_branch_id and organization_id = v_organization_id and is_active
  ) then
    raise exception 'Cabang tidak valid';
  end if;

  if not exists (
    select 1 from public.units
    where id = p_base_unit_id and organization_id = v_organization_id
  ) then
    raise exception 'Satuan dasar tidak valid';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories
    where id = p_category_id and organization_id = v_organization_id
  ) then
    raise exception 'Kategori tidak valid';
  end if;

  insert into public.products (
    organization_id,
    category_id,
    base_unit_id,
    code,
    name,
    minimum_stock
  ) values (
    v_organization_id,
    p_category_id,
    p_base_unit_id,
    upper(trim(p_code)),
    trim(p_name),
    greatest(coalesce(p_minimum_stock, 0), 0)
  )
  returning id into v_product_id;

  insert into public.product_units (
    product_id,
    unit_id,
    conversion_to_base,
    selling_price,
    is_default_sale_unit
  ) values (
    v_product_id,
    p_base_unit_id,
    1,
    greatest(coalesce(p_selling_price, 0), 0),
    true
  )
  returning id into v_product_unit_id;

  insert into public.branch_products (
    branch_id,
    product_id,
    stock_base_qty
  ) values (
    p_branch_id,
    v_product_id,
    coalesce(p_initial_stock, 0)
  );

  if coalesce(p_initial_stock, 0) <> 0 then
    insert into public.stock_movements (
      organization_id,
      branch_id,
      product_id,
      movement_type,
      base_quantity_delta,
      stock_before,
      stock_after,
      reference_type,
      reference_id,
      notes,
      created_by
    ) values (
      v_organization_id,
      p_branch_id,
      v_product_id,
      'opening',
      p_initial_stock,
      0,
      p_initial_stock,
      'product',
      v_product_id,
      'Stok awal saat produk dibuat',
      (select auth.uid())
    );
  end if;

  insert into public.audit_logs (
    organization_id,
    branch_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  ) values (
    v_organization_id,
    p_branch_id,
    (select auth.uid()),
    'create',
    'product',
    v_product_id::text,
    jsonb_build_object('name', trim(p_name), 'code', upper(trim(p_code)))
  );

  return v_product_id;
end;
$$;

create or replace function public.admin_adjust_stock(
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity_delta numeric,
  p_movement_type public.stock_movement_type,
  p_notes text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_stock_before numeric;
  v_stock_after numeric;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat menyesuaikan stok';
  end if;

  if p_quantity_delta = 0 then
    raise exception 'Perubahan stok tidak boleh nol';
  end if;

  v_organization_id := public.current_organization_id();

  if not exists (
    select 1
    from public.branches b
    join public.products p on p.organization_id = b.organization_id
    where b.id = p_branch_id
      and p.id = p_product_id
      and b.organization_id = v_organization_id
  ) then
    raise exception 'Produk atau cabang tidak valid';
  end if;

  insert into public.branch_products (branch_id, product_id, stock_base_qty)
  values (p_branch_id, p_product_id, 0)
  on conflict (branch_id, product_id) do nothing;

  select stock_base_qty
  into v_stock_before
  from public.branch_products
  where branch_id = p_branch_id and product_id = p_product_id
  for update;

  v_stock_after := v_stock_before + p_quantity_delta;

  update public.branch_products
  set stock_base_qty = v_stock_after, updated_at = now()
  where branch_id = p_branch_id and product_id = p_product_id;

  insert into public.stock_movements (
    organization_id,
    branch_id,
    product_id,
    movement_type,
    base_quantity_delta,
    stock_before,
    stock_after,
    notes,
    created_by
  ) values (
    v_organization_id,
    p_branch_id,
    p_product_id,
    p_movement_type,
    p_quantity_delta,
    v_stock_before,
    v_stock_after,
    nullif(trim(coalesce(p_notes, '')), ''),
    (select auth.uid())
  );

  insert into public.audit_logs (
    organization_id,
    branch_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) values (
    v_organization_id,
    p_branch_id,
    (select auth.uid()),
    'adjust_stock',
    'product',
    p_product_id::text,
    jsonb_build_object('stock', v_stock_before),
    jsonb_build_object('stock', v_stock_after, 'delta', p_quantity_delta, 'reason', p_movement_type)
  );

  return v_stock_after;
end;
$$;

revoke all on function public.admin_create_product(uuid, text, text, uuid, uuid, numeric, numeric, numeric) from public;
revoke all on function public.admin_adjust_stock(uuid, uuid, numeric, public.stock_movement_type, text) from public;
grant execute on function public.admin_create_product(uuid, text, text, uuid, uuid, numeric, numeric, numeric) to authenticated;
grant execute on function public.admin_adjust_stock(uuid, uuid, numeric, public.stock_movement_type, text) to authenticated;

commit;
