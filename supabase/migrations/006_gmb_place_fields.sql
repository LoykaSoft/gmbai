alter table public.firms
  add column if not exists gmb_place_name text,
  add column if not exists gmb_place_address text;
