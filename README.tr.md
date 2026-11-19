# wire

[English](README.md) · **Türkçe** · [Ayrıntılı kılavuz (KILAVUZ.md)](KILAVUZ.md)

[Siteyi açın](https://zaryob.github.io/wire/tr/) · [English edition](https://zaryob.github.io/wire/)

Ağ protokollerinin başlık alanları için RFC kaynaklı, bit düzeyinde Türkçe bir başvuru kılavuzu ve etkileşimli web platformu. Her protokol sayfasında başlığın bit şeması, alan tablosu ve örnek bir paketin onaltılık (hex) dökümü bulunur; her alan dayandığı RFC bölümüne doğrudan bağlanır ve alan genişlikleri RFC metinlerindeki özgün başlık şemalarıyla derleme aşamasında doğrulanır. IEEE'nin tanımladığı protokoller standartların lisanslı kopyalarının metnine karşı doğrulanır ve metinlerin kendisi depoya konmaz: 802.1Q etiketi IEEE 802.1Q-2022'ye, PTP IEEE 1588-2008'e, LLDP IEEE 802.1AB-2016'ya ve standardın yayımladığı MIB modüllerine karşı.

---

## Kapsanan Protokoller ve Katmanlar

Wire’da 51 protokol başlığı ve ileti biçimi bulunur. [Ana sayfa](https://zaryob.github.io/wire/tr/) protokolleri TCP/IP katmanlarına göre listeler. [Katmanlar bölümü](https://zaryob.github.io/wire/tr/#katmanlar) OSI ve TCP/IP modellerini açıklar ve her katmanda sık kullanılan protokolleri kaynaklarına dayanarak özetler. HTTP/1.1, FTP, SMTP, POP3, IMAP ve SIP gibi metin tabanlı protokolleri de burada bulabilirsiniz. Eski `/wire/katmanlar/` adresi ana sayfaya yönlenir.

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
   - **IPv6 segment yönlendirme başlığı (RFC 8754)**: Yönlendirme türü 4 başlığı ve ters sırada yazılan segment listesi.
   - **IGMPv2 (RFC 2236)**: Çok noktaya yayın (multicast) grup üyeliği yönetimi ve üyelik raporları.
   - **IGMPv3 (RFC 9776)**: Kaynağa göre sınırlanabilen üyelik sorgusu.
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
   - **RTCP (RFC 3550)**: İletim istatistikleri ve eşzamanlama sağlayan Gönderici Raporu (Sender Report).
   - **SRTP (RFC 3711)**: Güvenli Gerçek Zamanlı Aktarım Protokolü; şifreleme, ileti kimlik doğrulama ve yeniden oynatma koruması.
   - **BFD (RFC 5880, RFC 5881)**: İki yönlü yönlendirme algılama ve alt-saniye bağlantı sürekliliği denetimi.
   - **STUN (RFC 8489)**: NAT geçişi için oturum araçları, ileti başlığı ve XOR-MAPPED-ADDRESS öznitelikleri.
   - **TLS 1.3 kaydı (RFC 9846)**: Kayıt katmanı başlığı, içerik türü, eski protokol sürümü ve şifreli kayıt yükü.
   - **WebSocket (RFC 6455)**: Temel çerçeveleme, işlem kodu (opcode), maskeleme ve yük uzunluğu.
   - **HTTP/2 çerçevesi (RFC 9113)**: 9 sekizlilik çerçeve başlığı, akış belirteci ve SETTINGS çerçevesi.
   - **HTTP/3 çerçevesi (RFC 9114)**: Değişken uzunluklu tamsayılarla tür ve uzunluk alanları, SETTINGS çerçevesi.
   - **SSH ikili paketi (RFC 4253, RFC 4251)**: Paket uzunluğu, dolgu uzunluğu, yük, rastgele dolgu ve MAC.
   - **SNMP GetBulkRequest PDU (RFC 3416, RFC 3417)**: SNMPv2c ileti sarmalayıcısı ve BER kodlamalı PDU.
   - **SMB2 ECHO isteği (MS-SMB2, yayımlanmış belirtimine karşı doğrulanır)**: Direct TCP taşıma başlığı, SMB2 SYNC başlığı ve küçük-endian alanlar.
   - **BGP OPEN iletisi (RFC 4271, RFC 5398)**: 19 sekizlilik ileti başlığı, AS numarası, Hold Time ve BGP Identifier.

Ayrıca [KILAVUZ.md](KILAVUZ.md) belgesi **IEEE 802.3, 802.1Q (VLAN), DHCPv4 (RFC 2131), DHCPv6 (RFC 8415), NDP (RFC 4861) ve ACD (RFC 5227)** protokollerini bayt bayt örnek çözümlemelerle açıklar.

---

## Eksiksiz RFC Başvuru Listesi

Sitedeki tüm bilgiler IETF RFC belgelerine (`sources/rfcs.json`) veya IEEE standartlarına (`sources/standards.json`) dayanır:

| RFC | Başlık ve Kapsam | wire'da Kullanımı |
|---|---|---|
| **RFC 768** | User Datagram Protocol | UDP başlığı ve sözde başlık yerleşimi. |
| **RFC 791** | Internet Protocol | IPv4 başlık alanları, parçalama ve yönlendirme parametreleri. |
| **RFC 792** | Internet Control Message Protocol | ICMP iletileri, türler, kodlar ve sağlama toplamı. |
| **RFC 826** | An Ethernet Address Resolution Protocol | ARP paket biçimi ve Ethernet iletim alanları. |
| **RFC 894** | Transmission of IP Datagrams over Ethernet | Ethernet II çerçevelerinde IP paketi kapsülleme (EtherType 0x0800). |
| **RFC 903** | A Reverse Address Resolution Protocol | RARP paket biçimi ve ters adres çözümleme mekanizması. |
| **RFC 959** | File Transfer Protocol (FTP) | Ana sayfa Katmanlar bölümü özeti (metin tabanlı protokol). |
| **RFC 1035** | Domain Names - Implementation and Specification | DNS başlık biçimi, bayraklar, soru ve yanıt kaynak kayıtları. |
| **RFC 1071** | Computing the Internet Checksum | 16 bitlik bire tümleyen sağlama toplamı algoritması. |
| **RFC 1122** | Requirements for Internet Hosts -- Communication Layers | Ana sayfadaki Katmanlar bölümünün dört TCP/IP katmanı. |
| **RFC 1901** | Introduction to Community-based SNMPv2 | SNMPv2c ileti sarmalayıcısı. |
| **RFC 1939** | Post Office Protocol - Version 3 | Ana sayfa Katmanlar bölümü özeti (metin tabanlı protokol). |
| **RFC 2131** | Dynamic Host Configuration Protocol | DHCPv4 ileti biçimi ve BOOTP ile paylaşılan sabit alanlar. |
| **RFC 2132** | DHCP Options and BOOTP Vendor Extensions | DHCP Message Type, Parameter Request List ve End seçenekleri. |
| **RFC 2236** | Internet Group Management Protocol, Version 2 | IGMPv2 ileti biçimi ve Max Response Time alanı. |
| **RFC 2328** | OSPF Version 2 | OSPFv2 ortak başlığı ve Hello paketi. |
| **RFC 2474** | Definition of the Differentiated Services Field (DS Field) | IPv4 ve IPv6'daki 6 bitlik DSCP alanı. |
| **RFC 2516** | A Method for Transmitting PPP Over Ethernet (PPPoE) | PPPoE Keşif (Discovery) ve PPP Oturum çerçeveleri. |
| **RFC 2606** | Reserved Top Level DNS Names | Belgeleme için ayrılmış alan adları (`example.com`). |
| **RFC 2784** | Generic Routing Encapsulation (GRE) | GRE temel başlığı ve RFC 2890 uzantıları. |
| **RFC 3032** | MPLS Label Stack Encoding | 32 bitlik MPLS etiket yığını girdisi (LSE). |
| **RFC 3168** | The Addition of Explicit Congestion Notification (ECN) to IP | 2 bitlik ECN alanı, TCP ECE ve CWR bayrakları. |
| **RFC 3416** | Version 2 of the Protocol Operations for the SNMP | GetBulkRequest PDU yapısı, non-repeaters ve max-repetitions. |
| **RFC 3417** | Transport Mappings for the Simple Network Management Protocol (SNMP) | SNMPv2c BER kodlaması ve UDP taşıması. |
| **RFC 3550** | RTP: A Transport Protocol for Real-Time Applications | RTP veri başlığı ve RTCP Sender Report paketleri. |
| **RFC 3551** | RTP Profile for Audio and Video Conferences with Minimal Control | Standart yük türleri (Payload Type). |
| **RFC 3711** | The Secure Real-time Transport Protocol (SRTP) | SRTP şifreli yük ve kimlik doğrulama etiketi. |
| **RFC 3849** | IPv6 Address Prefix Reserved for Documentation | Belgeleme için ayrılmış IPv6 adres bloğu (`2001:db8::/32`). |
| **RFC 4251** | The Secure Shell (SSH) Protocol Architecture | SSH ikili veri türleri. |
| **RFC 4253** | The Secure Shell (SSH) Transport Layer Protocol | SSH ikili paket biçimi. |
| **RFC 4271** | A Border Gateway Protocol 4 (BGP-4) | BGP-4 ortak başlığı ve OPEN ileti biçimi. |
| **RFC 4302** | IP Authentication Header | IPsec AH başlığı, SPI ve sıra numarası. |
| **RFC 4303** | IP Encapsulating Security Payload (ESP) | IPsec ESP başlığı, dolgu, Next Header ve ICV. |
| **RFC 4340** | Datagram Congestion Control Protocol (DCCP) | DCCP genel başlığı, Sequence Number ve seçenekler. |
| **RFC 4443** | Internet Control Message Protocol (ICMPv6) for IPv6 | ICMPv6 hata ve bilgi iletileri. |
| **RFC 4861** | Neighbor Discovery for IP version 6 (NDP) | Kılavuzdaki komşu keşif çözümlemeleri. |
| **RFC 4949** | Internet Security Glossary, Version 2 | Ana sayfadaki OSI yedi katman tanımı. |
| **RFC 5227** | IPv4 Address Conflict Detection (ACD) | Kılavuzdaki ARP Probe ve ARP Announcement çözümlemeleri. |
| **RFC 5398** | Autonomous System (AS) Numbers for Documentation Use | Belgeleme için ayrılmış AS numaraları (64496–64511). |
| **RFC 5462** | Multiprotocol Label Switching (MPLS) Label Stack Entry: "EXP" Field Renamed to "Traffic Class" Field | EXP alanının Traffic Class (TC) olarak yeniden adlandırılması. |
| **RFC 5737** | IPv4 Address Blocks Reserved for Documentation | Belgeleme için ayrılmış IPv4 adres blokları (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`). |
| **RFC 5880** | Bidirectional Forwarding Detection (BFD) | BFD kontrol paketi başlığı. |
| **RFC 5881** | Bidirectional Forwarding Detection (BFD) for IPv4 and IPv6 (Single Hop) | Tek atlamalı BFD UDP taşıma kuralları. |
| **RFC 5905** | Network Time Protocol Version 4: Protocol and Algorithms Specification | NTPv4 paket başlığı, zaman damgaları ve hesaplama modelleri. |
| **RFC 6325** | Routing Bridges (RBridges): Base Protocol Specification | 802.1Q VLAN etiketinin öncelik, DEI ve VLAN ID bitlerini yeniden çizer; VLAN sayfasında ikinci bir şema olarak atıf yapılır. |
| **RFC 6455** | The WebSocket Protocol | WebSocket temel çerçeveleme ve istemciden sunucuya maskeleme. |
| **RFC 7252** | The Constrained Application Protocol (CoAP) | CoAP IoT ileti başlığı ve ikili RESTful aktarım. |
| **RFC 7348** | Virtual eXtensible Local Area Network (VXLAN) | VXLAN L2-üzeri-L4 tünelleme başlığı ve VNI; iç çerçeve şeması 802.1Q etiketini de çizer. |
| **RFC 8200** | Internet Protocol, Version 6 (IPv6) Specification | Sabit 40 sekizli IPv6 başlığı, uzantı başlıkları ve sözde başlık. |
| **RFC 8415** | Dynamic Host Configuration Protocol for IPv6 (DHCPv6) | DHCPv6 istemci-sunucu iletisi ve seçenekleri. |
| **RFC 8489** | Session Traversal Utilities for NAT (STUN) | STUN ileti başlığı ve XOR-MAPPED-ADDRESS öznitelikleri. |
| **RFC 8754** | IPv6 Segment Routing Header (SRH) | Yönlendirme türü 4 başlığı ve segment listesi. |
| **RFC 8926** | Geneve: Generic Network Virtualization Encapsulation | Geneve tünel başlığı ve değişken seçenekler. |
| **RFC 9000** | QUIC: A UDP-Based Multiplexed and Secure Transport | QUIC Initial paketi ve değişken uzunluklu tamsayılar; RFC'nin şekil gösterimiyle doğrulanır. |
| **RFC 9001** | Using TLS to Secure QUIC | Başlık koruması ve Initial anahtarları. |
| **RFC 9051** | Internet Message Access Protocol (IMAP) - Version 4rev2 | Ana sayfa Katmanlar bölümü özeti (metin tabanlı protokol). |
| **RFC 9110** | HTTP Semantics | HTTP ve HTTPS şemaları, standart bağlantı noktaları. |
| **RFC 9112** | HTTP/1.1 | Ana sayfa Katmanlar bölümü özeti (metin tabanlı protokol). |
| **RFC 9113** | HTTP/2 | HTTP/2 çerçeve başlığı ve SETTINGS çerçevesi. |
| **RFC 9114** | HTTP/3 | HTTP/3 çerçeve yerleşimi ve SETTINGS çerçevesi, şekil gösterimiyle doğrulanır. |
| **RFC 9260** | Stream Control Transmission Protocol | SCTP ortak başlığı, çoklu akış ve 32-bit CRC-32c sağlama toplamı. |
| **RFC 9293** | Transmission Control Protocol (TCP) | RFC 793 ve modern TCP belirtimlerini birleştiren güncel TCP standardı. |
| **RFC 9542** | IANA Considerations for IEEE 802 Parameters | Belgeleme MAC adresleri (`00:00:5e:00:53:xx`). |
| **RFC 9568** | Virtual Router Redundancy Protocol (VRRP) Version 3 for IPv4 and IPv6 | VRRPv3 duyurusu ve IPv4 sağlama toplamı. |
| **RFC 9776** | Internet Group Management Protocol, Version 3 | IGMPv3 üyelik sorgusu (Membership Query). |
| **RFC 9846** | The Transport Layer Security (TLS) Protocol Version 1.3 | TLS 1.3 kayıt katmanı (RFC 8446'nın yerini almıştır). |

### IEEE standartları

IEEE metinleri lisanslıdır: depoya konmaz ve yeniden dağıtılmaz. `sources/standards.json` dosyasında belirtilen yolda lisanslı bir kopya bulunduğunda (`.cache/` altında) `npm run sync:ieee` komutu metni çıkarır, alan adlarını ve genişliklerini standardın ileti tablolarıyla karşılaştırır ve sonucu protokolün `layout.checked` kaydına işler. Kopyası olmayan derlemeler (CI gibi) veriyi bu kayda karşı denetler; atıf yapılan madde ve sayfa numaraları metin varken denetlenir. Bir RFC aynı alanları yeniden çiziyorsa sayfa o RFC'ye karşı doğrulanır.

| Standart | Başlık | wire'da Kullanımı |
|---|---|---|
| **IEEE 802.1Q-2022** | Bridges and Bridged Networks | VLAN etiketi: TPID (9.4, Table 9-1), TCI (9.6, Table 9-2), PCP ve DEI (6.9.3) ve trafik türleri (I.4, Table I-2); lisanslı bir kopyaya karşı doğrulanır. |
| **IEEE 802.1AB-2016** | Station and Media Access Control Connectivity Discovery | LLDPDU biçimi (8.2), temel TLV biçimi ve tür değerleri (8.4, Table 8-1), zorunlu TLV'ler (8.5.1–8.5.4), alt tür tabloları (Table 8-2, 8-3) ve txTTL (9.2.5.22); lisanslı bir kopyaya karşı doğrulanır. TLV figürleri PDF'te görüntü olduğu için yerleşim, aynı bilgiyi yazıyla ve tablolarla veren maddelerden okunur. 11.5.1'deki MIB modülleri de ayrıca denetlenir; PDF'ler gibi depo dışında tutulurlar. |
| **MS-SMB2 v20260928** | Server Message Block (SMB) Protocol Versions 2 and 3 (Microsoft Open Specifications) | Direct TCP başlığı, SMB2 SYNC başlığı ve ECHO isteği; yayımlanmış PDF'e karşı doğrulanır. Alanlar küçük-endian'dır. |
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
