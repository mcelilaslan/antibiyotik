# YBÜ Antibiyotik Rehberi

https://mcelilaslan.github.io/antibiyotik

Hızlı erişim için mobil öncelikli, statik bir antibiyotik referans sitesi.

## Özellikler

- Etken madde, ticari isim veya spektruma göre canlı arama
- Gruba göre filtre çipleri ve açılır/kapanır kategori listeleri
- Her ilaç için: spektrum, endikasyonlar, standart doz (düşük/yüksek), renal doz ayarı, etkisiz olduğu durumlar, yan etkiler, nefrotoksisite rozeti, eliminasyon yolu
- İlaç detayına doğrudan bağlantı (`#/ilac/etken-adi`) — bir ilacı arkadaşınıza doğrudan linkleyebilirsiniz
- Açık/koyu tema (sistem tercihini otomatik algılar, sağ üstteki simgeyle elle değiştirilebilir — gece nöbetinde göz yormaz)
- **PWA (yüklenebilir uygulama):** Android Chrome'da adres çubuğunda veya menüde "Yükle" seçeneği çıkar; telefona kurulduğunda tam ekran, uygulama simgeli, tarayıcı çubuğu olmadan açılır. Bir kez açıldıktan sonra internet olmadan da (hastanede sinyal zayıfken) çalışır.
- Harici bağımlılık yok (tek Google Fonts çağrısı dışında); tamamen statik, build adımı gerekmez

## Dosya yapısı

```
site/
├── index.html
├── style.css
├── app.js
├── data.js
├── manifest.json      ← PWA yapılandırması
├── sw.js               ← Service worker (çevrimdışı önbellek)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

Android'de Chrome'da siteyi açtığınızda adres çubuğunda veya sağ üstteki üç nokta menüsünde **"Uygulamayı yükle" / "Ana ekrana ekle"** seçeneği otomatik çıkar (site artık geçerli bir PWA olduğu için). Kurduğunuzda tam ekran, uygulama simgeli, tarayıcı çubuğu olmadan açılır. iPhone'da ise Safari'de paylaş menüsünden "Ana Ekrana Ekle" ile aynı sonucu alırsınız.


## Sorumluluk uyarısı

Bu site klinik karar desteği amaçlı bir hızlı referanstır; kurum protokolleri, hasta bazlı değerlendirme ve güncel literatür yerine geçmez.
