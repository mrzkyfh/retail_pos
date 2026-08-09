-- Atomic import for the retail/wholesale master-product workbook.
-- The complete JSON batch is committed or rolled back as one transaction.

create or replace function public.admin_import_products_retail_wholesale(
  p_branch_id uuid,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_product_id uuid;
  v_organization_id uuid;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Hanya owner atau admin yang dapat mengimpor produk';
  end if;

  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_rows, '[]'::jsonb)) = 0 then
    raise exception 'Data impor kosong';
  end if;

  if jsonb_array_length(p_rows) > 1000 then
    raise exception 'Maksimal 1000 produk per proses impor';
  end if;

  v_organization_id := public.current_organization_id();

  for v_row in select value from jsonb_array_elements(p_rows) loop
    if nullif(trim(v_row ->> 'unit_id'), '') is null then
      raise exception 'Satuan produk % tidak valid', coalesce(v_row ->> 'code', '(tanpa SKU)');
    end if;
    if nullif(trim(v_row ->> 'code'), '') is null or nullif(trim(v_row ->> 'name'), '') is null then
      raise exception 'SKU dan nama produk wajib diisi';
    end if;
    if not exists (
      select 1 from public.units
      where id = (v_row ->> 'unit_id')::uuid and organization_id = v_organization_id
    ) then raise exception 'Satuan produk % tidak berasal dari organisasi ini', v_row ->> 'code'; end if;
    if nullif(v_row ->> 'category_id', '') is not null and not exists (
      select 1 from public.categories
      where id = (v_row ->> 'category_id')::uuid and organization_id = v_organization_id
    ) then raise exception 'Kategori produk % tidak berasal dari organisasi ini', v_row ->> 'code'; end if;

    v_product_id := public.admin_create_product_v2(
      p_branch_id,
      v_row ->> 'name',
      v_row ->> 'code',
      nullif(v_row ->> 'category_id', '')::uuid,
      (v_row ->> 'unit_id')::uuid,
      greatest(coalesce((v_row ->> 'retail_price')::numeric, 0), 0),
      greatest(coalesce((v_row ->> 'initial_stock')::numeric, 0), 0),
      greatest(coalesce((v_row ->> 'minimum_stock')::numeric, 0), 0),
      0,
      null,
      '[]'::jsonb
    );

    update public.products
    set barcode = nullif(trim(v_row ->> 'barcode'), ''),
        rack_location = nullif(upper(trim(v_row ->> 'rack_location')), '')
    where id = v_product_id;

    update public.product_units
    set reseller_price = greatest(coalesce((v_row ->> 'reseller_price')::numeric, 0), 0)
    where product_id = v_product_id
      and is_default_sale_unit;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.admin_import_products_retail_wholesale(uuid, jsonb) from public;
grant execute on function public.admin_import_products_retail_wholesale(uuid, jsonb) to authenticated;
