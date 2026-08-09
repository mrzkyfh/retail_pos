-- ================================================================
-- SEED PRODUK RETAIL & GROSIR
-- Jalankan setelah migration 20260809120000_retail_wholesale_blueprint.sql.
--
-- Aman dijalankan ulang:
--   * master produk dan harga akan diperbarui berdasarkan SKU;
--   * stok awal hanya dibuat jika produk belum terhubung ke cabang;
--   * stok operasional yang sudah ada tidak ditimpa.
-- ================================================================

do $$
declare
  v_organization_id uuid;
  v_branch_id uuid;
  v_actor_id uuid;
  v_category_id uuid;
  v_base_unit_id uuid;
  v_extra_unit_id uuid;
  v_product_id uuid;
  v_row jsonb;
  v_extra jsonb;
  v_is_new_branch_product boolean;
begin
  -- Prioritaskan data demo Agung Lestari, lalu gunakan organisasi pertama.
  select id
  into v_organization_id
  from public.organizations
  order by (name = 'Toko Agung Lestari') desc, created_at
  limit 1;

  if v_organization_id is null then
    raise exception 'Organisasi belum tersedia. Buat organisasi terlebih dahulu.';
  end if;

  -- Prioritaskan cabang Antapani, lalu gunakan cabang aktif pertama.
  select id
  into v_branch_id
  from public.branches
  where organization_id = v_organization_id
    and is_active
  order by (name = 'Antapani') desc, created_at
  limit 1;

  if v_branch_id is null then
    raise exception 'Cabang aktif belum tersedia.';
  end if;

  -- Dibutuhkan untuk audit pergerakan stok pembuka.
  select id
  into v_actor_id
  from public.profiles
  where organization_id = v_organization_id
    and status = 'active'
    and role::text in ('owner', 'admin')
  order by (role::text = 'owner') desc, created_at
  limit 1;

  if v_actor_id is null then
    raise exception 'Owner/Admin aktif belum tersedia.';
  end if;

  for v_row in
    select value
    from jsonb_array_elements($products$
    [
      {
        "sku": "SMB-BRS-005", "barcode": "8997001010051", "name": "Beras Premium 5 kg",
        "category": "Sembako", "unit": "Pak", "unit_symbol": "pak",
        "cost": 69000, "retail": 79000, "reseller": 74500,
        "stock": 24, "minimum": 5, "rack": "A-01", "extra_units": []
      },
      {
        "sku": "SMB-GLA-001", "barcode": "8997001020012", "name": "Gula Pasir 1 kg",
        "category": "Sembako", "unit": "Bungkus", "unit_symbol": "bks",
        "cost": 15500, "retail": 18000, "reseller": 16800,
        "stock": 40, "minimum": 10, "rack": "A-01",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 20, "retail": 350000, "reseller": 330000}]
      },
      {
        "sku": "SMB-MYG-001", "barcode": "8997001030011", "name": "Minyak Goreng 1 liter",
        "category": "Sembako", "unit": "Botol", "unit_symbol": "btl",
        "cost": 16500, "retail": 19500, "reseller": 18250,
        "stock": 48, "minimum": 12, "rack": "A-02",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 12, "retail": 228000, "reseller": 216000}]
      },
      {
        "sku": "SMB-TRG-250", "barcode": "8997001040256", "name": "Tepung Terigu 250 gram",
        "category": "Sembako", "unit": "Bungkus", "unit_symbol": "bks",
        "cost": 3000, "retail": 4000, "reseller": 3500,
        "stock": 60, "minimum": 15, "rack": "A-02",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 40, "retail": 150000, "reseller": 138000}]
      },
      {
        "sku": "MKN-MIE-001", "barcode": "089686010010", "name": "Mi Instan Goreng",
        "category": "Makanan", "unit": "Eceran", "unit_symbol": "pcs",
        "cost": 2800, "retail": 3500, "reseller": 3200,
        "stock": 160, "minimum": 40, "rack": "B-01",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 40, "retail": 136000, "reseller": 126000}]
      },
      {
        "sku": "MKN-BSK-140", "barcode": "8997001060148", "name": "Biskuit Kelapa 140 gram",
        "category": "Makanan", "unit": "Bungkus", "unit_symbol": "bks",
        "cost": 6500, "retail": 8500, "reseller": 7500,
        "stock": 45, "minimum": 10, "rack": "B-02",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 24, "retail": 198000, "reseller": 177000}]
      },
      {
        "sku": "MKN-SNK-060", "barcode": "8997001070062", "name": "Makanan Ringan 60 gram",
        "category": "Makanan", "unit": "Bungkus", "unit_symbol": "bks",
        "cost": 6500, "retail": 8500, "reseller": 7500,
        "stock": 48, "minimum": 12, "rack": "B-02",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 24, "retail": 198000, "reseller": 176000}]
      },
      {
        "sku": "MNM-AM-600", "barcode": "8997001080603", "name": "Air Mineral 600 ml",
        "category": "Minuman", "unit": "Botol", "unit_symbol": "btl",
        "cost": 2500, "retail": 3500, "reseller": 3000,
        "stock": 120, "minimum": 24, "rack": "C-01",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 24, "retail": 80000, "reseller": 71000}]
      },
      {
        "sku": "MNM-TEH-350", "barcode": "8997001090350", "name": "Teh Melati 350 ml",
        "category": "Minuman", "unit": "Botol", "unit_symbol": "btl",
        "cost": 3200, "retail": 4500, "reseller": 4000,
        "stock": 72, "minimum": 18, "rack": "C-01",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 24, "retail": 104000, "reseller": 94000}]
      },
      {
        "sku": "MNM-KPI-001", "barcode": "8997001100011", "name": "Kopi Instan Sachet",
        "category": "Minuman", "unit": "Sachet", "unit_symbol": "sct",
        "cost": 1500, "retail": 2000, "reseller": 1750,
        "stock": 200, "minimum": 50, "rack": "C-02",
        "extra_units": [
          {"unit": "Renteng", "symbol": "rtg", "conversion": 10, "retail": 19000, "reseller": 17000},
          {"unit": "Dus", "symbol": "dus", "conversion": 100, "retail": 185000, "reseller": 165000}
        ]
      },
      {
        "sku": "MNM-SKM-370", "barcode": "8997001110379", "name": "Susu Kental Manis 370 gram",
        "category": "Minuman", "unit": "Eceran", "unit_symbol": "pcs",
        "cost": 11000, "retail": 13500, "reseller": 12250,
        "stock": 36, "minimum": 8, "rack": "C-02",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 24, "retail": 318000, "reseller": 288000}]
      },
      {
        "sku": "RKK-KRT-012", "barcode": "8997001120019", "name": "Rokok Kretek 12 batang",
        "category": "Rokok", "unit": "Pak", "unit_symbol": "pak",
        "cost": 19500, "retail": 22000, "reseller": 20750,
        "stock": 60, "minimum": 12, "rack": "D-01",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 10, "retail": 215000, "reseller": 202000}]
      },
      {
        "sku": "RMH-SBN-450", "barcode": "8997001130452", "name": "Sabun Cuci Piring 450 ml",
        "category": "Kebutuhan Rumah", "unit": "Botol", "unit_symbol": "btl",
        "cost": 7500, "retail": 9500, "reseller": 8500,
        "stock": 36, "minimum": 8, "rack": "E-01",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 12, "retail": 111000, "reseller": 99000}]
      },
      {
        "sku": "RMH-DTR-800", "barcode": "8997001140802", "name": "Deterjen Bubuk 800 gram",
        "category": "Kebutuhan Rumah", "unit": "Bungkus", "unit_symbol": "bks",
        "cost": 16500, "retail": 19500, "reseller": 18000,
        "stock": 30, "minimum": 6, "rack": "E-01",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 12, "retail": 228000, "reseller": 210000}]
      },
      {
        "sku": "RMH-TSU-250", "barcode": "8997001150252", "name": "Tisu Wajah 250 lembar",
        "category": "Kebutuhan Rumah", "unit": "Pak", "unit_symbol": "pak",
        "cost": 8500, "retail": 11000, "reseller": 9750,
        "stock": 40, "minimum": 10, "rack": "E-02",
        "extra_units": [{"unit": "Dus", "symbol": "dus", "conversion": 24, "retail": 255000, "reseller": 228000}]
      },
      {
        "sku": "SGR-TLR-001", "barcode": "8997001160015", "name": "Telur Ayam",
        "category": "Produk Segar", "unit": "Butir", "unit_symbol": "butir",
        "cost": 1800, "retail": 2300, "reseller": 2050,
        "stock": 180, "minimum": 30, "rack": "F-01",
        "extra_units": [{"unit": "Peti", "symbol": "peti", "conversion": 30, "retail": 67000, "reseller": 60000}]
      }
    ]
    $products$::jsonb)
  loop
    -- Pastikan kategori tersedia.
    select id into v_category_id
    from public.categories
    where organization_id = v_organization_id
      and lower(name) = lower(v_row ->> 'category')
    limit 1;

    if v_category_id is null then
      insert into public.categories (organization_id, name)
      values (v_organization_id, v_row ->> 'category')
      returning id into v_category_id;
    end if;

    -- Pastikan satuan dasar tersedia.
    select id into v_base_unit_id
    from public.units
    where organization_id = v_organization_id
      and lower(name) = lower(v_row ->> 'unit')
    limit 1;

    if v_base_unit_id is null then
      insert into public.units (organization_id, name, symbol, allows_decimal)
      values (
        v_organization_id,
        v_row ->> 'unit',
        v_row ->> 'unit_symbol',
        false
      )
      returning id into v_base_unit_id;
    end if;

    -- Upsert master produk berdasarkan SKU organisasi.
    insert into public.products (
      organization_id, category_id, base_unit_id, code, barcode,
      name, description, minimum_stock, rack_location, is_active
    ) values (
      v_organization_id,
      v_category_id,
      v_base_unit_id,
      upper(v_row ->> 'sku'),
      nullif(v_row ->> 'barcode', ''),
      v_row ->> 'name',
      'Produk contoh retail dan grosir',
      (v_row ->> 'minimum')::numeric,
      nullif(upper(v_row ->> 'rack'), ''),
      true
    )
    on conflict (organization_id, code) do update set
      category_id = excluded.category_id,
      base_unit_id = excluded.base_unit_id,
      barcode = excluded.barcode,
      name = excluded.name,
      minimum_stock = excluded.minimum_stock,
      rack_location = excluded.rack_location,
      is_active = true,
      updated_at = now()
    returning id into v_product_id;

    -- Harga satuan dasar: retail dan reseller.
    insert into public.product_units (
      product_id, unit_id, conversion_to_base, selling_price,
      reseller_price, is_default_sale_unit, is_active
    ) values (
      v_product_id,
      v_base_unit_id,
      1,
      (v_row ->> 'retail')::numeric,
      (v_row ->> 'reseller')::numeric,
      true,
      true
    )
    on conflict (product_id, unit_id) do update set
      conversion_to_base = 1,
      selling_price = excluded.selling_price,
      reseller_price = excluded.reseller_price,
      is_default_sale_unit = true,
      is_active = true,
      updated_at = now();

    -- Satuan grosir tambahan, misalnya Dus atau Renteng.
    for v_extra in
      select value from jsonb_array_elements(coalesce(v_row -> 'extra_units', '[]'::jsonb))
    loop
      select id into v_extra_unit_id
      from public.units
      where organization_id = v_organization_id
        and lower(name) = lower(v_extra ->> 'unit')
      limit 1;

      if v_extra_unit_id is null then
        insert into public.units (organization_id, name, symbol, allows_decimal)
        values (
          v_organization_id,
          v_extra ->> 'unit',
          v_extra ->> 'symbol',
          false
        )
        returning id into v_extra_unit_id;
      end if;

      insert into public.product_units (
        product_id, unit_id, conversion_to_base, selling_price,
        reseller_price, is_default_sale_unit, is_active
      ) values (
        v_product_id,
        v_extra_unit_id,
        (v_extra ->> 'conversion')::numeric,
        (v_extra ->> 'retail')::numeric,
        (v_extra ->> 'reseller')::numeric,
        false,
        true
      )
      on conflict (product_id, unit_id) do update set
        conversion_to_base = excluded.conversion_to_base,
        selling_price = excluded.selling_price,
        reseller_price = excluded.reseller_price,
        is_default_sale_unit = false,
        is_active = true,
        updated_at = now();
    end loop;

    -- Jangan menimpa stok bila produk sudah pernah digunakan di cabang.
    v_is_new_branch_product := false;
    insert into public.branch_products (
      branch_id, product_id, stock_base_qty, average_cost_per_base,
      last_purchase_cost_per_base, is_available
    ) values (
      v_branch_id,
      v_product_id,
      (v_row ->> 'stock')::numeric,
      (v_row ->> 'cost')::numeric,
      (v_row ->> 'cost')::numeric,
      true
    )
    on conflict (branch_id, product_id) do nothing
    returning true into v_is_new_branch_product;

    if coalesce(v_is_new_branch_product, false)
       and (v_row ->> 'stock')::numeric <> 0 then
      insert into public.stock_movements (
        organization_id, branch_id, product_id, movement_type,
        base_quantity_delta, stock_before, stock_after,
        unit_cost_per_base, reference_type, reference_id, notes, created_by
      ) values (
        v_organization_id,
        v_branch_id,
        v_product_id,
        'opening',
        (v_row ->> 'stock')::numeric,
        0,
        (v_row ->> 'stock')::numeric,
        (v_row ->> 'cost')::numeric,
        'product',
        v_product_id,
        'Stok awal dari seed produk retail dan grosir',
        v_actor_id
      );
    end if;
  end loop;

  raise notice 'Seed produk selesai untuk organisasi %, cabang %',
    v_organization_id, v_branch_id;
end;
$$;

-- Verifikasi hasil.
select
  p.code as sku,
  p.barcode,
  p.name,
  c.name as kategori,
  u.name as satuan_dasar,
  pu.selling_price as harga_retail,
  pu.reseller_price as harga_reseller,
  bp.stock_base_qty as stok,
  p.minimum_stock as stok_minimum,
  p.rack_location as rak
from public.products p
join public.organizations o on o.id = p.organization_id
left join public.categories c on c.id = p.category_id
join public.units u on u.id = p.base_unit_id
join public.product_units pu
  on pu.product_id = p.id and pu.is_default_sale_unit
left join public.branch_products bp on bp.product_id = p.id
where o.name = 'Toko Agung Lestari'
order by p.code;
