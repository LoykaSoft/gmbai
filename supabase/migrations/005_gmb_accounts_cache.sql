-- firms tablosuna GMB hesap listesi cache kolonu eklenir.
-- OAuth callback sırasında hesaplar çekilip burada saklanır,
-- böylece kullanıcı işletme seçerken Google API'ye tekrar istek atılmaz.
alter table public.firms
  add column if not exists gmb_accounts jsonb;
