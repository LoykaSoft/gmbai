# Yapılacaklar Listesi — GMB AI

> Kodun tamamı hazır. Aşağıdakiler yalnızca senin yapman gereken kurulum adımları.

---

## 1. Supabase — SQL Migration'ları Çalıştır

Supabase Dashboard → **SQL Editor** → her birini ayrı ayrı çalıştır.

### Migration 1 — İşletme Bilgi Kartı
```sql
ALTER TABLE firms ADD COLUMN IF NOT EXISTS info_card JSONB DEFAULT '{}';
```

### Migration 2 — Bildirim Tablosu
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, type)
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firma kendi bildirimlerini görür" ON notifications
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
  );
```

### Migration 3 — Çok Sektör Desteği (YENİ)
```sql
-- firms.sector CHECK constraint'i kaldır
ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS firms_sector_check;

-- templates.sector CHECK constraint'i kaldır
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_sector_check;
```

### Migration 4 — Sistem Şablonları (Hazır Şablonlar)
```sql
INSERT INTO templates (name, sector, rating_range, topic, opening, body, closing, is_system)
VALUES
-- Restoran
('Restoran 5★ Genel', 'restoran', '5', 'genel',
 'Değerli misafirimiz, güzel yorumunuz için çok teşekkür ederiz!',
 'Memnuniyetinizi öğrenmek bizi mutlu etti. Ekibimiz her zaman en iyi deneyimi sunmak için çalışıyor.',
 'Sizi tekrar ağırlamaktan büyük mutluluk duyarız. Afiyet olsun!',
 true),

('Restoran 1-2★ Yemek', 'restoran', '1-2', 'yemek',
 'Değerli misafirimiz, yaşadığınız deneyim için özür dileriz.',
 'Yorumunuzu şefimizle paylaşacağız. Kalite standartlarımızı gözden geçireceğiz.',
 'Bizi tekrar deneme fırsatı verirseniz çok daha iyi bir deneyim sunacağımıza eminiz.',
 true),

('Restoran 1-2★ Servis', 'restoran', '1-2', 'servis',
 'Değerli misafirimiz, hizmet kalitenizden memnun olmadığınız için üzgünüz.',
 'Geri bildiriminizi ekibimizle paylaşacağız ve gerekli iyileştirmeleri yapacağız.',
 'Sizi daha iyi bir hizmetle karşılamak istiyoruz, tekrar bekliyoruz.',
 true),

('Restoran 3-4★ Genel', 'restoran', '3-4', 'genel',
 'Değerli misafirimiz, bizi tercih ettiğiniz için teşekkür ederiz.',
 'Görüşleriniz bizim için çok değerli. Eksiklerimizi gidermek için çalışıyoruz.',
 'Daha iyi bir deneyim sunmak için çaba göstermeye devam edeceğiz.',
 true),

-- Kafe
('Kafe 5★ Genel', 'kafe', '5', 'genel',
 'Teşekkürler! Güzel sözleriniz bizi çok mutlu etti.',
 'Kahvemizi ve atmosferimizi beğenmeniz harika. Ekibimiz her detayı özenle hazırlıyor.',
 'Sizi tekrar görmekten mutluluk duyarız, iyi günler!',
 true),

('Kafe 1-2★ Gürültü', 'kafe', '1-2', 'atmosfer',
 'Değerli misafirimiz, gürültü konusunda yaşadığınız rahatsızlık için özür dileriz.',
 'Daha sakin bir deneyim için köşe masalarımızı veya sakin saatlerimizi (sabah 08:00-11:00) önerebiliriz.',
 'Sizi daha huzurlu bir ortamda ağırlamak isteriz.',
 true),

('Kafe 1-2★ Yavaş Servis', 'kafe', '1-2', 'hız',
 'Değerli misafirimiz, beklemenize neden olduğumuz için özür dileriz.',
 'Yoğun saatlerde hizmet hızımızı artırmak için çalışmalar yapıyoruz.',
 'Bir sonraki ziyaretinizde çok daha hızlı hizmet alacağınıza eminiz.',
 true),

-- Bar
('Bar 5★ Genel', 'bar', '5', 'genel',
 'Harika! Bizimle güzel bir gece geçirdiğinize sevindik.',
 'Enerjinizi ve pozitif geri bildiriminizi ekibimizle paylaşacağız. Her gece sizin için özel hazırlanıyor.',
 'Sizi yeniden dans pistinde görmek isteriz!',
 true),

('Bar 1-2★ Fiyat', 'bar', '1-2', 'fiyat',
 'Değerli misafirimiz, yorumunuz için teşekkür ederiz.',
 'Fiyatlarımız kaliteli malzeme ve atmosferimizi yansıtmaktadır. Özel indirimli günlerimiz ve happy hour saatlerimizden faydalanabilirsiniz.',
 'Sizi farklı bir deneyimle karşılamaktan memnuniyet duyarız.',
 true)

