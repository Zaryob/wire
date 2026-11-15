# wire

Ağ protokollerinin başlık alanları için RFC kaynaklı, bit düzeyinde Türkçe bir başvuru.
Her protokol sayfasında başlığın bit şeması, alan tablosu ve örnek bir paketin onaltılık
dökümü bulunur; her alan dayandığı RFC bölümüne bağlanır.

Bu sürümde: Ethernet, ARP, IPv4, IPv6, ICMP, ICMPv6, UDP, TCP ve DNS.

## Çalıştırma

Node.js 22 veya üstü yeterlidir; npm bağımlılığı yoktur.

```sh
npm start        # derler ve http://127.0.0.1:4174/wire/ adresinde sunar
npm run build    # _site/ dizinine derler
npm test         # veri, RFC karşılaştırması, örnek paketler ve bağlantılar
```

## Veri nereden geliyor

Bütün bilgiler RFC'lerden alınır. Kullanılan RFC'ler `sources/rfcs.json` dosyasında
listelenir.

- `npm run sync`, listedeki RFC metinlerini ve künyelerini rfc-editor.org'dan indirir.
  Metinler `.cache/rfc/` altında tutulur (depoya girmez); künyeler ve metinlerin sha256
  özetleri `sources/bibliography.json` dosyasına yazılır. Sitedeki Kaynakça sayfası bu
  dosyadan üretilir.
- `data/protocols/*.json`, her protokolün alanlarını tutar. Alan genişlikleri derleme ve
  test sırasında, atıf yapılan RFC metnindeki başlık şemasıyla karşılaştırılır
  (`src/rfc.mjs`, `src/sources.mjs`). Uyuşmazlıkta derleme durur.
- Türkçe alan açıklamaları ilgili RFC bölümünden elle yazılmış özetlerdir; her birinin
  `ref` alanı dayandığı RFC'yi ve bölümü gösterir.
- Örnek paketler gerçek yakalama değildir: alanların örnek değerlerinden üretilir,
  sağlama toplamları RFC 1071'e göre hesaplanır (`src/encode.mjs`). Adresler belgeleme
  aralıklarındandır (RFC 5737, RFC 3849, RFC 9542, RFC 2606).

Önbellek yoksa derleme ve testler RFC metinlerini kendiliğinden indirir ve özetleri
kaynakçadakiyle karşılaştırır.

## Yeni protokol eklemek

1. Gerekli RFC'leri `sources/rfcs.json` dosyasına ekleyin ve `npm run sync` çalıştırın.
2. `data/protocols/<ad>.json` dosyasını yazın. `layout` alanı karşılaştırılacak şemayı
   gösterir: `kind: "diagram"` için şemadaki bir satırdan ayırt edici bir `anchor`.
3. `npm test` çalıştırın.

## Ortak tema

`public/assets/console/` dizini [console-theme](https://github.com/Zaryob/console-theme)
deposundan kopyalanmıştır. Site henüz o deponun `scripts/sync.py` hedeflerine ve
`_data/console_projects.json` listesine eklenmemiştir; yayımlanırken eklenmelidir.

## Lisans

Kod ve Türkçe metinler GPL-3.0-or-later. Ayrıntılar için `NOTICE.md`.
