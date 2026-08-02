begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'admin', 'cashier');
create type public.account_status as enum ('pending', 'active', 'rejected', 'disabled');
create type public.stock_movement_type as enum ('opening', 'purchase', 'sale', 'sale_return', 'purchase_return', 'transfer_in', 'transfer_out', 'adjustment', 'damaged');
create type public.sale_status as enum ('draft', 'completed', 'cancelled', 'refunded');
create type public.order_status as enum ('pending', 'accepted', 'rejected', 'preparing', 'ready', 'completed', 'cancelled', 'expired');
create type public.shift_status as enum ('open', 'closed', 'approved');
create type public.purchase_status as enum ('draft', 'ordered', 'partially_received', 'received', 'cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  logo_url text,
  cost_method text not null default 'weighted_average' check (cost_method in ('weighted_average', 'last_purchase')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  phone text,
  address text,
  timezone text not null default 'Asia/Jakarta',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  phone text,
  address text,
  role public.app_role not null default 'cashier',
  status public.account_status not null default 'pending',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branch_members (
  branch_id uuid not null references public.branches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (branch_id, user_id)
);

create table public.feature_settings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  shift_enabled boolean not null default true,
  shift_approval_enabled boolean not null default true,
  cashier_cancel_enabled boolean not null default false,
  discount_enabled boolean not null default true,
  split_payment_enabled boolean not null default true,
  credit_sales_enabled boolean not null default false,
  negative_stock_enabled boolean not null default false,
  suppliers_enabled boolean not null default true,
  online_orders_enabled boolean not null default true,
  order_reservation_minutes integer not null default 1440 check (order_reservation_minutes > 0),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, branch_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  symbol text not null,
  allows_decimal boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, symbol)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  base_unit_id uuid not null references public.units(id),
  code text not null,
  name text not null,
  description text,
  image_url text,
  minimum_stock numeric(18,3) not null default 0 check (minimum_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  unit_id uuid not null references public.units(id),
  conversion_to_base numeric(18,3) not null check (conversion_to_base > 0),
  selling_price numeric(18,2) not null default 0 check (selling_price >= 0),
  is_default_sale_unit boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, unit_id)
);

create table public.branch_products (
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  stock_base_qty numeric(18,3) not null default 0,
  reserved_base_qty numeric(18,3) not null default 0 check (reserved_base_qty >= 0),
  average_cost_per_base numeric(18,4) not null default 0 check (average_cost_per_base >= 0),
  last_purchase_cost_per_base numeric(18,4) not null default 0 check (last_purchase_cost_per_base >= 0),
  custom_minimum_stock numeric(18,3),
  custom_selling_price numeric(18,2),
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (branch_id, product_id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_number text not null,
  status public.purchase_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  total_amount numeric(18,2) not null default 0,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, purchase_number)
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_unit_id uuid not null references public.product_units(id),
  quantity numeric(18,3) not null check (quantity > 0),
  received_quantity numeric(18,3) not null default 0 check (received_quantity >= 0),
  unit_cost numeric(18,2) not null check (unit_cost >= 0),
  subtotal numeric(18,2) generated always as (quantity * unit_cost) stored
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  credit_limit numeric(18,2) not null default 0,
  current_debt numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, phone)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  cashier_id uuid not null references auth.users(id),
  status public.shift_status not null default 'open',
  opening_cash numeric(18,2) not null default 0,
  expected_cash numeric(18,2),
  actual_cash numeric(18,2),
  cash_difference numeric(18,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  notes text
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  shift_id uuid references public.shifts(id),
  cashier_id uuid not null references auth.users(id),
  customer_id uuid references public.customers(id) on delete set null,
  transaction_number text not null,
  client_transaction_id uuid not null,
  device_id text,
  status public.sale_status not null default 'completed',
  subtotal numeric(18,2) not null default 0,
  discount_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  paid_amount numeric(18,2) not null default 0,
  change_amount numeric(18,2) not null default 0,
  gross_profit numeric(18,2) not null default 0,
  due_date date,
  notes text,
  cancelled_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  occurred_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, transaction_number),
  unique (organization_id, client_transaction_id)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_unit_id uuid not null references public.product_units(id),
  product_name_snapshot text not null,
  unit_name_snapshot text not null,
  quantity numeric(18,3) not null check (quantity > 0),
  conversion_to_base numeric(18,3) not null check (conversion_to_base > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  cost_per_base_snapshot numeric(18,4) not null default 0,
  discount_amount numeric(18,2) not null default 0,
  subtotal numeric(18,2) not null,
  profit_amount numeric(18,2) not null default 0
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  method text not null check (method in ('cash', 'qris', 'transfer', 'credit', 'other')),
  amount numeric(18,2) not null check (amount > 0),
  reference_number text,
  received_by uuid not null references auth.users(id),
  paid_at timestamptz not null default now()
);

