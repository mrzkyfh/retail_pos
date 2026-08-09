begin;

create table if not exists public.document_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_key text not null,
  period_key text not null,
  current_value bigint not null default 0,
  primary key (organization_id, document_key, period_key)
);

alter table public.document_sequences enable row level security;

create or replace function public.next_document_sequence(
  p_organization_id uuid,
  p_document_key text,
  p_period_key text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v_value bigint;
begin
  insert into public.document_sequences (organization_id, document_key, period_key, current_value)
  values (p_organization_id, p_document_key, p_period_key, 1)
  on conflict (organization_id, document_key, period_key)
  do update set current_value = public.document_sequences.current_value + 1
  returning current_value into v_value;
  return v_value;
end;
$$;

revoke all on function public.next_document_sequence(uuid, text, text) from public;

create or replace function public.pos_checkout_retail_wholesale(
  p_branch_id uuid,
  p_customer_id uuid,
  p_customer_type text,
  p_items jsonb,
  p_payment_method text,
  p_paid_amount numeric,
  p_notes text,
  p_client_transaction_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_sale_id uuid;
  v_shift_id uuid;
  v_customer_type text;
  v_transaction_number text;
  v_invoice_number text;
  v_sequence bigint;
  v_item jsonb;
  v_product_id uuid;
  v_product_unit_id uuid;
  v_product_name text;
  v_unit_name text;
  v_quantity numeric;
  v_conversion numeric;
  v_unit_price numeric;
  v_cost numeric;
  v_stock_before numeric;
  v_stock_after numeric;
  v_subtotal numeric;
  v_profit numeric;
  v_total numeric := 0;
  v_total_profit numeric := 0;
  v_allow_negative boolean := false;
  v_existing_sale jsonb;
begin
  v_organization_id := public.current_organization_id();
  if v_organization_id is null or not public.has_branch_access(p_branch_id) then
    raise exception 'Cabang tidak dapat diakses';
  end if;
  if not exists (
    select 1 from public.branches
    where id = p_branch_id and organization_id = v_organization_id and is_active
  ) then raise exception 'Cabang tidak aktif atau tidak valid'; end if;
  if p_client_transaction_id is not null then
    select jsonb_build_object(
      'sale_id', id, 'transaction_number', transaction_number,
      'invoice_number', invoice_number, 'customer_type', customer_type_snapshot,
      'total', total_amount, 'paid', paid_amount, 'change', change_amount,
      'already_processed', true
    ) into v_existing_sale
    from public.sales
    where organization_id = v_organization_id
      and client_transaction_id = p_client_transaction_id;
    if v_existing_sale is not null then return v_existing_sale; end if;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang transaksi kosong';
  end if;
  if p_payment_method not in ('cash', 'qris', 'transfer', 'credit', 'other') then
    raise exception 'Metode pembayaran tidak valid';
  end if;
  if coalesce(p_paid_amount, 0) < 0 then
    raise exception 'Jumlah pembayaran tidak valid';
  end if;

  -- Never trust a client-supplied price mode. Reseller pricing is derived only
  -- from an active registered customer in the same organization.
  v_customer_type := 'retail';
  if p_customer_id is not null then
    select customer_type into v_customer_type
    from public.customers
    where id = p_customer_id and organization_id = v_organization_id and status = 'active';
    if not found then raise exception 'Customer tidak aktif atau tidak ditemukan'; end if;
  end if;

  select coalesce(negative_stock_enabled, false) into v_allow_negative
  from public.feature_settings
  where organization_id = v_organization_id and (branch_id = p_branch_id or branch_id is null)
  order by (branch_id is not null) desc
  limit 1;
  v_allow_negative := coalesce(v_allow_negative, false);

  select id into v_shift_id
  from public.shifts
  where branch_id = p_branch_id and cashier_id = auth.uid() and status = 'open'
  order by opened_at desc limit 1;

  v_sequence := public.next_document_sequence(v_organization_id, 'TRX', to_char(current_date, 'YYYYMMDD'));
  v_transaction_number := 'TRX-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 5, '0');
  if v_customer_type = 'reseller' then
    v_sequence := public.next_document_sequence(v_organization_id, 'INV', to_char(current_date, 'YYYYMM'));
    v_invoice_number := 'INV-' || to_char(current_date, 'YYYYMM') || '-' || lpad(v_sequence::text, 5, '0');
  end if;

  insert into public.sales (
    organization_id, branch_id, shift_id, cashier_id, customer_id,
    transaction_number, client_transaction_id, status, subtotal, total_amount,
    paid_amount, change_amount, gross_profit, notes, customer_type_snapshot,
    invoice_number, document_type
  ) values (
    v_organization_id, p_branch_id, v_shift_id, auth.uid(), p_customer_id,
    v_transaction_number, coalesce(p_client_transaction_id, gen_random_uuid()), 'completed', 0, 0,
    0, 0, 0, nullif(trim(coalesce(p_notes, '')), ''), v_customer_type,
    v_invoice_number, case when v_customer_type = 'reseller' then 'invoice' else 'receipt' end
  ) returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_unit_id := (v_item ->> 'product_unit_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;
    if v_quantity <= 0 then raise exception 'Jumlah produk harus lebih dari nol'; end if;

    select p.id, pu.id, p.name, u.name, pu.conversion_to_base,
      case when v_customer_type = 'reseller' then pu.reseller_price
           else coalesce(bp.custom_selling_price, pu.selling_price) end,
      bp.average_cost_per_base, bp.stock_base_qty
    into v_product_id, v_product_unit_id, v_product_name, v_unit_name, v_conversion,
      v_unit_price, v_cost, v_stock_before
    from public.product_units pu
    join public.products p on p.id = pu.product_id
    join public.units u on u.id = pu.unit_id
    join public.branch_products bp on bp.product_id = p.id and bp.branch_id = p_branch_id
    where pu.id = v_product_unit_id and pu.is_active and p.is_active
      and p.organization_id = v_organization_id and bp.is_available
    for update of bp;

    if not found then raise exception 'Produk atau satuan tidak tersedia'; end if;
    v_stock_after := v_stock_before - (v_quantity * v_conversion);
    if not v_allow_negative and v_stock_after < 0 then
      raise exception 'Stok % tidak mencukupi', v_product_name;
    end if;
    v_subtotal := round(v_quantity * v_unit_price, 2);
    v_profit := round(v_subtotal - (v_quantity * v_conversion * v_cost), 2);

    insert into public.sale_items (
      sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
      quantity, conversion_to_base, unit_price, cost_per_base_snapshot, subtotal, profit_amount
    ) values (
      v_sale_id, v_product_id, v_product_unit_id, v_product_name, v_unit_name,
      v_quantity, v_conversion, v_unit_price, v_cost, v_subtotal, v_profit
    );

    update public.branch_products
    set stock_base_qty = v_stock_after, updated_at = now()
    where branch_id = p_branch_id and product_id = v_product_id;

    insert into public.stock_movements (
      organization_id, branch_id, product_id, movement_type, base_quantity_delta,
      stock_before, stock_after, unit_cost_per_base, reference_type, reference_id,
      notes, created_by
    ) values (
      v_organization_id, p_branch_id, v_product_id, 'sale', -(v_quantity * v_conversion),
      v_stock_before, v_stock_after, v_cost, 'sale', v_sale_id,
      'Penjualan ' || v_transaction_number, auth.uid()
    );
    v_total := v_total + v_subtotal;
    v_total_profit := v_total_profit + v_profit;
  end loop;

  if p_payment_method <> 'credit' and coalesce(p_paid_amount, 0) < v_total then
    raise exception 'Jumlah pembayaran kurang dari total transaksi';
  end if;

  update public.sales set
    subtotal = v_total,
    total_amount = v_total,
    paid_amount = coalesce(p_paid_amount, 0),
    change_amount = greatest(coalesce(p_paid_amount, 0) - v_total, 0),
    gross_profit = v_total_profit
  where id = v_sale_id;

  if coalesce(p_paid_amount, 0) > 0 then
    insert into public.payments (sale_id, method, amount, received_by)
    values (v_sale_id, p_payment_method, least(p_paid_amount, v_total), auth.uid());
  end if;

  insert into public.audit_logs (
    organization_id, branch_id, actor_id, action, entity_type, entity_id, after_data
  ) values (
    v_organization_id, p_branch_id, auth.uid(), 'checkout', 'sale', v_sale_id::text,
    jsonb_build_object('transaction_number', v_transaction_number, 'customer_type', v_customer_type, 'total', v_total)
  );

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'transaction_number', v_transaction_number,
    'invoice_number', v_invoice_number,
    'customer_type', v_customer_type,
    'total', v_total,
    'paid', coalesce(p_paid_amount, 0),
    'change', greatest(coalesce(p_paid_amount, 0) - v_total, 0)
  );
end;
$$;

create or replace function public.create_stock_opname_review(
  p_branch_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_opname_id uuid;
  v_number text;
  v_sequence bigint;
  v_item jsonb;
  v_product_id uuid;
  v_system_stock numeric;
begin
  v_organization_id := public.current_organization_id();
  if not public.has_branch_access(p_branch_id) or not exists (
    select 1 from public.profiles where id = auth.uid() and status = 'active'
      and role::text in ('owner', 'admin', 'warehouse')
  ) then raise exception 'Tidak memiliki akses stock opname'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Data stock opname kosong';
  end if;

  v_sequence := public.next_document_sequence(v_organization_id, 'OPN', to_char(current_date, 'YYYYMM'));
  v_number := 'OPN-' || to_char(current_date, 'YYYYMM') || '-' || lpad(v_sequence::text, 4, '0');
  insert into public.stock_opnames (
    organization_id, branch_id, opname_number, status, counted_at, notes, created_by
  ) values (
    v_organization_id, p_branch_id, v_number, 'review', now(), nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
  ) returning id into v_opname_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    select stock_base_qty into v_system_stock
    from public.branch_products
    where branch_id = p_branch_id and product_id = v_product_id;
    if not found then raise exception 'Produk opname tidak ditemukan'; end if;
    if (v_item ->> 'physical_stock') is null or (v_item ->> 'physical_stock')::numeric < 0 then
      raise exception 'Stok fisik tidak boleh kosong atau negatif';
    end if;
    insert into public.stock_opname_items (
      stock_opname_id, product_id, system_stock, physical_stock, notes
    ) values (
      v_opname_id, v_product_id, v_system_stock,
      (v_item ->> 'physical_stock')::numeric,
      nullif(trim(coalesce(v_item ->> 'notes', '')), '')
    );
  end loop;
  return v_opname_id;
end;
$$;

create or replace function public.confirm_stock_opname(p_stock_opname_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opname public.stock_opnames%rowtype;
  v_item record;
  v_stock_before numeric;
  v_stock_after numeric;
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Hanya Owner atau Admin yang dapat mengonfirmasi opname'; end if;
  select * into v_opname from public.stock_opnames
  where id = p_stock_opname_id and organization_id = public.current_organization_id()
  for update;
  if not found then raise exception 'Stock opname tidak ditemukan'; end if;
  if v_opname.status <> 'review' then raise exception 'Stock opname tidak sedang menunggu review'; end if;

  for v_item in select * from public.stock_opname_items where stock_opname_id = v_opname.id loop
    if v_item.physical_stock is null then raise exception 'Masih ada stok fisik yang kosong'; end if;
    select stock_base_qty into v_stock_before from public.branch_products
    where branch_id = v_opname.branch_id and product_id = v_item.product_id for update;
    v_stock_after := v_item.physical_stock;
    if v_stock_after is distinct from v_stock_before then
      update public.branch_products set stock_base_qty = v_stock_after, updated_at = now()
      where branch_id = v_opname.branch_id and product_id = v_item.product_id;
      insert into public.stock_movements (
        organization_id, branch_id, product_id, movement_type, base_quantity_delta,
        stock_before, stock_after, reference_type, reference_id, notes, created_by
      ) values (
        v_opname.organization_id, v_opname.branch_id, v_item.product_id, 'adjustment',
        v_stock_after - v_stock_before, v_stock_before, v_stock_after,
        'stock_opname', v_opname.id, 'Konfirmasi ' || v_opname.opname_number, auth.uid()
      );
      v_count := v_count + 1;
    end if;
  end loop;

  update public.stock_opnames set status = 'confirmed', confirmed_by = auth.uid(),
    confirmed_at = now(), updated_at = now()
  where id = v_opname.id;
  return v_count;
end;
$$;

revoke all on function public.pos_checkout_retail_wholesale(uuid, uuid, text, jsonb, text, numeric, text, uuid) from public;
revoke all on function public.create_stock_opname_review(uuid, jsonb, text) from public;
revoke all on function public.confirm_stock_opname(uuid) from public;
grant execute on function public.pos_checkout_retail_wholesale(uuid, uuid, text, jsonb, text, numeric, text, uuid) to authenticated;
grant execute on function public.create_stock_opname_review(uuid, jsonb, text) to authenticated;
grant execute on function public.confirm_stock_opname(uuid) to authenticated;

commit;
