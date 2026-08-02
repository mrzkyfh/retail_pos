begin;

alter table public.sales
  add constraint sales_cashier_profile_fkey foreign key (cashier_id) references public.profiles(id) not valid;
alter table public.sales validate constraint sales_cashier_profile_fkey;

alter table public.shifts
  add constraint shifts_cashier_profile_fkey foreign key (cashier_id) references public.profiles(id) not valid;
alter table public.shifts validate constraint shifts_cashier_profile_fkey;

alter table public.stock_movements
  add constraint stock_movements_creator_profile_fkey foreign key (created_by) references public.profiles(id) not valid;
alter table public.stock_movements validate constraint stock_movements_creator_profile_fkey;

commit;