create table public.online_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  customer_id uuid references public.customers(id) on delete set null,
  order_number text not null,
  customer_name text not null,
  customer_phone text not null,
  status public.order_status not null default 'pending',
  total_amount numeric(18,2) not null default 0,
  reservation_expires_at timestamptz,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.online_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.online_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_unit_id uuid not null references public.product_units(id),
  quantity numeric(18,3) not null check (quantity > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  subtotal numeric(18,2) not null
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  product_id uuid not null references public.products(id),
  movement_type public.stock_movement_type not null,
  base_quantity_delta numeric(18,3) not null check (base_quantity_delta <> 0),
  stock_before numeric(18,3) not null,
  stock_after numeric(18,3) not null,
  unit_cost_per_base numeric(18,4),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index profiles_organization_idx on public.profiles(organization_id);
create index branches_organization_idx on public.branches(organization_id);
create index products_organization_name_idx on public.products(organization_id, name);
create index branch_products_product_idx on public.branch_products(product_id);
create index stock_movements_branch_product_created_idx on public.stock_movements(branch_id, product_id, created_at desc);
create index sales_branch_occurred_idx on public.sales(branch_id, occurred_at desc);
create index sales_cashier_occurred_idx on public.sales(cashier_id, occurred_at desc);
create index online_orders_branch_status_created_idx on public.online_orders(branch_id, status, created_at desc);
create index shifts_branch_status_idx on public.shifts(branch_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger branches_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_units_updated_at before update on public.product_units for each row execute function public.set_updated_at();
create trigger branch_products_updated_at before update on public.branch_products for each row execute function public.set_updated_at();
create trigger suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
create trigger purchases_updated_at before update on public.purchases for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger online_orders_updated_at before update on public.online_orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, address)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'Pegawai'), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = (select auth.uid()) and status = 'active'
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and role in ('owner', 'admin')
  )
$$;

create or replace function public.has_branch_access(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.branch_members bm
    join public.profiles p on p.id = bm.user_id
    where bm.branch_id = target_branch_id
      and bm.user_id = (select auth.uid())
      and p.status = 'active'
  )
$$;

do $$
declare
  v_organization_id uuid;
  v_branch_id uuid;
  v_owner_id uuid;
begin
  insert into public.organizations (name, phone, address)
  values ('Toko Agung Lestari', null, null)
  returning id into v_organization_id;

  insert into public.branches (organization_id, code, name, address)
  values (v_organization_id, 'ANT', 'Antapani', 'Alamat cabang belum diatur')
  returning id into v_branch_id;

  insert into public.feature_settings (organization_id, branch_id)
  values (v_organization_id, null), (v_organization_id, v_branch_id);

  insert into public.units (organization_id, name, symbol, allows_decimal) values
    (v_organization_id, 'Dus', 'dus', false),
    (v_organization_id, 'Pak', 'pak', false),
    (v_organization_id, 'Setengah Pak', '½ pak', false),
    (v_organization_id, 'Bungkus', 'bks', false),
    (v_organization_id, 'Sachet', 'sct', false),
    (v_organization_id, 'Botol', 'btl', false),
    (v_organization_id, 'Kilogram', 'kg', true),
    (v_organization_id, 'Gram', 'g', true),
    (v_organization_id, 'Liter', 'L', true),
    (v_organization_id, 'Peti', 'peti', false),
    (v_organization_id, 'Butir', 'butir', false),
    (v_organization_id, 'Renteng', 'rtg', false),
    (v_organization_id, 'Eceran', 'pcs', false);

  insert into public.categories (organization_id, name) values
    (v_organization_id, 'Sembako'),
    (v_organization_id, 'Makanan'),
    (v_organization_id, 'Minuman'),
    (v_organization_id, 'Rokok'),
    (v_organization_id, 'Kebutuhan Rumah'),
    (v_organization_id, 'Produk Segar');

  select id into v_owner_id from auth.users order by created_at asc limit 1;
  if v_owner_id is not null then
    insert into public.profiles (id, organization_id, full_name, role, status, approved_at)
    select
      u.id,
      v_organization_id,
      coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(u.email, 'Owner'), '@', 1)),
      'owner',
      'active',
      now()
    from auth.users u
    where u.id = v_owner_id
    on conflict (id) do update set
      organization_id = excluded.organization_id,
      role = 'owner',
      status = 'active',
      approved_at = now();

    insert into public.branch_members (branch_id, user_id, is_default)
    values (v_branch_id, v_owner_id, true)
    on conflict do nothing;
  end if;
