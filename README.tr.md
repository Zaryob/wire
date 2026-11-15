# wire

[English](README.md) · **Türkçe** · [Kapsamlı Kılavuz (KILAVUZ.md)](KILAVUZ.md)

Ağ protokollerinin başlık alanları için RFC kaynaklı, bit düzeyinde Türkçe bir başvuru kılavuzu ve etkileşimli web platformu. Her protokol sayfasında başlığın bit şeması, alan tablosu ve örnek bir paketin onaltılık (hex) dökümü bulunur; her alan dayandığı RFC bölümüne doğrudan bağlanır ve alan genişlikleri RFC metinlerindeki özgün ASCII şemalarla derleme aşamasında doğrulanır.

[Siteyi açın](https://zaryob.github.io/wire/)

---

## Kapsanan Protokoller ve Katmanlar

Bu sürümde tel üzerindeki 21 protokol en ince ayrıntısına kadar incelenmektedir:

1. **Bağlantı Katmanı (Data Link Layer)**
   - **Ethernet (RFC 826, RFC 894, RFC 9542)**: 48 bitlik hedef ve kaynak MAC adresleri, EtherType alanı ve çerçeve sınırları.
   - **ARP (RFC 826)**: IP adreslerini Ethernet donanım adreslerine dinamik eşleyen Adres Çözümleme Protokolü.
   - **RARP (RFC 903, RFC 826)**: Disksiz cihazların MAC adreslerinden IP adreslerini öğrenmesini sağlayan Ters Adres Çözümleme Protokolü.
   - **PPPoE (RFC 2516)**: Ethernet üzerinden PPP oturum yönetimi ve kapsülleme (Keşif ve Oturum aşamaları).
2. **Ağ / İnternet Katmanı (Network Layer)**
   - **IPv4 (RFC 791, RFC 2474, RFC 3168, RFC 5737)**: 20-60 sekizli başlık, DSCP/ECN hizmet kalitesi, parçalama (fragmentation) ve yaşam süresi (TTL).
   - **IPv6 (RFC 8200, RFC 2474, RFC 3168, RFC 3849)**: Sabit 40 sekizli başlık, 128 bitlik adres uzayı, akış etiketi (flow label) ve uzantı başlıkları mimarisi.
   - **IPv6 Parçalama (RFC 8200 §4.5)**: Kaynak düğüm tarafından parçalanan paketler için 8 sekizlilik parçalama uzantı başlığı.
   - **ICMPv4 (RFC 792)**: Ağ teşhis, hata raporlama ve kontrol iletileri (Ping, Destination Unreachable vb.).
   - **ICMPv6 (RFC 4443, RFC 8200)**: IPv6 için hata ve bilgi iletileri, sözde başlıkla sağlama toplamı.
   - **IGMPv2 (RFC 2236)**: Çok noktaya yayın (multicast) grup üyeliği yönetimi ve üyelik raporları.
   - **GRE (RFC 2784)**: Ağ katmanı tünelleme ve sağlama toplamı doğrulaması.
   - **IPsec AH (RFC 4302)**: IP paketlerine veri bütünlüğü, kimlik doğrulama ve anti-replay koruması sağlayan Kimlik Doğrulama Başlığı.
3. **İletim Katmanı (Transport Layer)**
   - **UDP (RFC 768)**: Minimal 8 sekizli başlık, bağlantısız ve düşük gecikmeli iletim.
   - **TCP (RFC 9293, RFC 3168)**: Güvenilir bayt akışı, 3 aşamalı bağlantı kurulumu (3-Way Handshake), durum makinesi ve akış denetimi.
   - **SCTP (RFC 9260)**: Mesaj tabanlı, çoklu akış ve çoklu barındırma yeteneklerine sahip güvenilir iletim, 32-bit CRC-32c sağlama toplamı.
   - **DCCP (RFC 4340)**: Güvenilmez datagram akışları üzerinde çift yönlü tıkanıklık denetimi (VoIP/ortam akışı).
   - **VXLAN (RFC 7348)**: Veri merkezi ağ sanallaştırması ve Katman 2 üzeri Katman 4 tünellemesi.
4. **Uygulama Katmanı (Application Layer)**
   - **DNS (RFC 1035, RFC 2606)**: 12 sekizli sabit başlık, sorgu/yanıt bayrakları (QR, Opcode, RCODE) ve kaynak kayıtları (RR).
   - **CoAP (RFC 7252)**: Kısıtlı IoT cihazları ve düşük güçlü ağlar için ikili RESTful web aktarım protokolü.
   - **DHCPv4 (RFC 2131, RFC 2132)**: BOOTP'tan devralınan 236 sekizlilik sabit kısım, BROADCAST bayrağı, sihirli çerez ve DORA adres alma akışı.
   - **NTPv4 (RFC 5905)**: 48 sekizlilik temel başlık, Stratum ve kip alanları, dört adet 64 bitlik zaman damgası ve gecikme/saat farkı hesabı.

Ayrıca [KILAVUZ.md](KILAVUZ.md) belgesi; **IEEE 802.3, 802.1Q (VLAN), PPPoE (RFC 2516), RARP (RFC 903), DHCPv4 (RFC 2131), DHCPv6 (RFC 8415), SCTP (RFC 9260), NDP (RFC 4861)** ve **ACD (RFC 5227)** protokollerini ve worked-example paket dökümlerini ayrıntılarıyla içerir.

---

## Bütün RFC'lerin Listesi ve Kullanımı

Sitedeki ve kılavuzdaki her bilgi IETF standartlarına dayanır (`sources/rfcs.json`):

| RFC No | Başlık ve Kapsam | wire İçindeki Kullanımı |
|---|---|---|
| **RFC 768** | User Datagram Protocol | UDP başlığı (8 bayt) ve sözde başlık (pseudo-header) tanımı. |
| **RFC 791** | Internet Protocol | IPv4 başlığı, alan genişlikleri, parçalama ve yönlendirme kuralları. |
| **RFC 792** | Internet Control Message Protocol | ICMPv4 iletileri, tür/kod eşlemeleri ve sağlama toplamı. |
| **RFC 826** | An Ethernet Address Resolution Protocol | ARP paket yapısı ve Ethernet iletim katmanı alanları. |
| **RFC 894** | Transmission of IP Datagrams over Ethernet | IP datagramlarının Ethernet çerçevesinde taşınması (EtherType 0x0800). |
| **RFC 903** | A Reverse Address Resolution Protocol | RARP paket formatı ve ters adres çözümleme mekanizması. |
| **RFC 1035** | Domain Names - Implementation and Specification | DNS ileti başlığı, bayraklar ve kaynak kayıt formatı. |
| **RFC 1071** | Computing the Internet Checksum | 16-bit bire tümleyen internet sağlama toplamı hesaplama algoritması. |
| **RFC 2131** | Dynamic Host Configuration Protocol | DHCPv4 ileti biçimi ve BOOTP ile ortak sabit alanlar. |
| **RFC 2132** | DHCP Options and BOOTP Vendor Extensions | DHCP ileti türü, parametre istek listesi ve bitiş seçenekleri. |
| **RFC 2236** | Internet Group Management Protocol, Version 2 | IGMPv2 çok noktaya yayın (multicast) üyelik raporları ve sorguları. |
| **RFC 2474** | Definition of the Differentiated Services Field | IPv4 ToS ve IPv6 Traffic Class sekizlilerinin 6 bitlik DSCP olarak tanımı. |
| **RFC 2516** | A Method for Transmitting PPP Over Ethernet (PPPoE) | PPPoE paket başlığı, keşif ve oturum aşamaları. |
| **RFC 2606** | Reserved Top Level DNS Names | Örneklerde kullanılan belgeleme alan adları (`example.com`, `.test`). |
| **RFC 2784** | Generic Routing Encapsulation (GRE) | GRE paket başlığı ve tünel sağlama toplamı. |
| **RFC 3168** | The Addition of Explicit Congestion Notification to IP | IP ve TCP başlıklarında tıkanıklık uyarısı sağlayan 2 bitlik ECN. |
| **RFC 3849** | IPv6 Address Prefix Reserved for Documentation | Örneklerde kullanılan IPv6 belgeleme öneki (`2001:db8::/32`). |
| **RFC 4302** | IP Authentication Header | IPsec AH başlığı, veri bütünlüğü ve kimlik doğrulama. |
| **RFC 4340** | Datagram Congestion Control Protocol (DCCP) | DCCP paket başlığı ve çift yönlü tıkanıklık denetimi. |
| **RFC 4443** | ICMPv6 for the IPv6 Specification | ICMPv6 hata ve bilgilendirme iletileri. |
| **RFC 5737** | IPv4 Address Blocks Reserved for Documentation | Örneklerde kullanılan IPv4 belgeleme blokları (`192.0.2.0/24` vb.). |
| **RFC 5905** | Network Time Protocol Version 4 | NTPv4 paket başlığı ve zaman damgası biçimleri. |
| **RFC 7252** | The Constrained Application Protocol (CoAP) | CoAP IoT ileti başlığı ve ikili RESTful iletim. |
| **RFC 7348** | Virtual eXtensible Local Area Network (VXLAN) | VXLAN katman 2 tünelleme başlığı ve sanal ağ kimliği (VNI). |
| **RFC 8200** | Internet Protocol, Version 6 (IPv6) Specification | Sabit 40 sekizli IPv6 başlığı, uzantı başlıkları ve IPv6 sözde başlığı. |
| **RFC 9260** | Stream Control Transmission Protocol | SCTP ortak başlığı, çoklu akış ve 32-bit CRC-32c sağlama toplamı. |
| **RFC 9293** | Transmission Control Protocol (TCP) | Modern TCP başlığı, bayraklar ve sıra numaralandırması (RFC 793 konsolidasyonu). |
| **RFC 9542** | IANA Considerations for IEEE 802 Parameters | Örneklerde kullanılan belgeleme MAC adresleri (`00:00:5e:00:53:xx`). |

---

## Veri Doğrulama ve Matematiksel Tutarlılık

- `npm run sync`: `sources/rfcs.json` dosyasındaki RFC metinlerini ve resmi bibliyografik künyelerini rfc-editor.org'dan çeker. Metinler `.cache/rfc/` altında saklanır; sha256 özetleri `sources/bibliography.json` dosyasına işlenir.
- `data/protocols/*.json`: Her protokolün alanlarını tutar. Alan genişlikleri derleme (`npm run build`) ve test (`npm test`) aşamasında, atıf yapılan RFC metnindeki özgün ASCII şemasıyla makine tarafından karşılaştırılır (`src/rfc.mjs`, `src/sources.mjs`). Uyuşmazlık durumunda derleme durdurulur.
- **Örnek Paket Üretimi (`src/encode.mjs`)**: Sitedeki onaltılık (hex) dökümler elle yazılmış statik metinler değildir. Alan tablosundaki değerlerden derleme sırasında dinamik olarak üretilir; sağlama toplamları RFC 1071'e göre (ve ilgili L4 protokolleri için sözde başlık eklenerek) hesaplanır.
- **Belgeleme Adresleri**: Gerçek ağ trafiğiyle çakışmayı önlemek için yalnızca IANA tarafından belgelendirme için ayrılmış adres blokları kullanılır (RFC 5737, RFC 3849, RFC 9542, RFC 2606).

---

## Çalıştırma ve Test

Node.js 22 veya üstü yeterlidir; harici npm bağımlılığı yoktur.

```sh
npm start        # siteyi derler ve http://127.0.0.1:4174/wire/ adresinde sunar
npm run build    # statik siteyi _site/ dizinine üretir
npm test         # RFC şema karşılaştırması, sağlama toplamı, bağlantı ve veri testleri
npm run check    # sözdizimi denetimi, derleme ve testleri art arda çalıştırır
```

---

## Dizin Yapısı

```
wire/
├── KILAVUZ.md                 # Ayrıntılı Ethernet, paket mimarisi ve RFC kılavuzu
├── README.tr.md               # Türkçe proje tanıtımı ve başvuru
├── README.md                  # İngilizce proje tanıtımı
├── NOTICE.md                  # Kaynak ve telif hakları bildirimi
├── LICENSE                    # GPL-3.0 lisansı
├── package.json               # Node.js betikleri ve motor tanımları
├── data/
│   └── protocols/             # Her protokol için alan, şema ve örnek JSON verileri
├── sources/
│   ├── rfcs.json              # Kullanılan RFC numaraları ve amaçları
│   └── bibliography.json      # RFC künyeleri, DOI, özet ve sha256 sağlama toplamları
├── src/
│   ├── encode.mjs             # Bit/sekizli paket kodlama ve RFC 1071 sağlama toplamı
│   ├── rfc.mjs                # RFC düz metninden ASCII şemaları ve alan genişliklerini okuma
│   └── sources.mjs            # Önbellek, RFC indirme ve şema doğrulama
├── scripts/
│   ├── build.mjs              # Statik site üreticisi (_site/ dizinine derler)
│   ├── serve.mjs              # Yerel geliştirme HTTP sunucusu
│   └── sync-rfc.mjs           # rfc-editor.org üzerinden RFC'leri eşitleme
├── tests/
│   ├── data.test.mjs          # Veri tutarlılığı, RFC şema eşleşmesi ve sağlama toplamı testleri
│   └── site.test.mjs          # HTML üretimi, kırık bağlantı ve varlık doğrulama testleri
└── public/                    # CSS, istemci JS ve konsol teması varlıkları
```

---

## Lisans

Kaynak kod ve Türkçe metinler GPL-3.0-or-later lisansı altındadır. Ayrıntılar için `NOTICE.md` ve `LICENSE` dosyalarına bakabilirsiniz.
