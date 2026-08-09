-- Extends the existing POS schema without removing online orders, shifts,
-- purchasing, multi-branch stock, or the current price model.

alter type public.app_role add value if not exists 'warehouse';

begin;

alter table public.products
  add column if not exists barcode text,
  add column if not exists rack_location text;

create unique index if not exists products_organization_barcode_key
  on public.products (organization_id, barcode)
  where barcode is not null and barcode <> '';

alter table public.product_units
  add column if not exists reseller_price numeric(18,2);

update public.product_units
set reseller_price = round(selling_price * 0.90, 2)
where reseller_price is null;

alter table public.product_units
  alter column reseller_price set default 0,
  alter column reseller_price set not null;

alter table public.product_units
  drop constraint if exists product_units_reseller_price_check;
alter table public.product_units
  add constraint product_units_reseller_price_check check (reseller_price >= 0);

create or replace function public.default_reseller_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and coalesce(new.reseller_price, 0) = 0 and new.selling_price > 0 then
    new.reseller_price := round(new.selling_price * 0.90, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists product_units_default_reseller_price on public.product_units;
create trigger product_units_default_reseller_price
before insert on public.product_units
for each row execute function public.default_reseller_price();

alter table public.customers
  add column if not exists customer_code text,
  add column if not exists customer_type text not null default 'retail',
  add column if not exists status text not null default 'active',
  add column if not exists whatsapp text;

with numbered as (
  select id, row_number() over (partition by organization_id order by created_at, id) as seq
  from public.customers
  where customer_code is null
)
update public.customers c
set customer_code = 'CUS-' || lpad(numbered.seq::text, 5, '0')
from numbered
where c.id = numbered.id;

alter table public.customers alter column customer_code set not null;
alter table public.customers
  drop constraint if exists customers_customer_type_check,
  drop constraint if exists customers_status_check;
alter table public.customers
  add constraint customers_customer_type_check check (customer_type in ('retail', 'reseller')),
  add constraint customers_status_check check (status in ('active', 'inactive'));

create unique index if not exists customers_organization_customer_code_key
  on public.customers (organization_id, customer_code);

alter table public.sales
  add column if not exists customer_type_snapshot text not null default 'retail',
  add column if not exists invoice_number text,
  add column if not exists document_type text not null default 'receipt';

alter table public.sales
  drop constraint if exists sales_customer_type_snapshot_check,
  drop constraint if exists sales_document_type_check;
alter table public.sales
  add constraint sales_customer_type_snapshot_check check (customer_type_snapshot in ('retail', 'reseller')),
  add constraint sales_document_type_check check (document_type in ('receipt', 'invoice'));

create unique index if not exists sales_organization_invoice_number_key
  on public.sales (organization_id, invoice_number)
  where invoice_number is not null;

alter table public.feature_settings
  add column if not exists offline_pos_enabled boolean not null default true,
  add column if not exists reseller_pricing_enabled boolean not null default true,
  add column if not exists stock_opname_approval_enabled boolean not null default true,
  add column if not exists barcode_labels_enabled boolean not null default true,
  add column if not exists invoice_a4_enabled boolean not null default true;

create table if not exists public.racks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  code text not null,
  area_name text not null default 'Area Utama',
  shelf_count integer not null default 1 check (shelf_count > 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, code)
);

create table if not exists public.stock_opnames (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  opname_number text not null,
  status text not null default 'draft' check (status in ('draft', 'counting', 'review', 'confirmed', 'cancelled')),
  counted_at timestamptz,
  notes text,
  created_by uuid not null references auth.users(id),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, opname_number)
);

create table if not exists public.stock_opname_items (
  id uuid primary key default gen_random_uuid(),
  stock_opname_id uuid not null references public.stock_opnames(id) on delete cascade,
  product_id uuid not null references public.products(id),
  system_stock numeric(18,3) not null,
  physical_stock numeric(18,3),
  difference numeric(18,3) generated always as (coalesce(physical_stock, system_stock) - system_stock) stored,
  notes text,
  unique (stock_opname_id, product_id)
);

alter table public.racks enable row level security;
alter table public.stock_opnames enable row level security;
alter table public.stock_opname_items enable row level security;

drop policy if exists racks_select on public.racks;
create policy racks_select on public.racks for select to authenticated
using (organization_id = public.current_organization_id() and public.has_branch_access(branch_id));
drop policy if exists racks_write on public.racks;
create policy racks_write on public.racks for all to authenticated
using (organization_id = public.current_organization_id() and public.is_admin())
with check (organization_id = public.current_organization_id() and public.is_admin());

drop policy if exists stock_opnames_select on public.stock_opnames;
create policy stock_opnames_select on public.stock_opnames for select to authenticated
using (organization_id = public.current_organization_id() and public.has_branch_access(branch_id));
drop policy if exists stock_opnames_write on public.stock_opnames;
create policy stock_opnames_write on public.stock_opnames for all to authenticated
using (
  organization_id = public.current_organization_id()
  and public.has_branch_access(branch_id)
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text in ('owner','admin','warehouse'))
)
with check (
  organization_id = public.current_organization_id()
  and public.has_branch_access(branch_id)
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text in ('owner','admin','warehouse'))
);

drop policy if exists stock_opname_items_select on public.stock_opname_items;
create policy stock_opname_items_select on public.stock_opname_items for select to authenticated
using (exists (
  select 1 from public.stock_opnames so
  where so.id = stock_opname_id
    and so.organization_id = public.current_organization_id()
    and public.has_branch_access(so.branch_id)
));
drop policy if exists stock_opname_items_write on public.stock_opname_items;
create policy stock_opname_items_write on public.stock_opname_items for all to authenticated
using (exists (
  select 1 from public.stock_opnames so
  where so.id = stock_opname_id
    and so.organization_id = public.current_organization_id()
    and public.has_branch_access(so.branch_id)
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text in ('owner','admin','warehouse'))
))
with check (exists (
  select 1 from public.stock_opnames so
  where so.id = stock_opname_id
    and so.organization_id = public.current_organization_id()
    and public.has_branch_access(so.branch_id)
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text in ('owner','admin','warehouse'))
));

create index if not exists stock_opnames_branch_created_idx on public.stock_opnames(branch_id, created_at desc);
create index if not exists stock_opname_items_opname_idx on public.stock_opname_items(stock_opname_id);
create index if not exists racks_branch_idx on public.racks(branch_id, code);

commit;
