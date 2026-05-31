-- Sektör kısıtlamalarını kaldır — çok sektörlü yapı
-- firms.sector CHECK constraint'i kaldır
ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS firms_sector_check;

-- templates.sector CHECK constraint'i kaldır
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_sector_check;
