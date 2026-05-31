export interface SectorConfig {
  id: string
  label: string
  topics: string[]
}

export const SECTORS: SectorConfig[] = [
  {
    id: 'restoran',
    label: 'Restoran',
    topics: ['genel', 'yemek', 'servis', 'fiyat', 'temizlik', 'atmosfer', 'hız'],
  },
  {
    id: 'kafe',
    label: 'Kafe',
    topics: ['genel', 'kahve', 'servis', 'fiyat', 'temizlik', 'atmosfer', 'wifi'],
  },
  {
    id: 'bar',
    label: 'Bar',
    topics: ['genel', 'içecek', 'servis', 'fiyat', 'atmosfer', 'müzik', 'eğlence'],
  },
  {
    id: 'otel',
    label: 'Otel',
    topics: ['genel', 'oda', 'kahvaltı', 'resepsiyon', 'temizlik', 'konum', 'fiyat'],
  },
  {
    id: 'pansiyon',
    label: 'Pansiyon',
    topics: ['genel', 'oda', 'kahvaltı', 'temizlik', 'konum', 'fiyat', 'iletişim'],
  },
  {
    id: 'hali_yikama',
    label: 'Halı Yıkama',
    topics: ['genel', 'temizlik', 'hız', 'fiyat', 'teslimat', 'iletişim'],
  },
  {
    id: 'elektrik',
    label: 'Elektrikçi',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'güvenlik', 'malzeme'],
  },
  {
    id: 'tesisatci',
    label: 'Tesisatçı',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'güvenlik', 'malzeme'],
  },
  {
    id: 'giyim',
    label: 'Giyim Mağazası',
    topics: ['genel', 'kalite', 'fiyat', 'çeşitlilik', 'personel', 'ortam'],
  },
  {
    id: 'tekstil',
    label: 'Tekstil',
    topics: ['genel', 'kumaş', 'fiyat', 'çeşitlilik', 'teslimat', 'üretim'],
  },
  {
    id: 'guzellik',
    label: 'Güzellik / Kuaför',
    topics: ['genel', 'hizmet', 'personel', 'fiyat', 'temizlik', 'atmosfer', 'randevu'],
  },
  {
    id: 'oto_servis',
    label: 'Oto Servis',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'güven', 'garanti', 'iletişim'],
  },
  {
    id: 'market',
    label: 'Market / Bakkal',
    topics: ['genel', 'çeşitlilik', 'fiyat', 'temizlik', 'hız', 'personel'],
  },
  {
    id: 'eczane',
    label: 'Eczane',
    topics: ['genel', 'hizmet', 'stok', 'fiyat', 'personel', 'konum'],
  },
  {
    id: 'hastane',
    label: 'Hastane / Klinik',
    topics: ['genel', 'doktor', 'personel', 'temizlik', 'bekleme', 'fiyat', 'iletişim'],
  },
  {
    id: 'diş',
    label: 'Diş Kliniği',
    topics: ['genel', 'doktor', 'personel', 'temizlik', 'randevu', 'fiyat', 'iletişim'],
  },
  {
    id: 'spor',
    label: 'Spor Salonu / Fitness',
    topics: ['genel', 'ekipman', 'temizlik', 'personel', 'fiyat', 'atmosfer', 'kalabalık'],
  },
  {
    id: 'okul',
    label: 'Okul / Kurs',
    topics: ['genel', 'eğitim', 'öğretmen', 'müfredat', 'ortam', 'fiyat', 'iletişim'],
  },
  {
    id: 'muhasebe',
    label: 'Muhasebe / Mali Müşavirlik',
    topics: ['genel', 'hizmet', 'güven', 'iletişim', 'hız', 'fiyat'],
  },
  {
    id: 'avukat',
    label: 'Avukat / Hukuk Bürosu',
    topics: ['genel', 'hizmet', 'güven', 'iletişim', 'sonuç', 'fiyat'],
  },
  {
    id: 'emlak',
    label: 'Emlak Ofisi',
    topics: ['genel', 'hizmet', 'güven', 'iletişim', 'portföy', 'fiyat'],
  },
  {
    id: 'firın',
    label: 'Fırın / Pastane',
    topics: ['genel', 'lezzet', 'tazelik', 'çeşitlilik', 'fiyat', 'servis', 'temizlik'],
  },
  {
    id: 'kasap',
    label: 'Kasap',
    topics: ['genel', 'kalite', 'tazelik', 'çeşitlilik', 'fiyat', 'temizlik', 'personel'],
  },
  {
    id: 'manav',
    label: 'Manav',
    topics: ['genel', 'tazelik', 'çeşitlilik', 'fiyat', 'temizlik', 'personel'],
  },
  {
    id: 'veteriner',
    label: 'Veteriner',
    topics: ['genel', 'doktor', 'personel', 'temizlik', 'randevu', 'fiyat', 'iletişim'],
  },
  {
    id: 'optik',
    label: 'Optik',
    topics: ['genel', 'ürün kalitesi', 'çeşitlilik', 'fiyat', 'personel', 'hız'],
  },
  {
    id: 'oto_yikama',
    label: 'Oto Yıkama',
    topics: ['genel', 'temizlik', 'hız', 'fiyat', 'özen', 'iletişim'],
  },
  {
    id: 'lastikci',
    label: 'Lastikçi',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'güven', 'malzeme'],
  },
  {
    id: 'boyaci',
    label: 'Boyacı',
    topics: ['genel', 'işçilik', 'temizlik', 'fiyat', 'malzeme', 'hız'],
  },
  {
    id: 'nakliyat',
    label: 'Nakliyat',
    topics: ['genel', 'hız', 'özen', 'fiyat', 'güven', 'iletişim'],
  },
  {
    id: 'kargo',
    label: 'Kargo / Kurye',
    topics: ['genel', 'hız', 'güven', 'fiyat', 'iletişim', 'paketleme'],
  },
  {
    id: 'cicekci',
    label: 'Çiçekçi',
    topics: ['genel', 'tazelik', 'çeşitlilik', 'fiyat', 'sunum', 'teslimat'],
  },
  {
    id: 'kuyumcu',
    label: 'Kuyumcu',
    topics: ['genel', 'kalite', 'çeşitlilik', 'fiyat', 'güven', 'personel'],
  },
  {
    id: 'terzi',
    label: 'Terzi',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'kalite', 'iletişim'],
  },
  {
    id: 'ayakkabici',
    label: 'Ayakkabı Mağazası',
    topics: ['genel', 'kalite', 'çeşitlilik', 'fiyat', 'personel', 'ortam'],
  },
  {
    id: 'mobilya',
    label: 'Mobilya Mağazası',
    topics: ['genel', 'kalite', 'çeşitlilik', 'fiyat', 'teslimat', 'montaj', 'personel'],
  },
  {
    id: 'elektronik',
    label: 'Elektronik / Teknoloji',
    topics: ['genel', 'ürün kalitesi', 'çeşitlilik', 'fiyat', 'personel', 'garanti'],
  },
  {
    id: 'bilgisayar_servis',
    label: 'Bilgisayar Servisi',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'güven', 'iletişim'],
  },
  {
    id: 'klima_servis',
    label: 'Klima Servisi',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'güvenlik', 'malzeme'],
  },
  {
    id: 'temizlik',
    label: 'Temizlik Şirketi',
    topics: ['genel', 'temizlik', 'hız', 'fiyat', 'güven', 'ekip', 'iletişim'],
  },
  {
    id: 'bahce',
    label: 'Bahçe / Peyzaj',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'malzeme', 'estetik'],
  },
  {
    id: 'insaat',
    label: 'İnşaat / Tadilat',
    topics: ['genel', 'işçilik', 'hız', 'fiyat', 'malzeme', 'güven', 'temizlik'],
  },
  {
    id: 'fotografci',
    label: 'Fotoğrafçı / Stüdyo',
    topics: ['genel', 'kalite', 'hız', 'fiyat', 'atmosfer', 'personel'],
  },
  {
    id: 'seyahat',
    label: 'Seyahat Acentesi',
    topics: ['genel', 'hizmet', 'fiyat', 'güven', 'iletişim', 'organizasyon'],
  },
  {
    id: 'sigorta',
    label: 'Sigorta',
    topics: ['genel', 'hizmet', 'güven', 'fiyat', 'iletişim', 'hasar_süreci'],
  },
  {
    id: 'diger',
    label: 'Diğer',
    topics: ['genel', 'servis', 'fiyat', 'temizlik', 'hız', 'personel'],
  },
]

const sectorMap = new Map(SECTORS.map(s => [s.id, s]))

export function getSectorLabel(sectorId: string): string {
  return sectorMap.get(sectorId)?.label ?? sectorId
}

export function getSectorTopics(sectorId: string): string[] {
  return sectorMap.get(sectorId)?.topics ?? SECTORS.find(s => s.id === 'diger')!.topics
}

export function getTopicLabel(topic: string): string {
  return topic.charAt(0).toUpperCase() + topic.slice(1)
}
