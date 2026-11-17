# wire

[English](README.md) · **Türkçe** · [Kapsamlı Kılavuz (KILAVUZ.md)](KILAVUZ.md)

Ağ protokollerinin başlık alanları için RFC kaynaklı, bit düzeyinde Türkçe bir başvuru kılavuzu ve etkileşimli web platformu. Her protokol sayfasında başlığın bit şeması, alan tablosu ve örnek bir paketin onaltılık (hex) dökümü bulunur; her alan dayandığı RFC bölümüne doğrudan bağlanır ve alan genişlikleri RFC metinlerindeki özgün başlık şemalarıyla derleme aşamasında doğrulanır. IEEE'nin tanımladığı protokoller standartların lisanslı kopyalarının metnine karşı doğrulanır ve metinlerin kendisi depoya konmaz: 802.1Q etiketi IEEE 802.1Q-2022'ye, PTP IEEE 1588-2008'e, LLDP IEEE 802.1AB-2016'ya ve standardın yayımladığı MIB modüllerine karşı.

[Siteyi açın](https://zaryob.github.io/wire/)

---

## Kapsanan Protokoller ve Katmanlar

Bu sürümde tel üzerindeki 46 protokol en ince ayrıntısına kadar incelenmektedir:

1. **Bağlantı Katmanı (Data Link Layer)**
   - **Ethernet (RFC 826, RFC 894, RFC 9542)**: 48 bitlik hedef ve kaynak MAC adresleri, EtherType alanı ve çerçeve sınırları.
   - **ARP (RFC 826)**: IP adreslerini Ethernet donanım adreslerine dinamik eşleyen Adres Çözümleme Protokolü.
   - **RARP (RFC 903, RFC 826)**: Disksiz cihazların MAC adreslerinden IP adreslerini öğrenmesini sağlayan Ters Adres Çözümleme Protokolü.
   - **PPPoE (RFC 2516)**: Ethernet üzerinden PPP oturum yönetimi ve kapsülleme (Keşif ve Oturum aşamaları).
   - **802.1Q VLAN etiketi (IEEE 802.1Q-2022, lisanslı kopyaya karşı doğrulanır)**: TPID, öncelik (PCP) ve trafik türleri, DEI ve 12 bitlik VLAN kimliği.
   - **LLDP (IEEE 802.1AB-2016; lisanslı kopyaya ve MIB modüllerine karşı doğrulanır)**: Komşu keşfi için Chassis ID, Port ID, TTL ve End TLV'lerinden oluşan veri birimi.
   - **MPLS (RFC 3032, RFC 5462)**: 20 bitlik etiket, trafik sınıfı, yığın sonu biti ve TTL taşıyan 4 sekizlilik etiket girdisi.
2. **Ağ / İnternet Katmanı (Network Layer)**
   - **IPv4 (RFC 791, RFC 2474, RFC 3168, RFC 5737)**: 20-60 sekizli başlık, DSCP/ECN hizmet kalitesi, parçalama (fragmentation) ve yaşam süresi (TTL).
   - **IPv6 (RFC 8200, RFC 2474, RFC 3168, RFC 3849)**: Sabit 40 sekizli başlık, 128 bitlik adres uzayı, akış etiketi (flow label) ve uzantı başlıkları mimarisi.
   - **IPv6 Parçalama (RFC 8200 §4.5)**: Kaynak düğüm tarafından parçalanan paketler için 8 sekizlilik parçalama uzantı başlığı.
   - **ICMPv4 (RFC 792)**: Ağ teşhis, hata raporlama ve kontrol iletileri (Ping, Destination Unreachable vb.).
   - **ICMPv6 (RFC 4443, RFC 8200)**: IPv6 için hata ve bilgi iletileri, sözde başlıkla sağlama toplamı.
   - **IPv6 Segment Routing Header (RFC 8754)**: Routing Type 4 başlığı ve ters sırada yazılan segment listesi.
   - **IGMPv2 (RFC 2236)**: Çok noktaya yayın (multicast) grup üyeliği yönetimi ve üyelik raporları.
   - **IGMPv3 (RFC 9776)**: Kaynağa göre sınırlanabilen Membership Query iletisi.
   - **OSPFv2 (RFC 2328)**: 24 sekizlilik ortak başlık ve komşu bulan Hello paketi.
   - **VRRPv3 (RFC 9568)**: Sanal yönlendirici duyurusu ve IPv4 sağlama toplamı.
   - **GRE (RFC 2784)**: Ağ katmanı tünelleme ve sağlama toplamı doğrulaması.
   - **IPsec AH (RFC 4302)**: IP paketlerine veri bütünlüğü, kimlik doğrulama ve anti-replay koruması sağlayan Kimlik Doğrulama Başlığı.
   - **IPsec ESP (RFC 4303)**: SPI ve sıra numarasından oluşan başlık, şifrelenen yük, dolgu ve Next Header kuyruğu, bütünlük değeri (ICV).
3. **İletim Katmanı (Transport Layer)**
   - **UDP (RFC 768)**: Minimal 8 sekizli başlık, bağlantısız ve düşük gecikmeli iletim.
   - **TCP (RFC 9293, RFC 3168)**: Güvenilir bayt akışı, 3 aşamalı bağlantı kurulumu (3-Way Handshake), durum makinesi ve akış denetimi.
   - **SCTP (RFC 9260)**: Mesaj tabanlı, çoklu akış ve çoklu barındırma yeteneklerine sahip güvenilir iletim, 32-bit CRC-32c sağlama toplamı.
   - **DCCP (RFC 4340)**: Güvenilmez datagram akışları üzerinde çift yönlü tıkanıklık denetimi (VoIP/ortam akışı).
   - **QUIC (RFC 9000, RFC 9001)**: 1-RTT kısa başlığı ve Initial paketinin uzun başlığı, bağlantı kimlikleri, belirteç ve değişken uzunluklu tamsayılar; RFC 9000'in şekil gösterimiyle doğrulanır.
   - **VXLAN (RFC 7348)**: Veri merkezi ağ sanallaştırması ve Katman 2 üzeri Katman 4 tünellemesi.
   - **Geneve (RFC 8926)**: Değişken uzunluklu seçenekler taşıyabilen 8 sekizlilik tünel başlığı.
4. **Uygulama Katmanı (Application Layer)**
   - **DNS (RFC 1035, RFC 2606)**: 12 sekizli sabit başlık, sorgu/yanıt bayrakları (QR, Opcode, RCODE) ve kaynak kayıtları (RR).
   - **CoAP (RFC 7252)**: Kısıtlı IoT cihazları ve düşük güçlü ağlar için ikili RESTful web aktarım protokolü.
   - **DHCPv4 (RFC 2131, RFC 2132)**: BOOTP'tan devralınan 236 sekizlilik sabit kısım, BROADCAST bayrağı, sihirli çerez ve DORA adres alma akışı.
   - **DHCPv6 (RFC 8415)**: 4 sekizlilik istemci-sunucu başlığı, DUID ile tanımlama ve tür-uzunluk-değer biçimindeki seçenekler.
   - **NTPv4 (RFC 5905)**: 48 sekizlilik temel başlık, Stratum ve kip alanları, dört adet 64 bitlik zaman damgası ve gecikme/saat farkı hesabı.
   - **RTP (RFC 3550, RFC 3551)**: Ses ve görüntü akışlarının 12 sekizlilik sabit başlığı, sıra numarası, zaman damgası ve yük türleri.
   - **PTP (IEEE 1588-2008, lisanslı kopyaya karşı doğrulanır)**: 34 sekizlilik ortak başlık; Sync, Follow_Up, Delay_Req, Delay_Resp ve Announce iletileri.
   - **RTCP (RFC 3550)**: NTP ve RTP zaman damgalarını eşleyen, alım istatistikleri taşıyan gönderici raporu.
   - **BFD (RFC 5880, RFC 5881)**: İletim yolu kopukluğunu milisaniyeler içinde saptayan 24 sekizlilik denetim paketi ve oturum durumları.
   - **STUN (RFC 8489)**: 20 sekizlilik başlık, Magic Cookie ve XOR-MAPPED-ADDRESS özniteliği.
   - **WebSocket (RFC 6455)**: Opcode, maske biti ve maskeleme anahtarı taşıyan çerçeve başlığı.
   - **HTTP/2 (RFC 9113)**: 9 sekizlilik çerçeve başlığı ve SETTINGS çerçevesi.
   - **HTTP/3 (RFC 9114)**: Değişken uzunluklu tür ve uzunluktan oluşan çerçeve ve SETTINGS çerçevesi.
   - **BGP (RFC 4271, RFC 5398)**: 19 sekizlilik mesaj başlığı ve OPEN mesajı.

Ayrıca [KILAVUZ.md](KILAVUZ.md) belgesi; **IEEE 802.3, 802.1Q (VLAN), PPPoE (RFC 2516), RARP (RFC 903), DHCPv4 (RFC 2131), DHCPv6 (RFC 8415), SCTP (RFC 9260), NDP (RFC 4861)** ve **ACD (RFC 5227)** protokollerini ve worked-example paket dökümlerini ayrıntılarıyla içerir.

---

## Bütün RFC'lerin Listesi ve Kullanımı

Sitedeki ve kılavuzdaki her bilgi IETF standartlarına (`sources/rfcs.json`), bir protokolü tanımlayan RFC yoksa IEEE standartlarına (`sources/standards.json`) dayanır:

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
| **RFC 2328** | OSPF Version 2 | OSPF paket başlığı ve Hello paketi. |
| **RFC 2474** | Definition of the Differentiated Services Field | IPv4 ToS ve IPv6 Traffic Class sekizlilerinin 6 bitlik DSCP olarak tanımı. |
| **RFC 2516** | A Method for Transmitting PPP Over Ethernet (PPPoE) | PPPoE paket başlığı, keşif ve oturum aşamaları. |
| **RFC 2606** | Reserved Top Level DNS Names | Örneklerde kullanılan belgeleme alan adları (`example.com`, `.test`). |
| **RFC 2784** | Generic Routing Encapsulation (GRE) | GRE paket başlığı ve tünel sağlama toplamı. |
| **RFC 3032** | MPLS Label Stack Encoding | MPLS etiket yığını girdisi: Label, S biti ve TTL. |
| **RFC 3168** | The Addition of Explicit Congestion Notification to IP | IP ve TCP başlıklarında tıkanıklık uyarısı sağlayan 2 bitlik ECN. |
| **RFC 3849** | IPv6 Address Prefix Reserved for Documentation | Örneklerde kullanılan IPv6 belgeleme öneki (`2001:db8::/32`). |
| **RFC 3550** | RTP: A Transport Protocol for Real-Time Applications | RTP sabit başlığı. |
| **RFC 3551** | RTP Profile for Audio and Video Conferences with Minimal Control | Statik yük türleri (ör. PT 0 = PCMU). |
| **RFC 4271** | A Border Gateway Protocol 4 (BGP-4) | BGP mesaj başlığı ve OPEN mesajı. |
| **RFC 4302** | IP Authentication Header | IPsec AH başlığı, veri bütünlüğü ve kimlik doğrulama. |
| **RFC 4303** | IP Encapsulating Security Payload (ESP) | ESP başlığı (SPI, sıra numarası) ve kuyruğu (dolgu, Pad Length, Next Header, ICV). |
| **RFC 4340** | Datagram Congestion Control Protocol (DCCP) | DCCP paket başlığı ve çift yönlü tıkanıklık denetimi. |
| **RFC 4443** | ICMPv6 for the IPv6 Specification | ICMPv6 hata ve bilgilendirme iletileri. |
| **RFC 5398** | Autonomous System (AS) Number Reservation for Documentation Use | Belgeleme AS numaraları (64496–64511). |
| **RFC 5462** | MPLS Label Stack Entry: "EXP" Field Renamed to "Traffic Class" Field | Etiket girdisindeki 3 bitlik TC alanı. |
| **RFC 5737** | IPv4 Address Blocks Reserved for Documentation | Örneklerde kullanılan IPv4 belgeleme blokları (`192.0.2.0/24` vb.). |
| **RFC 5880** | Bidirectional Forwarding Detection (BFD) | BFD denetim paketinin zorunlu bölümü. |
| **RFC 5881** | BFD for IPv4 and IPv6 (Single Hop) | BFD'nin UDP 3784 üzerinde taşınması ve TTL 255 kuralı. |
| **RFC 5905** | Network Time Protocol Version 4 | NTPv4 paket başlığı ve zaman damgası biçimleri. |
| **RFC 6325** | Routing Bridges (RBridges): Base Protocol Specification | 802.1Q VLAN etiketinin öncelik, DEI ve VLAN ID bitlerini yeniden çizer; VLAN sayfasında etiketin ikinci bir çizimi olarak anılır. |
| **RFC 6455** | The WebSocket Protocol | WebSocket çerçeve biçimi ve istemciden sunucuya maskeleme. |
| **RFC 7252** | The Constrained Application Protocol (CoAP) | CoAP IoT ileti başlığı ve ikili RESTful iletim. |
| **RFC 7348** | Virtual eXtensible Local Area Network (VXLAN) | VXLAN katman 2 tünelleme başlığı ve sanal ağ kimliği (VNI); iç çerçeve şeması 802.1Q etiketini de çizer. |
| **RFC 8200** | Internet Protocol, Version 6 (IPv6) Specification | Sabit 40 sekizli IPv6 başlığı, uzantı başlıkları ve IPv6 sözde başlığı. |
| **RFC 8415** | Dynamic Host Configuration Protocol for IPv6 (DHCPv6) | DHCPv6 istemci-sunucu iletisi ve seçenekleri. |
| **RFC 8489** | Session Traversal Utilities for NAT (STUN) | STUN ileti başlığı ve XOR-MAPPED-ADDRESS. |
| **RFC 8754** | IPv6 Segment Routing Header (SRH) | Routing Type 4 başlığı ve segment listesi. |
| **RFC 8926** | Geneve: Generic Network Virtualization Encapsulation | Geneve tünel başlığı ve seçenekleri. |
| **RFC 9000** | QUIC: A UDP-Based Multiplexed and Secure Transport | QUIC Initial paketi ve değişken uzunluklu tamsayılar; RFC'nin şekil gösterimine karşı doğrulanır. |
| **RFC 9001** | Using TLS to Secure QUIC | Başlık koruması ve Initial anahtarları. |
| **RFC 9113** | HTTP/2 | HTTP/2 çerçeve başlığı ve SETTINGS çerçevesi. |
| **RFC 9114** | HTTP/3 | HTTP/3 çerçeve biçimi ve SETTINGS çerçevesi; RFC'nin şekil gösterimine karşı doğrulanır. |
| **RFC 9260** | Stream Control Transmission Protocol | SCTP ortak başlığı, çoklu akış ve 32-bit CRC-32c sağlama toplamı. |
| **RFC 9293** | Transmission Control Protocol (TCP) | Modern TCP başlığı, bayraklar ve sıra numaralandırması (RFC 793 konsolidasyonu). |
| **RFC 9542** | IANA Considerations for IEEE 802 Parameters | Örneklerde kullanılan belgeleme MAC adresleri (`00:00:5e:00:53:xx`). |
| **RFC 9568** | Virtual Router Redundancy Protocol (VRRP) Version 3 for IPv4 and IPv6 | VRRPv3 duyurusu ve IPv4 sağlama toplamı. |
| **RFC 9776** | Internet Group Management Protocol, Version 3 | IGMPv3 Membership Query iletisi. |

### IEEE standartları

IEEE metinleri lisanslıdır; depoya konmaz ve yeniden dağıtılmaz. `sources/standards.json` dosyasında adı geçen yola (git'in yok saydığı `.cache/` altına) lisanslı bir kopya konduğunda `npm run sync:ieee` metni çıkarır, sayfadaki alan adlarını ve genişliklerini standardın ileti tablolarıyla karşılaştırır ve sonucu protokolün `layout.checked` kaydına yazar. Kopyası olmayan derlemeler (CI) veriyi bu kayda karşı denetler; atıf yapılan bölüm ve sayfa numaraları metin bulunduğunda denetlenir. Aynı alanları yeniden çizen bir RFC varsa sayfa o RFC'ye karşı doğrulanır.

| Standart | Başlık | wire İçindeki Kullanımı |
|---|---|---|
| **IEEE 802.1Q-2022** | Bridges and Bridged Networks | VLAN etiketi: TPID (9.4, Table 9-1), TCI (9.6, Table 9-2), PCP ve DEI (6.9.3) ve öncelik değerlerinin trafik türleri (I.4, Table I-2); lisanslı bir kopyaya karşı doğrulanır. |
| **IEEE 802.1AB-2016** | Station and Media Access Control Connectivity Discovery | LLDPDU biçimi (8.2), temel TLV biçimi ve tür değerleri (8.4, Table 8-1), zorunlu TLV'ler (8.5.1–8.5.4), alt tür tabloları (Table 8-2, 8-3) ve txTTL (9.2.5.22); lisanslı bir kopyaya karşı doğrulanır. TLV figürleri PDF'te görüntü olduğu için yerleşim, aynı bilgiyi yazıyla ve tablolarla veren maddelerden okunur. 11.5.1'deki MIB modülleri de ayrıca denetlenir; PDF'ler gibi depo dışında tutulurlar. |
| **IEEE 1588-2008** | Precision Clock Synchronization Protocol | PTP ortak başlığı (Table 18) ile Announce, Sync, Delay_Req, Follow_Up ve Delay_Resp iletileri (Table 25–28); lisanslı bir kopyaya karşı doğrulanır. |

---

## Veri Doğrulama ve Matematiksel Tutarlılık

- `npm run sync`: `sources/rfcs.json` dosyasındaki RFC metinlerini ve resmi bibliyografik künyelerini rfc-editor.org'dan çeker. Metinler `.cache/rfc/` altında saklanır; sha256 özetleri `sources/bibliography.json` dosyasına işlenir.
- `data/protocols/*.json`: Her protokolün alanlarını tutar. Alan genişlikleri derleme (`npm run build`) ve test (`npm test`) aşamasında, atıf yapılan RFC metnindeki özgün ASCII şemasıyla, RFC 9000 ve RFC 9113'te ise "Header Form (1) = 1," biçimindeki şekillerle makine tarafından karşılaştırılır (`src/rfc.mjs`, `src/sources.mjs`). Bir sayfa birden çok RFC'deki şemalara karşı da doğrulanabilir (802.1Q için RFC 7348 ve RFC 6325). Uyuşmazlık durumunda derleme durdurulur. IEEE standartlarına dayanan PTP ve LLDP sayfaları lisanslı metinlere karşı doğrulanır ve sonuç kaydedilir; kopyası olmayan derlemeler (CI) bu kayda karşı denetler.
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
npm run sync:ieee # .cache/ieee/ altındaki lisanslı IEEE PDF'lerinden metni çıkarır, yeniden doğrular ve kaydeder (pdfplumber gerekir)
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
