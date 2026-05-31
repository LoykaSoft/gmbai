# Yapılacaklar Listesi — GMB AI

> Kodun tamamı hazır. Aşağıdakiler yalnızca senin yapman gereken kurulum adımları.

---

## 1. Supabase — Tek SQL ile Kur

Supabase Dashboard → **SQL Editor** → `supabase/schema.sql` dosyasının tamamını yapıştır ve çalıştır.

Bu tek dosya her şeyi içeriyor:
- Tüm tablolar (firms, profiles, reviews, templates, notifications vb.)
- Row Level Security politikaları
- Trigger (otomatik profil oluşturma)
- Sistem şablonları (restoran, kafe, bar başlangıç şablonları)
- Index'ler
- 45 sektör desteği (CHECK constraint yok)

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

- [ ] Supabase SQL Editor'da `schema.sql` çalıştırıldı (tek adım, her şey dahil)
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
