-- n8n ana workflow'u reviews.updated_at kolonunu güncelliyor ama kolon şemada yoktu;
-- bu yüzden AI cevabı kaydetme UPDATE'i her seferinde hata veriyordu.
alter table public.reviews
  add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- PERFORMANS INDEX'LERİ
-- ============================================================

-- Panel "Yorumlarım" / "Bekleyen Onaylar": firm_id + status + review_date sıralı sorgular
create index if not exists idx_reviews_firm_status on public.reviews(firm_id, status);
create index if not exists idx_reviews_firm_review_date on public.reviews(firm_id, review_date desc);

-- Alarm workflow'u: status='pending' AND ai_response IS NOT NULL ORDER BY created_at ASC
create index if not exists idx_reviews_pending_with_ai
  on public.reviews(created_at asc)
  where status = 'pending' and ai_response is not null;

-- Bildirim paneli: firm_id + created_at DESC limit 50
create index if not exists idx_notifications_firm_created
  on public.notifications(firm_id, created_at desc);
