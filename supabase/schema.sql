-- GMB AI — Tam Veritabanı Şeması (Tek Seferde Kur)
-- Supabase SQL Editor'da tamamını seç ve çalıştır.

-- UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLOLAR
-- ============================================================

-- firms — İşletmeler
create table if not exists public.firms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sector text not null default 'diger',
  gmb_location_id text,
  gmb_access_token text,
  gmb_refresh_token text,
  system_prompt text,
  approval_mode boolean not null default true,
  response_length text not null default 'medium' check (response_length in ('short', 'medium', 'long')),
  is_active boolean not null default true,
  info_card jsonb default '{}',
  created_at timestamptz not null default now()
);

-- profiles — Kullanıcı Profilleri (Supabase Auth ile bağlantılı)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firm_id uuid references public.firms(id) on delete set null,
  role text not null default 'firm_user' check (role in ('admin', 'firm_user')),
  full_name text,
  created_at timestamptz not null default now()
);

-- reviews — Yorumlar ve Cevaplar
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  gmb_review_id text not null,
  reviewer_name text not null,
  reviewer_id text,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  review_language text default 'tr',
  review_date timestamptz not null,
  ai_response text,
  edited_response text,
  final_response text,
  status text not null default 'pending' check (status in ('pending', 'published', 'auto_published', 'rejected')),
  template_id uuid,
  tokens_input integer,
  tokens_output integer,
  cost_usd numeric(10, 6),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(firm_id, gmb_review_id)
);