ON CONFLICT DO NOTHING;
```

---

## 2. Google Cloud Console Kurulumu

> Amaç: GMB yorumlarını okuyabilmek ve cevap yazabilmek için OAuth izni almak.

### Adım 1 — Proje Oluştur
1. console.cloud.google.com adresine git
2. Üstteki proje seçiciden **New Project** → `gmbai` adını ver

### Adım 2 — API'leri Aktifleştir
Sol menü → **APIs & Services → Library** → şunları ara ve **Enable** et:
- `My Business Business Information API`
- `My Business Reviews API`
- `Google My Business API`

### Adım 3 — OAuth Consent Screen
Sol menü → **APIs & Services → OAuth consent screen**
- User Type: **External**
- App name: `GMB AI`
- Support email: kendi mailin
- Scopes: `https://www.googleapis.com/auth/business.manage` ekle
- Test users: kendi Google hesabını ekle

### Adım 4 — OAuth Credentials Oluştur
Sol menü → **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs**
- Application type: **Web application**
- Name: `gmbai-web`
- Authorized redirect URIs:
  - Geliştirme: `http://localhost:3000/api/auth/google/callback`
  - Production: `https://[vercel-domain]/api/auth/google/callback`
- **Create** → `Client ID` ve `Client Secret`'i kopyala

---

## 3. .env.local Dosyası Oluştur

`app/` klasörü içine `.env.local` dosyası oluştur:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Google OAuth (GMB)
GOOGLE_CLIENT_ID=XXXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# App
NEXTAUTH_SECRET=rastgele-uzun-bir-string-olustur
NEXTAUTH_URL=http://localhost:3000
```

> Supabase değerlerini: Supabase → Settings → API bölümünden al.
> NEXTAUTH_SECRET için: terminalde `openssl rand -base64 32` çalıştır.

---

## 4. Vercel Deployment

### Adım 1 — Vercel Hesabı
vercel.com → GitHub ile giriş yap

### Adım 2 — Projeyi Bağla
- **New Project → Import Git Repository → LoykaSoft/gmbai**
- Root Directory: `app`
- Framework: Next.js (otomatik algılar)

### Adım 3 — Environment Variables
Vercel → Project → Settings → Environment Variables → `.env.local` içindeki tüm değerleri tek tek ekle.
`GOOGLE_REDIRECT_URI` için production URL'sini kullan:
```
https://[proje-adi].vercel.app/api/auth/google/callback
```
Bu URL'yi Google Cloud Console'a da ekle (Adım 4'teki redirect URIs'e).

### Adım 4 — Deploy
**Deploy** → birkaç dakika → URL hazır.

---

## 5. Render — n8n Kurulumu

> Detaylı adımlar: `n8n/KURULUM.md` dosyasında.

### Özet Adımlar
1. render.com → **New → Web Service**
2. Docker image: `docker.n8nio/n8n`
3. Port: `5678`
4. Environment variables ekle (Supabase DB bilgileri + Google OAuth)
5. Deploy et → URL al: `https://gmbai-n8n.onrender.com`

### n8n'e Giriş Yaptıktan Sonra
1. **Settings → Credentials** → Supabase PostgreSQL credential ekle
2. **Settings → Credentials** → OpenAI API credential ekle
3. **Workflows → Import** → şu 3 dosyayı sırayla içe aktar:
   - `n8n/workflow-main.json`
   - `n8n/workflow-token-refresh.json`
   - `n8n/workflow-alarm.json`
4. Her workflow'u **Activate** et (toggle)

---

## 6. UptimeRobot Kurulumu

> Render Free tier 15 dakika uyku moduna girer. Bu bunu engeller.

1. uptimerobot.com → Ücretsiz hesap
2. **Add New Monitor**:
   - Type: `HTTP(s)`
   - URL: `https://gmbai-n8n.onrender.com`
   - Interval: `5 minutes`
3. **Create Monitor**

---

## 7. İlk Kullanıcı ve İşletme Kaydı

Supabase SQL Editor'de çalıştır (admin hesabı için):

```sql
-- Önce Supabase Auth'da kullanıcı oluştur (Authentication → Users → Add user)
-- Sonra profil ekle:
INSERT INTO profiles (id, role, full_name)
VALUES ('AUTH_KULLANICI_UUID_BURAYA', 'admin', 'Admin');
```

İşletme kullanıcısı için:
```sql
-- Auth'da kullanıcı oluşturduktan sonra:
INSERT INTO profiles (id, firm_id, role, full_name)
VALUES ('AUTH_KULLANICI_UUID', 'FIRMA_UUID', 'firm_user', 'İşletme Adı');
```

---

## Özet Kontrol Listesi

- [ ] Migration 1: `info_card` kolonu
- [ ] Migration 2: `notifications` tablosu
- [ ] Migration 3: Çok sektör desteği — CHECK constraint kaldır
- [ ] Migration 4: Sistem şablonları eklendi
- [ ] Google Cloud: Proje ve API'ler aktif
- [ ] Google Cloud: OAuth credentials oluşturuldu
- [ ] `.env.local` dosyası oluşturuldu
- [ ] Vercel'e deploy edildi
- [ ] Vercel'e environment variables eklendi
- [ ] Render'a n8n kuruldu
- [ ] UptimeRobot aktif
- [ ] n8n credentials eklendi (Supabase + OpenAI)
- [ ] 3 n8n workflow import edildi ve aktive edildi
- [ ] İlk admin kullanıcısı Supabase'e eklendi