end;
$$;

alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.branch_members enable row level security;
alter table public.feature_settings enable row level security;
alter table public.categories enable row level security;
alter table public.units enable row level security;
alter table public.products enable row level security;
alter table public.product_units enable row level security;
alter table public.branch_products enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.customers enable row level security;
alter table public.shifts enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.online_orders enable row level security;
alter table public.online_order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_select on public.organizations for select to authenticated using (id = public.current_organization_id());
create policy organizations_update on public.organizations for update to authenticated using (id = public.current_organization_id() and public.is_admin()) with check (id = public.current_organization_id() and public.is_admin());

create policy branches_select on public.branches for select to authenticated using (organization_id = public.current_organization_id());
create policy branches_admin_all on public.branches for all to authenticated using (organization_id = public.current_organization_id() and public.is_admin()) with check (organization_id = public.current_organization_id() and public.is_admin());

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()) or (organization_id = public.current_organization_id() and public.is_admin()));
create policy profiles_admin_update on public.profiles for update to authenticated using (organization_id = public.current_organization_id() and public.is_admin()) with check (organization_id = public.current_organization_id() and public.is_admin());

create policy branch_members_select on public.branch_members for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy branch_members_admin_all on public.branch_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy feature_settings_select on public.feature_settings for select to authenticated using (organization_id = public.current_organization_id());
create policy feature_settings_admin_all on public.feature_settings for all to authenticated using (organization_id = public.current_organization_id() and public.is_admin()) with check (organization_id = public.current_organization_id() and public.is_admin());

create policy categories_select on public.categories for select to authenticated using (organization_id = public.current_organization_id());
create policy categories_admin_all on public.categories for all to authenticated using (organization_id = public.current_organization_id() and public.is_admin()) with check (organization_id = public.current_organization_id() and public.is_admin());

create policy units_select on public.units for select to authenticated using (organization_id = public.current_organization_id());
create policy units_admin_all on public.units for all to authenticated using (organization_id = public.current_organization_id() and public.is_admin()) with check (organization_id = public.current_organization_id() and public.is_admin());

create policy products_select on public.products for select to authenticated using (organization_id = public.current_organization_id());
create policy products_admin_all on public.products for all to authenticated using (organization_id = public.current_organization_id() and public.is_admin()) with check (organization_id = public.current_organization_id() and public.is_admin());

create policy product_units_select on public.product_units for select to authenticated using (exists (select 1 from public.products p where p.id = product_id and p.organization_id = public.current_organization_id()));
create policy product_units_admin_all on public.product_units for all to authenticated using (public.is_admin() and exists (select 1 from public.products p where p.id = product_id and p.organization_id = public.current_organization_id())) with check (public.is_admin() and exists (select 1 from public.products p where p.id = product_id and p.organization_id = public.current_organization_id()));

create policy branch_products_select on public.branch_products for select to authenticated using (public.has_branch_access(branch_id));
create policy branch_products_admin_all on public.branch_products for all to authenticated using (public.has_branch_access(branch_id) and public.is_admin()) with check (public.has_branch_access(branch_id) and public.is_admin());

