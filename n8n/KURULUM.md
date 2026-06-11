# n8n Kurulum Kılavuzu

## 1. Render'a n8n Kurulumu

### Adım 1 — Render Hesabı
1. render.com adresine git ve ücretsiz hesap oluştur
2. Dashboard'da **New → Web Service** seç

### Adım 2 — n8n Servisini Oluştur
Aşağıdaki ayarları gir:

| Alan | Değer |
|---|---|
| Name | `gmbai-n8n` |
| Runtime | `Docker` |
| Image URL | `docker.n8nio/n8n` |
| Instance Type | `Free` |
| Port | `5678` |

### Adım 3 — Environment Variables
Render → Environment sekmesine şunları ekle:

```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=guclu-bir-sifre-sec
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://gmbai-n8n.onrender.com
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=db.SUPABASE_PROJE_ID.supabase.co
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=postgres
DB_POSTGRESDB_USER=postgres
DB_POSTGRESDB_PASSWORD=SUPABASE_DB_SIFRESI
DB_POSTGRESDB_SCHEMA=public
GOOGLE_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID
GOOGLE_CLIENT_SECRET=GOOGLE_OAUTH_CLIENT_SECRET
```

> Supabase bağlantı bilgilerini: Supabase → Settings → Database → Connection string bölümünden al.

### Adım 4 — Deploy Et
"Create Web Service" butonuna tıkla. Deploy tamamlanınca URL alırsın:
`https://gmbai-n8n.onrender.com`

---

## 2. UptimeRobot Kurulumu (Render'ı Uyanık Tutar)

Render Free tier 15 dakika işlem olmayınca uyku moduna girer. UptimeRobot bunu engeller.

1. uptimerobot.com → Ücretsiz hesap aç
2. **Add New Monitor** tıkla
3. Ayarlar:
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `GMB AI n8n`
   - URL: `https://gmbai-n8n.onrender.com`
   - Monitoring Interval: `5 minutes`
4. **Create Monitor** tıkla

---

## 3. n8n'e Credential Ekle

n8n açıldıktan sonra (**Settings → Credentials**):

### Supabase PostgreSQL
- Type: `Postgres`
- Name: `Supabase PostgreSQL`
- Host: `db.SUPABASE_PROJE_ID.supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: `SUPABASE_DB_SIFRESI`
- SSL: `Enable`

### OpenAI API
- Type: `OpenAI API`
- Name: `OpenAI API`
- API Key: `sk-...` (OpenAI Platform'dan al)

---

## 4. Workflow'ları İçe Aktar

n8n → **Workflows → Import from file** ile sırayla içe aktar:

1. `workflow-main.json` → Ana workflow (yorum çekme + AI + yayınlama)
2. `workflow-token-refresh.json` → Token yenileme (her 6 saatte)
3. `workflow-alarm.json` → Yanıtsız yorum alarmı (her saatte)

Her birini import ettikten sonra **Activate** (toggle) et.

---

## 5. Supabase'de notifications Tablosu (Alarm Workflow için)

Alarm workflow'u kullanmak istiyorsan SQL Editor'de çalıştır:

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

---

## 6. Test Et

1. n8n → Ana Workflow → **Execute Workflow** (manual test)
2. Supabase → reviews tablosunda yeni satırlar görünüyorsa çalışıyor
3. Loglar için n8n → Executions sekmesi

> Not: Ana workflow `reviews.updated_at` kolonunu kullanır. Supabase'de
> `supabase/migrations/007_fixes_updated_at_and_indexes.sql` dosyasını
> (veya güncel `schema.sql`'i) çalıştırdığından emin ol.

---

## 7. Güvenlik Uyarıları

- Environment variables (DB şifresi, Google client secret, OpenAI key) **asla Git'e commit edilmez** — yalnızca Render/Vercel panelinden girilir.
- `N8N_BASIC_AUTH_PASSWORD` için uzun ve rastgele bir şifre kullan (`openssl rand -base64 24`).
- Workflow JSON dosyalarına API key veya şifre yazma; her zaman n8n **Credentials** sekmesini kullan.
- Render loglarında ve ekran görüntülerinde gizli değerlerin görünmediğinden emin ol.
