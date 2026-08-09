begin;

create or replace function public.validate_product_tenant_links()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.units
    where id = new.base_unit_id and organization_id = new.organization_id
  ) then raise exception 'Satuan dasar harus berasal dari organisasi yang sama'; end if;

  if new.category_id is not null and not exists (
    select 1 from public.categories
    where id = new.category_id and organization_id = new.organization_id
  ) then raise exception 'Kategori harus berasal dari organisasi yang sama'; end if;

  return new;
end;
$$;

drop trigger if exists products_validate_tenant_links on public.products;
create trigger products_validate_tenant_links
before insert or update of organization_id, category_id, base_unit_id on public.products
for each row execute function public.validate_product_tenant_links();

create or replace function public.validate_product_unit_tenant_link()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_organization_id uuid;
begin
  select organization_id into v_organization_id
  from public.products where id = new.product_id;
  if v_organization_id is null then raise exception 'Produk tidak valid'; end if;
  if not exists (
    select 1 from public.units
    where id = new.unit_id and organization_id = v_organization_id
  ) then raise exception 'Satuan penjualan harus berasal dari organisasi yang sama'; end if;
  return new;
end;
$$;

drop trigger if exists product_units_validate_tenant_link on public.product_units;
create trigger product_units_validate_tenant_link
before insert or update of product_id, unit_id on public.product_units
for each row execute function public.validate_product_unit_tenant_link();

commit;
