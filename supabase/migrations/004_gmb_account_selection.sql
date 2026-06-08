-- firms tablosuna GMB hesap seçimi bekleme durumu eklenir.
-- Google OAuth tamamlandıktan sonra, kullanıcı birden fazla GMB hesabına sahipse
-- bu flag true olur ve Settings sayfasında hesap seçim UI'ı gösterilir.
alter table public.firms
  add column if not exists gmb_account_selection_pending boolean not null default false;
