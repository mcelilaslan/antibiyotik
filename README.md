# YBÜ Antibiyotik Rehberi

Yoğun bakımda hızlı erişim için mobil öncelikli, statik bir antibiyotik referans sitesi. Veriler `yogun-bakim-antibiyotik-kilavuzu-v5.xlsx` dosyasından alınmıştır (renal doz hesaplayıcı sayfası bu sürüme dahil edilmemiştir).

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

Bunların hepsini olduğu gibi (klasör yapısını bozmadan) reponun köküne yükleyin — `icons/` klasörü index.html ile aynı seviyede kalmalı.

## GitHub Pages'te yayınlama

1. GitHub'da yeni bir repo oluşturun (örn. `antibiyotik-rehberi`).
2. Bu klasördeki tüm dosya ve klasörleri (`index.html`, `style.css`, `app.js`, `data.js`, `manifest.json`, `sw.js`, `icons/`) reponun kök dizinine yükleyin — yapıyı bozmadan, `icons/` klasörü `index.html` ile aynı seviyede kalmalı.
3. Repo **Settings → Pages** bölümüne gidin.
4. "Source" olarak `Deploy from a branch` seçin, branch olarak `main` ve klasör olarak `/ (root)` seçip kaydedin.
5. Birkaç dakika içinde siteniz `https://kullaniciadiniz.github.io/antibiyotik-rehberi/` adresinde yayına girer.

Android'de Chrome'da siteyi açtığınızda adres çubuğunda veya sağ üstteki üç nokta menüsünde **"Uygulamayı yükle" / "Ana ekrana ekle"** seçeneği otomatik çıkar (site artık geçerli bir PWA olduğu için). Kurduğunuzda tam ekran, uygulama simgeli, tarayıcı çubuğu olmadan açılır. iPhone'da ise Safari'de paylaş menüsünden "Ana Ekrana Ekle" ile aynı sonucu alırsınız.

> Not: GitHub Pages HTTPS üzerinden servis ettiği için PWA kurulum şartlarından biri (güvenli bağlantı) otomatik sağlanır. Yerel olarak `file://` ile açarsanız veya HTTP üzerinden test ederseniz "Yükle" seçeneği çıkmaz — bu normaldir, sadece yayınlanan HTTPS adreste çalışır.

## Veriyi güncelleme

Tüm ilaç verisi `data.js` içinde tek bir `DRUG_DATA` dizisi olarak tutulur. Yeni bir ilaç eklemek veya mevcut birini düzenlemek için bu dosyadaki ilgili nesneyi güncellemeniz yeterlidir; sayfa otomatik olarak yeniden listeler. Alanlar:

- `kategori` / `kategoriKisa` / `kategoriRenk`: ana grup ve renk anahtarı (`blue`, `purple`, `amber`, `green`, `rose`)
- `grup`: alt sınıf (örn. "Karbapenem")
- `etken`, `pazar`: jenerik ve ticari isimler
- `ozellikler`, `endikasyon`, `standartDoz`, `renalDoz`, `sinirlamalar`, `yanEtki`, `eliminasyon`: serbest metin (çok satırlı alanlarda `\n` ile satır ayırın)
- `nefroSeviye` (`Düşük` / `Düşük-Orta` / `Orta` / `Yüksek`), `nefroNot`: nefrotoksisite rozeti

> Önemli: Veriyi güncelledikten sonra kurulu uygulamaların yeni veriyi görmesi için `sw.js` içindeki `CACHE_NAME` değerini bir üst sürüme çıkarın (örn. `ybu-antibiyotik-v1` → `ybu-antibiyotik-v2`). Aksi halde site, önbelleğe alınmış eski sürümü göstermeye devam edebilir.

## Sorumluluk uyarısı

Bu site klinik karar desteği amaçlı bir hızlı referanstır; kurum protokolleri, hasta bazlı değerlendirme ve güncel literatür yerine geçmez.
