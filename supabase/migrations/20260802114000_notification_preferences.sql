begin;

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
join public.organizations org on org.id = p.organization_id
where org.stock_notifications_enabled
  and p.is_active
  and bp.stock_base_qty <= coalesce(bp.custom_minimum_stock, p.minimum_stock)
union all
select
  'order-' || o.id::text, o.branch_id, 'order', 'Pesanan baru',
  o.order_number || ' dari ' || o.customer_name, o.created_at
from public.online_orders o
join public.organizations org on org.id = o.organization_id
where org.order_notifications_enabled and o.status = 'pending'
union all
select
  'shift-' || s.id::text, s.branch_id, 'shift', 'Shift menunggu persetujuan',
  coalesce(p.full_name, 'Kasir') || ' telah menutup shift', s.closed_at
from public.shifts s
join public.profiles p on p.id = s.cashier_id
join public.organizations org on org.id = s.organization_id
where org.shift_notifications_enabled and s.status = 'closed';

grant select on public.admin_notifications to authenticated;

commit;