-- review_analysis — Yorum Analizi
create table if not exists public.review_analysis (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  sentiment text not null check (sentiment in ('positive', 'negative', 'neutral')),
  topics jsonb not null default '[]',
  importance_score integer not null check (importance_score between 1 and 5),
  keywords jsonb not null default '[]',
  has_critical_keyword boolean not null default false,
  critical_keywords jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- templates — Cevap Şablonları
create table if not exists public.templates (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid references public.firms(id) on delete cascade,
  sector text,
  name text not null,
  rating_range text not null check (rating_range in ('1-2', '3-4', '5')),
  topic text not null default 'genel',
  opening text not null,
  body text not null,
  closing text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

-- reviews.template_id → templates(id) foreign key (templates reviews'tan sonra oluşturulduğu için burada eklenir)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_template_id_fkey'
  ) then
    alter table public.reviews
      add constraint reviews_template_id_fkey
      foreign key (template_id) references public.templates(id) on delete set null;
  end if;
end $$;

-- usage_logs — Token Kullanım Logları
create table if not exists public.usage_logs (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete set null,
  model text not null default 'gpt-4o',
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

-- blacklist_words — Kara Liste
create table if not exists public.blacklist_words (
  id uuid primary key default uuid_generate_v4(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  word text not null,
  created_at timestamptz not null default now(),
  unique(firm_id, word)
);

-- notifications — Bildirimler
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now(),
  unique(review_id, type)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.firms enable row level security;
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.review_analysis enable row level security;
alter table public.templates enable row level security;
alter table public.usage_logs enable row level security;
alter table public.blacklist_words enable row level security;
alter table public.notifications enable row level security;

-- Helper function: kullanıcının rolünü döner
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Helper function: kullanıcının firm_id'sini döner
create or replace function public.get_user_firm_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select firm_id from public.profiles where id = auth.uid()
$$;

-- firms RLS
create policy "Admin tüm firmaları görür" on public.firms
  for all using (get_user_role() = 'admin');

create policy "Firma kullanıcısı kendi firmasını görür" on public.firms
  for select using (id = get_user_firm_id());

-- Firma kullanıcısı yalnızca kendi firmasını günceller (kolon koruması trigger ile).
-- Bu politika olmadan ayarlar kaydetme ve Google OAuth token yazma RLS tarafından engellenir.
create policy "Firma kullanıcısı kendi firmasını günceller" on public.firms
  for update using (id = get_user_firm_id()) with check (id = get_user_firm_id());

-- profiles RLS
create policy "Admin tüm profilleri görür" on public.profiles
  for all using (get_user_role() = 'admin');

create policy "Kullanıcı kendi profilini görür" on public.profiles
  for select using (id = auth.uid());

create policy "Kullanıcı kendi profilini günceller" on public.profiles
  for update using (id = auth.uid());

-- reviews RLS
create policy "Admin tüm yorumları görür" on public.reviews
  for all using (get_user_role() = 'admin');

create policy "Firma kullanıcısı kendi yorumlarını görür" on public.reviews
  for all using (firm_id = get_user_firm_id());

-- review_analysis RLS
create policy "Admin tüm analizleri görür" on public.review_analysis
  for all using (get_user_role() = 'admin');

create policy "Firma kullanıcısı kendi analizlerini görür" on public.review_analysis
  for all using (firm_id = get_user_firm_id());

-- templates RLS
create policy "Admin tüm şablonları görür" on public.templates
  for all using (get_user_role() = 'admin');

create policy "Firma kullanıcısı sistem ve kendi şablonlarını görür" on public.templates
  for select using (is_system = true or firm_id = get_user_firm_id());

create policy "Firma kullanıcısı kendi şablonlarını yönetir" on public.templates
  for insert with check (firm_id = get_user_firm_id() and is_system = false);

create policy "Firma kullanıcısı kendi şablonlarını günceller" on public.templates
  for update using (firm_id = get_user_firm_id() and is_system = false);

create policy "Firma kullanıcısı kendi şablonlarını siler" on public.templates
  for delete using (firm_id = get_user_firm_id() and is_system = false);

-- usage_logs RLS
create policy "Admin tüm logları görür" on public.usage_logs
  for all using (get_user_role() = 'admin');

create policy "Firma kullanıcısı kendi loglarını görür" on public.usage_logs
  for select using (firm_id = get_user_firm_id());

-- blacklist_words RLS
create policy "Admin tüm kara listeyi görür" on public.blacklist_words
  for all using (get_user_role() = 'admin');

create policy "Firma kullanıcısı kendi kara listesini yönetir" on public.blacklist_words
  for all using (firm_id = get_user_firm_id());

-- notifications RLS
create policy "Admin tüm bildirimleri görür" on public.notifications
  for all using (get_user_role() = 'admin');

create policy "Firma kendi bildirimlerini görür" on public.notifications
  for all using (firm_id = get_user_firm_id()) with check (firm_id = get_user_firm_id());

-- ============================================================
-- KOLON KORUMA TRIGGER'LARI (Yetki Yükseltme Önleme)
-- ============================================================
-- RLS UPDATE politikaları satır sahipliğini doğrular ama kolon bazlı
-- kısıtlama yapamaz. Bu trigger'lar firma kullanıcısının hassas kolonları
-- değiştirmesini engeller. Admin ve servis rolü (n8n, auth.uid() null) muaf.

-- profiles: firma kullanıcısı kendi role/firm_id'sini değiştiremez
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.get_user_role() = 'admin' then
    return new;
  end if;
  new.role := old.role;
  new.firm_id := old.firm_id;
  return new;
end;
$$;

create or replace trigger protect_profile_columns_trg
  before update on public.profiles
  for each row execute procedure public.protect_profile_columns();

-- firms: firma kullanıcısı admin tarafından yönetilen kolonları değiştiremez
create or replace function public.protect_firm_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.get_user_role() = 'admin' then
    return new;
  end if;
  new.name := old.name;
  new.sector := old.sector;
  new.is_active := old.is_active;
  new.created_at := old.created_at;
  return new;
end;
$$;

create or replace trigger protect_firm_columns_trg
  before update on public.firms
  for each row execute procedure public.protect_firm_columns();

-- ============================================================
-- TRIGGER: Yeni kullanıcı kaydında otomatik profil oluştur
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SİSTEM ŞABLONLARI (Başlangıç Verisi)
-- ============================================================

insert into public.templates (sector, name, rating_range, topic, opening, body, closing, is_system) values
('restoran', 'Restoran 5 Yıldız Genel', '5', 'genel', 'Değerli misafirimiz, harika yorumunuz için çok teşekkür ederiz!', 'Sizin gibi değerli misafirlerimizin memnuniyeti bizim için her şeyden önemli. Ekibimiz her gün en iyi deneyimi sunmak için çalışıyor.', 'Sizi tekrar aramızda görmekten büyük mutluluk duyarız. İyi günler dileriz!', true),
('restoran', 'Restoran 1-2 Yıldız Yemek', '1-2', 'yemek', 'Sayın misafirimiz, yaşadığınız deneyim için özür dileriz.', 'Geri bildiriminizi şefimizle paylaşacağız. Mutfağımızda sunduğumuz kaliteyi korumak en büyük önceliğimiz ve bu konuda gereken adımları atacağız.', 'Sizi tekrar ağırlamak ve çok daha iyi bir deneyim sunmak isteriz. Kapımız her zaman açık.', true),
('restoran', 'Restoran 1-2 Yıldız Servis', '1-2', 'servis', 'Sayın misafirimiz, yaşadığınız deneyim için içtenlikle özür dileriz.', 'Servis kaliteniz hakkındaki geri bildiriminizi ekibimizle paylaştık. Misafirlerimize en iyi hizmeti sunmak için sürekli eğitim ve iyileştirme çalışmaları yapıyoruz.', 'Bu konuyu ciddiye alıyor ve gelecekte çok daha iyi bir deneyim yaşatmayı umuyoruz.', true),
('restoran', 'Restoran 3-4 Yıldız', '3-4', 'genel', 'Değerli misafirimiz, yorumunuz ve değerlendirmeniz için teşekkür ederiz.', 'Deneyiminizi daha iyi hale getirmek için önerilerinizi dikkate alıyoruz. Ekibimiz sürekli kendini geliştirme çabası içinde.', 'Sizi tekrar aramızda görmek ve daha mükemmel bir deneyim sunmak için sabırsızlanıyoruz!', true),
('kafe', 'Kafe 5 Yıldız Genel', '5', 'genel', 'Teşekkürler! Güzel yorumunuz bizi çok mutlu etti.', 'Kahvemizi ve atmosferimizi beğenmeniz ekibimizi çok motive etti. Her fincanı özenle hazırlıyor, her anınızın keyifli geçmesini istiyoruz.', 'Yakında görüşmek üzere, hoş günler!', true),
('kafe', 'Kafe Gürültü Şikayeti', '1-2', 'atmosfer', 'Sayın misafirimiz, rahatsız edici bir deneyim yaşadığınız için özür dileriz.', 'Sakin bir köşemizde sizi ağırlamaktan memnuniyet duyarız. Bir sonraki ziyaretinizde daha sessiz bölgemizi tercih edebilirsiniz.', 'Bizi tekrar denemenizi umuyoruz, sizi daha iyi ağırlamak için elimizden geleni yapacağız.', true),
('bar', 'Bar 5 Yıldız Genel', '5', 'genel', 'Harika! Bu güzel yorumunuz için teşekkür ederiz!', 'Sizinle birlikte o enerjiyi yaşamak bizim için de çok değerliydi. Ekibimiz her gece unutulmaz anlar yaratmak için burada.', 'Yakında tekrar görüşmek üzere, iyi eğlenceler!', true),
('bar', 'Bar Fiyat Şikayeti', '1-2', 'fiyat', 'Değerli misafirimiz, görüşünüzü bizimle paylaştığınız için teşekkür ederiz.', 'Sunduğumuz ürün ve hizmet kalitesinin fiyatlarımıza yansıdığını düşünüyoruz. Malzeme seçiminden servis kalitesine her detaya özen gösteriyoruz.', 'Sizi tekrar aramızda görmek ve sunduğumuz deneyimi bizzat değerlendirmenizi isteriz.', true)
on conflict do nothing;

-- ============================================================
-- INDEX'LER (Performans)
-- ============================================================

create index if not exists idx_reviews_firm_id on public.reviews(firm_id);
create index if not exists idx_reviews_status on public.reviews(status);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);
create index if not exists idx_reviews_template_id on public.reviews(template_id);
create index if not exists idx_review_analysis_review_id on public.review_analysis(review_id);
create index if not exists idx_review_analysis_firm_id on public.review_analysis(firm_id);
create index if not exists idx_templates_firm_id on public.templates(firm_id);
create index if not exists idx_blacklist_words_firm_id on public.blacklist_words(firm_id);
create index if not exists idx_usage_logs_firm_id on public.usage_logs(firm_id);
create index if not exists idx_usage_logs_review_id on public.usage_logs(review_id);
create index if not exists idx_usage_logs_created_at on public.usage_logs(created_at desc);
create index if not exists idx_profiles_firm_id on public.profiles(firm_id);
create index if not exists idx_notifications_firm_id on public.notifications(firm_id);
create index if not exists idx_notifications_review_id on public.notifications(review_id);
create index if not exists idx_reviews_firm_status on public.reviews(firm_id, status);
create index if not exists idx_reviews_firm_review_date on public.reviews(firm_id, review_date desc);
create index if not exists idx_reviews_pending_with_ai
  on public.reviews(created_at asc)
  where status = 'pending' and ai_response is not null;
create index if not exists idx_notifications_firm_created
  on public.notifications(firm_id, created_at desc);