create policy suppliers_select on public.suppliers for select to authenticated using (organization_id = public.current_organization_id());
create policy suppliers_admin_all on public.suppliers for all to authenticated using (organization_id = public.current_organization_id() and public.is_admin()) with check (organization_id = public.current_organization_id() and public.is_admin());

create policy purchases_select on public.purchases for select to authenticated using (public.has_branch_access(branch_id));
create policy purchases_admin_all on public.purchases for all to authenticated using (public.has_branch_access(branch_id) and public.is_admin()) with check (public.has_branch_access(branch_id) and public.is_admin());
create policy purchase_items_select on public.purchase_items for select to authenticated using (exists (select 1 from public.purchases p where p.id = purchase_id and public.has_branch_access(p.branch_id)));
create policy purchase_items_admin_all on public.purchase_items for all to authenticated using (public.is_admin() and exists (select 1 from public.purchases p where p.id = purchase_id and public.has_branch_access(p.branch_id))) with check (public.is_admin() and exists (select 1 from public.purchases p where p.id = purchase_id and public.has_branch_access(p.branch_id)));

create policy customers_select on public.customers for select to authenticated using (organization_id = public.current_organization_id());
create policy customers_write on public.customers for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());

create policy shifts_select on public.shifts for select to authenticated using (public.has_branch_access(branch_id));
create policy shifts_insert on public.shifts for insert to authenticated with check (public.has_branch_access(branch_id) and cashier_id = (select auth.uid()));
create policy shifts_update on public.shifts for update to authenticated using (public.has_branch_access(branch_id) and (cashier_id = (select auth.uid()) or public.is_admin())) with check (public.has_branch_access(branch_id));

create policy sales_select on public.sales for select to authenticated using (public.has_branch_access(branch_id));
create policy sales_insert on public.sales for insert to authenticated with check (public.has_branch_access(branch_id) and cashier_id = (select auth.uid()));
create policy sales_admin_update on public.sales for update to authenticated using (public.has_branch_access(branch_id) and public.is_admin()) with check (public.has_branch_access(branch_id) and public.is_admin());

create policy sale_items_select on public.sale_items for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and public.has_branch_access(s.branch_id)));
create policy sale_items_insert on public.sale_items for insert to authenticated with check (exists (select 1 from public.sales s where s.id = sale_id and s.cashier_id = (select auth.uid()) and public.has_branch_access(s.branch_id)));
create policy payments_select on public.payments for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and public.has_branch_access(s.branch_id)));
create policy payments_insert on public.payments for insert to authenticated with check (received_by = (select auth.uid()) and exists (select 1 from public.sales s where s.id = sale_id and public.has_branch_access(s.branch_id)));

create policy online_orders_select on public.online_orders for select to authenticated using (public.has_branch_access(branch_id));
create policy online_orders_update on public.online_orders for update to authenticated using (public.has_branch_access(branch_id)) with check (public.has_branch_access(branch_id));
create policy online_order_items_select on public.online_order_items for select to authenticated using (exists (select 1 from public.online_orders o where o.id = order_id and public.has_branch_access(o.branch_id)));

create policy stock_movements_select on public.stock_movements for select to authenticated using (public.has_branch_access(branch_id));
create policy stock_movements_insert on public.stock_movements for insert to authenticated with check (public.has_branch_access(branch_id) and created_by = (select auth.uid()));

create policy audit_logs_select on public.audit_logs for select to authenticated using (organization_id = public.current_organization_id() and public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_branch_access(uuid) to authenticated;

create view public.dashboard_daily_summary
with (security_invoker = true)
as
select
  s.organization_id,
  s.branch_id,
  (s.occurred_at at time zone 'Asia/Jakarta')::date as sale_date,
  count(*) filter (where s.status = 'completed') as transaction_count,
  coalesce(sum(s.total_amount) filter (where s.status = 'completed'), 0) as gross_sales,
  coalesce(sum(s.gross_profit) filter (where s.status = 'completed'), 0) as gross_profit,
  coalesce(sum(s.total_amount) filter (where s.status in ('cancelled', 'refunded')), 0) as cancelled_amount
from public.sales s
group by s.organization_id, s.branch_id, (s.occurred_at at time zone 'Asia/Jakarta')::date;

grant select on public.dashboard_daily_summary to authenticated;

commit;
