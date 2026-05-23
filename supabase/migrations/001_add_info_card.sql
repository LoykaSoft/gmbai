-- FAZ 4: İşletme bilgi kartı için info_card JSONB kolonu
ALTER TABLE firms ADD COLUMN IF NOT EXISTS info_card JSONB DEFAULT '{}';
