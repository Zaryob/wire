# Ethernet Haberleşme Protokolleri, Paket Mimarisi ve RFC Kılavuzu

Bu kılavuz; tel üzerindeki (on the wire) fiziksel bit dizilimlerinden başlayarak Ethernet çerçevelerini, adres çözümleme protokollerini (ARP, RARP, NDP), ağ katmanı protokollerini (IPv4, IPv6, ICMP, ICMPv6), iletim katmanı protokollerini (TCP, UDP, SCTP) ve temel ağ yönetim/uygulama protokollerini (DNS, DHCP) bit ve sekizli (octet) düzeyinde, dayandıkları IETF RFC standartlarıyla birlikte derinlemesine açıklar.

---

## İçindekiler

1. [Ağ Mimarisi ve Kapsülleme (Encapsulation) Prensipleri](#1-ağ-mimarisi-ve-kapsülleme-encapsulation-prensipleri)
   - [OSI ve TCP/IP Katman Modelleri](#osi-ve-tcpip-katman-modelleri)
   - [Protokol Veri Birimleri (PDU) ve Kapsülleme Akışı](#protokol-veri-birimleri-pdu-ve-kapsülleme-akışı)
   - [Ağ Bayt Sıralaması (Network Byte Order / Big-Endian)](#ağ-bayt-sıralaması-network-byte-order--big-endian)
   - [RFC Standartlarında Bit Numaralandırması ve Şemalar](#rfc-standartlarında-bit-numaralandırması-ve-şemalar)
2. [Fiziksel ve Veri Bağlantı Katmanı: Ethernet Mimarisi](#2-fiziksel-ve-veri-bağlantı-katmanı-ethernet-mimarisi)
   - [Ethernet II (DIX) ve IEEE 802.3 Karşılaştırması](#ethernet-ii-dix-ve-ieee-8023-karşılaştırması)
   - [Ethernet Çerçevesinin Bit ve Sekizli Anatomisi](#ethernet-çerçevesinin-bit-ve-sekizli-anatomisi)
   - [MAC Adresi Yapısı (OUI, I/G ve U/L Bitleri)](#mac-adresi-yapısı-oui-ig-ve-ul-bitleri)
   - [Özel ve Ayrılmış MAC Adresleri (RFC 9542)](#özel-ve-ayrılmış-mac-adresleri-rfc-9542)
   - [MTU, Minimum Çerçeve Boyutu (64 Bayt Kuralı) ve Jumbo Frame](#mtu-minimum-çerçeve-boyutu-64-bayt-kuralı-ve-jumbo-frame)
   - [VLAN Etiketleme: IEEE 802.1Q ve 802.1ad (QinQ)](#vlan-etiketleme-ieee-8021q-ve-8021ad-qinq)
   - [PPPoE (PPP over Ethernet - RFC 2516)](#pppoe-ppp-over-ethernet---rfc-2516)
   - [IP Taşınması: RFC 894 ve RFC 1042 (LLC/SNAP)](#ip-taşınması-rfc-894-ve-rfc-1042-llcsnap)
3. [Adres Çözümleme Protokolleri](#3-adres-çözümleme-protokolleri)
   - [ARP (Address Resolution Protocol - RFC 826)](#arp-address-resolution-protocol---rfc-826)
   - [ARP İstek ve Yanıt Döngüsü](#arp-istek-ve-yanıt-döngüsü)
   - [Gratuitous ARP ve Adres Çakışma Tespiti (ACD - RFC 5227)](#gratuitous-arp-ve-adres-çakışma-tespiti-acd---rfc-5227)
   - [RARP (Reverse Address Resolution Protocol - RFC 903)](#rarp-reverse-address-resolution-protocol---rfc-903)
   - [IPv6 Karşılığı: Neighbor Discovery Protocol (NDP - RFC 4861)](#ipv6-karşılığı-neighbor-discovery-protocol-ndp---rfc-4861)
4. [Ağ / İnternet Katmanı Protokolleri](#4-ağ--internet-katmanı-protokolleri)
   - [IPv4 (Internet Protocol Version 4 - RFC 791)](#ipv4-internet-protocol-version-4---rfc-791)
   - [Hizmet Türü Evrimi: ToS, DiffServ (RFC 2474) ve ECN (RFC 3168)](#hizmet-türü-evrimi-tos-diffserv-rfc-2474-ve-ecn-rfc-3168)
   - [IPv4 Parçalama (Fragmentation) ve Yeniden Birleştirme](#ipv4-parçalama-fragmentation-ve-yeniden-birleştirme)
   - [IPv6 (Internet Protocol Version 6 - RFC 8200)](#ipv6-internet-protocol-version-6---rfc-8200)
   - [IPv4 ve IPv6 Başlık Karşılaştırması](#ipv4-ve-ipv6-başlık-karşılaştırması)
   - [IPv6 Uzantı Başlıkları (Extension Headers)](#ipv6-uzantı-başlıkları-extension-headers)
   - [ICMPv4 (Internet Control Message Protocol - RFC 792)](#icmpv4-internet-control-message-protocol---rfc-792)
   - [ICMPv6 (RFC 4443)](#icmpv6-rfc-4443)
5. [İletim Katmanı Protokolleri](#5-iletim-katmanı-protokolleri)
   - [UDP (User Datagram Protocol - RFC 768)](#udp-user-datagram-protocol---rfc-768)
   - [TCP (Transmission Control Protocol - RFC 9293)](#tcp-transmission-control-protocol---rfc-9293)
   - [TCP Bayrakları (Flags) ve Kontrol Bitleri](#tcp-bayrakları-flags-ve-kontrol-bitleri)
   - [TCP 3 Aşamalı Bağlantı Kurulumu (3-Way Handshake)](#tcp-3-aşamalı-bağlantı-kurulumu-3-way-handshake)
   - [TCP Bağlantı Sonlandırma (4-Way Teardown)](#tcp-bağlantı-sonlandırma-4-way-teardown)
   - [TCP Durum Makinesi (State Machine)](#tcp-durum-makinesi-state-machine)
   - [TCP Seçenekleri (MSS, Window Scale, SACK, Timestamps)](#tcp-seçenekleri-mss-window-scale-sack-timestamps)
   - [SCTP (Stream Control Transmission Protocol - RFC 9260)](#sctp-stream-control-transmission-protocol---rfc-9260)
6. [Uygulama ve Ağ Yapılandırma Protokolleri](#6-uygulama-ve-ağ-yapılandırma-protokolleri)
   - [DNS (Domain Name System - RFC 1035)](#dns-domain-name-system---rfc-1035)
   - [DHCPv4 (RFC 2131) ve BOOTP (RFC 951)](#dhcpv4-rfc-2131-ve-bootp-rfc-951)
   - [DHCPv6 (RFC 8415)](#dhcpv6-rfc-8415)
7. [İnternet Sağlama Toplamı (Checksum) Hesaplama Algoritması](#7-i̇nternet-sağlama-toplamı-checksum-hesaplama-algoritması)
   - [RFC 1071 Bire Tümleyen Toplamı Mantığı](#rfc-1071-bire-tümleyen-toplamı-mantığı)
   - [Sözde Başlık (Pseudo-Header) Yapısı](#sözde-başlık-pseudo-header-yapısı)
   - [Ethernet CRC-32 (FCS) Hesaplaması](#ethernet-crc-32-fcs-hesaplaması)
8. [Bütün Temel Ağ RFC’lerinin Kapsamlı Kataloğu](#8-bütün-temel-ağ-rfclerinin-kapsamlı-kataloğu)
9. [Uçtan Uca Paket Analizleri ve Onaltılık (Hex) İncelemeler](#9-uçtan-uca-paket-analizleri-ve-onaltılık-hex-i̇ncelemeler)
   - [Örnek 1: Ethernet Üzerinde ARP İstek Paketi](#örnek-1-ethernet-üzerinde-arp-i̇stek-paketi)
   - [Örnek 2: Ethernet + IPv4 + UDP + DNS Sorgu Paketi](#örnek-2-ethernet--ipv4--udp--dns-sorgu-paketi)
   - [Örnek 3: Ethernet + IPv4 + TCP SYN Paketi](#örnek-3-ethernet--ipv4--tcp-syn-paketi)
   - [Örnek 4: Ethernet + IPv6 + ICMPv6 Echo İsteği](#örnek-4-ethernet--ipv6--icmpv6-echo-i̇steği)
   - [Örnek 5: 802.1Q VLAN Etiketli Ethernet Çerçevesi](#örnek-5-8021q-vlan-etiketli-ethernet-çerçevesi)
10. [Ağ Analizi ve Paket İnceleme Araçları Rehberi](#10-ağ-analizi-ve-paket-i̇nceleme-araçları-rehberi)
11. [Tüm Katmanlardaki Protokollerin Araştırması ve wire Genişleme Yol Haritası](#11-tüm-katmanlardaki-protokollerin-araştırması-ve-wire-genişleme-yol-haritası)
    - [Protokol Uygunluk ve Kabul Kriterleri](#protokol-uygunluk-ve-kabul-kriterleri)
    - [Katman Katman Aday Protokoller](#katman-katman-aday-protokoller)
    - [Önceliklendirme ve Uygulama Matrisi](#önceliklendirme-ve-uygulama-matrisi)

---

## 1. Ağ Mimarisi ve Kapsülleme (Encapsulation) Prensipleri

### OSI ve TCP/IP Katman Modelleri

Bilgisayar ağları karmaşık donanım ve yazılım bileşenlerini yönetilebilir kılmak için katmanlı mimarilere bölünmüştür. İki ana model referans alınır:

| Katman No | OSI Referans Modeli | TCP/IP (İnternet) Modeli | Protokol Örnekleri | Donanım / Birim |
|---|---|---|---|---|
| **7** | Uygulama (Application) | Uygulama | HTTP, DNS, DHCP, SSH, NTP | Yazılım / Süreç |
| **6** | Sunum (Presentation) | Uygulama | TLS, ASCII, JSON | Yazılım / Kütüphane |
| **5** | Oturum (Session) | Uygulama | RPC, NetBIOS, Sockets | İşletim Sistemi API |
| **4** | İletim (Transport) | İletim (Transport) | TCP, UDP, SCTP, QUIC | Çekirdek (Kernel) Portları |
| **3** | Ağ (Network) | Ağ (İnternet) | IPv4, IPv6, ICMP, ICMPv6, IPsec | Yönlendirici (Router), L3 Anahtar |
| **2** | Veri Bağlantısı (Data Link) | Bağlantı (Link / Network Access) | Ethernet, 802.11 Wi-Fi, ARP, PPP | Anahtar (Switch), NIC, Köprü |
| **1** | Fiziksel (Physical) | Bağlantı (Link / Network Access) | 1000BASE-T, Fiber Optik, Bakır Kablo | Hub, Alıcı-Verici (PHY) |

### Protokol Veri Birimleri (PDU) ve Kapsülleme Akışı

Veri üst katmandan alt katmana doğru inerken her katman verinin başına kendi denetim bilgilerini içeren bir **başlık (header)** ve bazı durumlarda sonuna bir **kuyruk (trailer/FCS)** ekler. Bu işleme **kapsülleme (encapsulation)** denir. Karşı tarafta alıcı makine veriyi aldığında alt katmandan yukarıya doğru başlıkları soyarak ilerler; bu işleme ise **kapsül açma (de-encapsulation)** denir.

```
+-----------------------------------------------------------------------------------------+
| Uygulama Verisi (Örn. HTTP GET / DNS Query)                                             |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v [L4 İletim Katmanı]
+-------------------+---------------------------------------------------------------------+
| TCP / UDP Başlığı | Uygulama Verisi (TCP/UDP Payload)                                   | -> SEGMENT / DATAGRAM
+-------------------+---------------------------------------------------------------------+
                                           |
                                           v [L3 Ağ Katmanı]
+---------------+-------------------+-----------------------------------------------------+
| IPv4 / IPv6   | TCP / UDP Başlığı | Uygulama Verisi                                     | -> PAKET / DATAGRAM
| Başlığı       |                   |                                                     |
+---------------+-------------------+-----------------------------------------------------+
                                           |
                                           v [L2 Veri Bağlantı Katmanı]
+----------+---------------+-------------------+------------------+-------+---------------+
| Ethernet | IPv4 / IPv6   | TCP / UDP Başlığı | Uygulama Verisi  | Dolgu | FCS (CRC-32)  | -> ÇERÇEVE (FRAME)
| Başlığı  | Başlığı       |                   |                  | (pad) | (Kuyruk)      |
+----------+---------------+-------------------+------------------+-------+---------------+
```

### Ağ Bayt Sıralaması (Network Byte Order / Big-Endian)

İnternet protokollerinde çok baytlı sayısal alanların (16-bit port numaraları, 32-bit IP adresleri, 32-bit sequence numaraları vb.) iletimi **Network Byte Order** olarak adlandırılan **Big-Endian** (büyük sonlu) kuralına göredir.

- **Big-Endian**: En anlamlı bayt (Most Significant Byte - MSB) bellekte en düşük adreste saklanır ve hat üzerinden ilk iletilen bayt olur.
- **Little-Endian**: En anlamsız bayt (Least Significant Byte - LSB) en düşük adreste saklanır (x86 ve ARM mimarilerinde yaygındır).

Örnek: `0x1234` (onluk 4660) port numarası tel üzerine `0x12` ardından `0x34` olarak aktarılır:
```c
uint16_t port = 80; // 0x0050
uint16_t net_port = htons(port); // Host to Network Short
```

### RFC Standartlarında Bit Numaralandırması ve Şemalar

IETF RFC belgelerinde (özellikle RFC 791, RFC 792, RFC 793, RFC 8200) başlık şemaları genellikle 32 bitlik sıralar halinde çizilir. Standart IETF konvansiyonunda:
- **Bit 0**: En yüksek basamaklı (en anlamlı / MSB) bittir ve tel üzerinden ilk iletilen bittir.
- **Bit 31**: En düşük basamaklı (en anlamsız / LSB) bittir.

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       32 Bitlik Alan                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

---

## 2. Fiziksel ve Veri Bağlantı Katmanı: Ethernet Mimarisi

### Ethernet II (DIX) ve IEEE 802.3 Karşılaştırması

Tarihsel olarak iki temel Ethernet biçimi ortaya çıkmıştır:
1. **Ethernet II (DIX v2)**: Digital Equipment Corporation, Intel ve Xerox konsorsiyumu tarafından geliştirilen ve RFC 894 ile İnternet protokollerinin fiili taşıyıcısı olan biçim.
2. **IEEE 802.3**: IEEE standardizasyon komitesinin geliştirdiği, LLC (802.2) ve SNAP başlıklarıyla genişletilen biçim.

İkisi arasındaki en temel fark 12. ve 13. baytlardaki alandır:
- Değer **$\ge$ 1536 (0x0600)** ise: Bu alan bir **EtherType**'tır (Ethernet II çerçevesi). Taşınan üst katman protokolünü (IPv4, ARP, IPv6 vb.) doğrudan belirtir.
- Değer **$\le$ 1500 (0x05DC)** ise: Bu alan çerçevenin yük **Uzunluğunu (Length)** gösterir (IEEE 802.3 çerçevesi). Üst protokolü belirlemek için ardından 3 baytlık LLC ve 5 baytlık SNAP başlığı (RFC 1042) gelir.

İnternet trafiğinin %99'undan fazlası **Ethernet II (RFC 894)** standardını kullanır.

### Ethernet Çerçevesinin Bit ve Sekizli Anatomisi

Tel üzerinde fiziksel bir Ethernet çerçevesi şu bileşenlerden oluşur:

```text
+---------------------+-------------------+---------------------+---------------+-------------------+----------------------+--------------------+
| Preamble (Öntakı)   | SFD               | Hedef MAC Adresi    | Kaynak MAC    | EtherType         | Veri Yükü (Payload)  | FCS (CRC-32)       |
| 7 sekizli (56 bit)  | 1 sekizli (8 bit) | 6 sekizli (48 bit)  | 6 sekizli     | 2 sekizli (16 bit)| 46 - 1500 sekizli    | 4 sekizli (32 bit) |
+---------------------+-------------------+---------------------+---------------+-------------------+----------------------+--------------------+
|<------- Fiziksel Katman (L1) ---------->|<------------------------- Veri Bağlantı Katmanı (L2) -------------------------->|
```

1. **Preamble (Öntakı - 7 Sekizli / 56 Bit)**: Alıcı ağ kartının (NIC) saat frekansını gelen sinyalle eşitlemesi (bit senkronizasyonu) için ardışık `10101010` (0xAA) bit örüntüsü.
2. **SFD (Start Frame Delimiter - 1 Sekizli / 8 Bit)**: `10101011` (0xAB) örüntüsüdür. Son iki bitin `11` olması çerçevenin gerçek verisinin bir sonraki bitten itibaren başladığını donanıma bildirir.
3. **Hedef MAC Adresi (6 Sekizli / 48 Bit)**: Çerçevenin iletildiği alıcı istasyonun donanım adresi.
4. **Kaynak MAC Adresi (6 Sekizli / 48 Bit)**: Çerçeveyi üreten ve hatta bırakan arayüzün donanım adresi.
5. **EtherType (2 Sekizli / 16 Bit)**: Yükte taşınan L3 protokolünü tanımlar:
   - `0x0800`: IPv4 (Internet Protocol version 4 - RFC 894)
   - `0x0806`: ARP (Address Resolution Protocol - RFC 826)
   - `0x86DD`: IPv6 (Internet Protocol version 6 - RFC 2464)
   - `0x8100`: IEEE 802.1Q VLAN Tagged Frame
   - `0x8863`: PPPoE Discovery Stage (RFC 2516)
   - `0x8864`: PPPoE Session Stage (RFC 2516)
   - `0x88A8`: IEEE 802.1ad Service VLAN (QinQ)
6. **Veri Yükü (Payload - 46 ile 1500 Sekizli)**: Taşınan paket (örneğin IPv4 datagramı veya ARP iletisi).
7. **Dolgu (Padding - 0 ila 46 Sekizli)**: Eğer veri yükü 46 sekizliden küçükse (örneğin 28 sekizlilik bir ARP paketi), çerçeve toplam 64 sekizliye ulaşana kadar sıfırlarla doldurulur.
8. **FCS (Frame Check Sequence - 4 Sekizli / 32 Bit)**: Hedef MAC'ten Veri Yükünün sonuna kadar olan kısmı koruyan CRC-32 sağlama toplamı.

### MAC Adresi Yapısı (OUI, I/G ve U/L Bitleri)

48 bitlik (6 sekizli) bir MAC adresi 16'lık düzende `XX:XX:XX:XX:XX:XX` olarak yazılır. İlk 3 sekizli (24 bit) üreticiyi, son 3 sekizli ise benzersiz cihazı temsil eder. İlk sekizlinin en düşük basamaklı iki biti özel anlamlara sahiptir:

```text
Sekizli 0: [ b7 | b6 | b5 | b4 | b3 | b2 | b1 (U/L) | b0 (I/G) ]
```

- **b0 - I/G Biti (Individual / Group)**:
  - `0`: Bireysel (Individual / Unicast) adres. Belirli tek bir arayüzü gösterir.
  - `1`: Grup (Group / Multicast veya Broadcast) adresi. Birden fazla alıcıyı hedefler.
- **b1 - U/L Biti (Universal / Local)**:
  - `0`: Evrensel (Universally Administered). IEEE tarafından OUI kapsamında üreticiye atanmıştır.
  - `1`: Yerel (Locally Administered). Ağ yöneticisi veya sanallaştırma yazılımı tarafından atanmıştır.

### Özel ve Ayrılmış MAC Adresleri (RFC 9542)

- **Yayın (Broadcast) Adresi**: `ff:ff:ff:ff:ff:ff` (tüm 48 bit `1`). Yerel ağdaki bütün anahtarlar bu çerçeveyi tüm portlarına çoğaltır.
- **IPv4 Çok Noktaya Yayın (Multicast - RFC 1112)**: `01:00:5e:00:00:00` ile `01:00:5e:7f:ff:ff` aralığı. 28 bitlik IPv4 multicast grubunun alt 23 biti MAC adresinin son 23 bitine kopyalanır.
- **IPv6 Çok Noktaya Yayın (Multicast - RFC 2464)**: `33:33:xx:xx:xx:xx` öneki. IPv6 multicast adresinin son 32 biti MAC adresinin son 32 bitine doğrudan eşlenir.
- **Belgeleme MAC Adresleri (RFC 9542 §2.1.4)**: `00:00:5e:00:53:00` - `00:00:5e:00:53:ff`. Eğitim ve belgelendirmede gerçek donanımlarla çakışmaması için IANA tarafından ayrılmıştır.

### MTU, Minimum Çerçeve Boyutu (64 Bayt Kuralı) ve Jumbo Frame

1. **Minimum Çerçeve Boyutu (64 Bayt)**:
   - Klasik Ethernet'te paylaşımlı veri yolunda (CSMA/CD) çarpışma algılama penceresi (slot time) 512 bit (64 bayt) süresidir.
   - Bir verici hattın en uzak ucundaki çarpışmayı henüz iletimi bitmeden algılayabilmek için en az 64 bayt (Hedef MAC [6] + Kaynak MAC [6] + EtherType [2] + Veri [46] + FCS [4]) göndermek zorundadır. Bu nedenle veri 46 bayttan küçükse dolgu yapılır.
2. **Standart MTU (1500 Bayt)**:
   - Ethernet II için standart Azami İletim Birimi (Maximum Transmission Unit - MTU) 1500 sekizlidir.
   - Bu değer L3 paketinin (IPv4 başlığı + yük) alabileceği en büyük boyuttur. Çerçevenin kendisi 1500 + 14 (başlık) + 4 (FCS) = 1518 bayt olur.
3. **Jumbo Frame**:
   - Modern Gigabit ve 10G ağlarda kesinti (interrupt) sayısını ve CPU yükünü azaltmak için MTU değeri 9000 bayta kadar çıkarılabilir. Uçtan uca tüm anahtar ve arayüzlerin desteklemesi gerekir.

### VLAN Etiketleme: IEEE 802.1Q ve 802.1ad (QinQ)

Yerel ağları mantıksal olarak izole etmek için Ethernet başlığına 4 baytlık bir etiket (VLAN Tag) eklenir:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       TPID (0x8100)           | PCP |D|        VID            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **TPID (Tag Protocol Identifier - 16 bit)**: `0x8100` değeri bu çerçevenin 802.1Q etiketli olduğunu gösterir.
- **TCI (Tag Control Information - 16 bit)**:
  - **PCP (Priority Code Point - 3 bit)**: IEEE 802.1p Hizmet Kalitesi (QoS / CoS) öncelik seviyesi (0-7).
  - **DEI (Drop Eligible Indicator - 1 bit)**: Tıkanıklık anında paketin ilk elenebilir olup olmadığını belirtir.
  - **VID (VLAN Identifier - 12 bit)**: Paketin ait olduğu sanal ağ kimliği (0 ve 4095 ayrılmıştır; 1-4094 arası kullanılır).

**QinQ (IEEE 802.1ad)**: Servis sağlayıcı ağlarında müşteri VLAN'larını korumak için çifte etiketleme yapılır; dış etiket EtherType olarak `0x88A8` taşır.

### PPPoE (PPP over Ethernet - RFC 2516)

Genişbant DSL ve fiber optik erişimlerde kullanıcı kimlik doğrulaması (PAP/CHAP) ve oturum yönetimi sağlamak amacıyla PPP paketleri Ethernet çerçevelerine gömülür.

- **Keşif Aşaması (Discovery Stage - EtherType 0x8863)**:
  1. **PADI** (PPPoE Active Discovery Initiation): İstemci yayın (broadcast) ile erişim sunucusu arar.
  2. **PADO** (PPPoE Active Discovery Offer): Sunucular teklif döner.
  3. **PADR** (PPPoE Active Discovery Request): İstemci bir sunucuyu seçip istek gönderir.
  4. **PADS** (PPPoE Active Discovery Session-confirmation): Sunucu benzersiz bir Oturum Kimliği (Session ID) tahsis eder.
  5. **PADT** (PPPoE Active Discovery Terminate): Oturumu sonlandırma iletisi.
- **Oturum Aşaması (Session Stage - EtherType 0x8864)**:
  - PPPoE Başlığı: Sürüm (4 bit), Tür (4 bit), Kod (8 bit), Session ID (16 bit), Yük Uzunluğu (16 bit).
  - PPPoE başlığı (6 bayt) ve PPP protokol kimliği (2 bayt) toplam 8 bayt ek yük getirdiğinden, standart Ethernet MTU'su (1500) üzerinde taşınan IP paketleri için azami MTU **1492 bayt** olur.

### IP Taşınması: RFC 894 ve RFC 1042 (LLC/SNAP)

- **RFC 894 (Standart Ethernet II Kapsüllemesi)**:
  - IP datagramı doğrudan Ethernet tür alanının (0x0800) arkasına yerleştirilir. Sade, hızlı ve modern ağların mutlak standardıdır.
- **RFC 1042 (IEEE 802 Ağlarında IP Kapsüllemesi)**:
  - 802.3 uzunluk alanının ardından 802.2 LLC başlığı (DSAP=0xAA, SSAP=0xAA, Control=0x03) ve 5 baytlık SNAP başlığı (OUI=0x000000, EtherType=0x0800) eklenir. Günümüzde geriye dönük uyumluluk dışında nadiren kullanılır.

---

## 3. Adres Çözümleme Protokolleri

### ARP (Address Resolution Protocol - RFC 826)

Bir ana bilgisayar yerel ağdaki (L2 broadcast etki alanı) bir başka cihaza IP paketi göndermek istediğinde, hedefin mantıksal IP adresini bilir ancak Ethernet çerçevesinin hedef alanına yazacağı 48 bitlik fiziksel MAC adresini bilmez. Bu eşlemeyi dinamik olarak yapan protokol **ARP (RFC 826)**'dır.

#### ARP Paket Formatı (RFC 826)

Ethernet üzerinde IPv4 için kullanılan ARP paketi 28 sekizlidir:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    Donanım Türü (ar$hrd)      |    Protokol Türü (ar$pro)     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  HLN (ar$hln) |  PLN (ar$pln) |      İşlem Kodu (ar$op)       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                  Gönderen Donanım Adresi (ar$sha)             |
|                            (ilk 32 bit)                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Gönderen Donanım (son 16 bit) | Gönderen Protokol Adresi      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+         (ar$spa)              |
|        (son 16 bit)           |      (ilk 16 bit)             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Hedef Donanım Adresi (ar$tha)               |
|                            (ilk 32 bit)                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Hedef Donanım (son 16 bit)   |  Hedef Protokol Adresi        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+         (ar$tpa)              |
|        (son 16 bit)           |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-------------------------------+
```

1. **Donanım Türü (`ar$hrd` - 16 bit)**: Bağlantı katmanı protokolü türü. Ethernet için değeri `1`'dir.
2. **Protokol Türü (`ar$pro` - 16 bit)**: Çözümlenen üst katman protokolü. IPv4 için `0x0800`.
3. **Donanım Adres Uzunluğu (`ar$hln` - 8 bit)**: Sekizli cinsinden uzunluk. MAC için `6`.
4. **Protokol Adres Uzunluğu (`ar$pln` - 8 bit)**: Sekizli cinsinden uzunluk. IPv4 için `4`.
5. **İşlem Kodu (`ar$op` - 16 bit)**:
   - `1`: ARP İsteği (Request)
   - `2`: ARP Yanıtı (Reply)
   - `3`: RARP İsteği (Request Reverse)
   - `4`: RARP Yanıtı (Reply Reverse)
6. **Gönderen Donanım Adresi (`ar$sha` - 48 bit)**: İstek veya yanıtı gönderen cihazın MAC adresi.
7. **Gönderen Protokol Adresi (`ar$spa` - 32 bit)**: Gönderen cihazın IPv4 adresi.
8. **Hedef Donanım Adresi (`ar$tha` - 48 bit)**: İstek paketinde bilinmediği için `00:00:00:00:00:00` yazılır; yanıt paketinde sorgulayanın MAC adresi yer alır.
9. **Hedef Protokol Adresi (`ar$tpa` - 32 bit)**: MAC adresi aranan hedef IPv4 adresi.

### ARP İstek ve Yanıt Döngüsü

1. **İstek (Request)**: Kaynak makine hedef MAC'i bilmediğinden Ethernet başlığındaki hedef adresi `ff:ff:ff:ff:ff:ff` (Yayın / Broadcast) yapar. Ağdaki tüm makineler paketi alır ve inceler.
2. **Yanıt (Reply)**: `ar$tpa` alanındaki IP adresine sahip olan cihaz paketi tanır, kendi yerel ARP tablosuna gönderenin MAC ve IP eşleşmesini kaydeder. Ardından kaynak makinenin MAC adresini doğrudan hedef alarak tek noktaya yayın (**Unicast**) bir ARP Yanıtı (`ar$op = 2`) gönderir.
3. **ARP Önbelleği (ARP Cache)**: Sürekli yayın trafiği oluşmaması için öğrenilen eşlemeler belirli bir yaşam süresiyle (TTL / aging timer, genelde 60-300 saniye) yerel bellekte tutulur.

### Gratuitous ARP ve Adres Çakışma Tespiti (ACD - RFC 5227)

- **Gratuitous ARP (G-ARP)**: Bir cihazın hedef IP (`ar$tpa`) alanına kendi IP adresini yazarak ağa yayınladığı özel bir ARP isteğidir.
  - **Kullanım 1 - IP Çakışma Tespiti**: Eğer ağda aynı IP'yi kullanan başka bir cihaz varsa yanıt döner; böylece cihaz IP çakışması olduğunu anlar.
  - **Kullanım 2 - MAC Tablosu Güncellemesi**: Yedekli çalışan sunucu veya güvenlik duvarlarında (VRRP/CARP) aktif cihaz değiştiğinde (failover), anahtarların (switch) port-MAC eşleme tablolarını anında güncellemesi için gönderilir.
- **RFC 5227 (IPv4 Address Conflict Detection)**:
  - **ARP Probe**: `ar$spa` alanı `0.0.0.0` yapılarak gönderilen sessiz kontrol isteği.
  - **ARP Announcement**: Adresin başarıyla alındığını ve sahiplenildiğini ağa duyuran bildirim.

### RARP (Reverse Address Resolution Protocol - RFC 903)

Sabit diski bulunmayan terminallerin (diskless workstations) açılışta ROM'larındaki MAC adresini bilip, kendilerine atanmış IP adresini bir RARP sunucusundan sorgulaması için geliştirilmiştir (`ar$op = 3 ve 4`). Yalnızca L2 seviyesinde çalıştığı, yönlendiricilerden geçemediği ve alt ağ maskesi/ağ geçidi gibi bilgileri veremediği için yerini önce **BOOTP (RFC 951)**, ardından **DHCP (RFC 2131)** protokolüne bırakmıştır.

### IPv6 Karşılığı: Neighbor Discovery Protocol (NDP - RFC 4861)

IPv6 mimarisinde yayın (broadcast) kavramı tamamen kaldırılmıştır. ARP yerine ICMPv6 tabanlı **NDP (Neighbor Discovery Protocol - RFC 4861)** kullanılır:
- **Neighbor Solicitation (NS - ICMPv6 Type 135)**: Hedef adresin Solicited-Node Multicast grubuna (`ff02::1:ffxx:xxxx`) gönderilir.
- **Neighbor Advertisement (NA - ICMPv6 Type 136)**: Hedefin MAC adresini içeren unicast yanıt.
- **SLAAC ve Router Discovery**: Yönlendiriciler **RA (Router Advertisement - Type 134)** mesajlarıyla ağ önekini duyurur; istemciler DHCP sunucusuna ihtiyaç duymadan otomatik adres yapılandırması (Stateless Address Autoconfiguration - RFC 4862) yapabilir.

---

## 4. Ağ / İnternet Katmanı Protokolleri

### IPv4 (Internet Protocol Version 4 - RFC 791)

IPv4, paketlerin kaynak ana bilgisayardan hedef ana bilgisayara mantıksal adresler üzerinden yönlendirilmesini (routing) sağlayan bağlantısız ve güvenilmez (best-effort) bir protokoldür.

#### IPv4 Başlık Anatomisi (RFC 791 §3.1)

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |        Header Checksum        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options                    |    Padding    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

1. **Version (4 bit)**: Protokol sürümü. IPv4 için değeri her zaman `4`'tür (`0100`).
2. **IHL (Internet Header Length - 4 bit)**: Başlığın 32 bitlik sözcük (word / 4 bayt) cinsinden uzunluğu.
   - Seçenek içermeyen en kısa başlık için değer `5`'tir ($5 \times 4 = 20$ sekizli).
   - Azami değer `15`'tir ($15 \times 4 = 60$ sekizli).
3. **Type of Service (ToS - 8 bit)**: Tarihsel olarak öncelik ve gecikme/verim tercihlerini tutardı. Günümüzde RFC 2474 (DiffServ) ve RFC 3168 (ECN) olarak yeniden tanımlanmıştır.
4. **Total Length (16 bit)**: Başlık ve veri yükü dahil tüm IPv4 datagramının sekizli cinsinden uzunluğu. Teorik üst sınır $2^{16} - 1 = 65.535$ sekizlidir.
5. **Identification (16 bit)**: Parçalanmış (fragmented) bir datagramın tüm parçalarını hedefte bir araya getirmek için kaynak tarafından atanan benzersiz kimlik numarası.
6. **Flags (3 bit)**:
   - **Bit 0**: Ayrılmıştır; her zaman `0` olmalıdır.
   - **Bit 1 - DF (Don't Fragment)**: `1` ise ara yönlendiriciler bu paketi parçalayamaz. Paket bir bağlantının MTU'sundan büyükse yönlendirici paketi düşürür ve geriye ICMP Type 3 Code 4 ("Fragmentation Needed") hatası döner (PMTUD temeli).
   - **Bit 2 - MF (More Fragments)**: `1` ise bu parçadan sonra başka parçaların da geleceğini gösterir. `0` ise bu parça son parçadır (veya paket hiç parçalanmamıştır).
7. **Fragment Offset (13 bit)**: Bu parçadaki verinin, orijinal datagram veri yükü içindeki başlangıç konumunu **8 sekizli** biriminde belirtir.
8. **Time to Live (TTL - 8 bit)**: Paketin ağda sonsuz döngüye girmesini engelleyen sayaç. Her yönlendirici paketi iletirken TTL değerini en az 1 azaltır. Değer `0`'a ulaştığında paket imha edilir ve kaynak cihaza ICMP Type 11 ("Time Exceeded") iletilir.
9. **Protocol (8 bit)**: IP verisinde taşınan üst katman protokolü:
   - `1`: ICMP (RFC 792)
   - `2`: IGMP (RFC 1112 / RFC 2236)
   - `6`: TCP (RFC 9293)
   - `17`: UDP (RFC 768)
   - `41`: IPv6 Kapsülleme (6to4)
   - `47`: GRE (Generic Routing Encapsulation)
   - `50`: ESP (IPsec Şifreleme)
   - `51`: AH (IPsec Kimlik Doğrulama)
   - `89`: OSPF (Open Shortest Path First)
10. **Header Checksum (16 bit)**: Yalnızca IPv4 başlığını kapsayan RFC 1071 sağlama toplamı. TTL her sekmede azaldığından her yönlendiricide yeniden hesaplanır.
11. **Source Address (32 bit)**: Gönderenin IPv4 adresi.
12. **Destination Address (32 bit)**: Alıcının IPv4 adresi.
13. **Options & Padding (Değişken)**: Güvenlik, kaynak yönlendirme (source routing), zaman damgası gibi test ve hata ayıklama alanları. Başlık uzunluğu 32 bitin katı olacak şekilde sıfır dolgusu yapılır.

### Hizmet Türü Evrimi: ToS, DiffServ (RFC 2474) ve ECN (RFC 3168)

Sekiz bitlik bu alan modern internet standartlarında ikiye ayrılmıştır:

```text
 0   1   2   3   4   5   6   7
+---+---+---+---+---+---+---+---+
|         DSCP          |  ECN  |
+---+---+---+---+---+---+---+---+
```

1. **DSCP (Differentiated Services Code Point - 6 bit, RFC 2474)**:
   - Paketlerin yönlendiricilerdeki kuyruklarda önceliklendirilmesini (QoS) sağlar.
   - Örnek sınıflar: `CS0` (Varsayılan / Best Effort), `EF` (Expedited Forwarding - ses/VoIP için gecikmesiz iletim: kod 46), `AFxx` (Assured Forwarding - video ve kritik veri sınıfları).
2. **ECN (Explicit Congestion Notification - 2 bit, RFC 3168)**:
   - Yönlendiricilerin paket düşürmeden (packet drop) uç noktalara ağda tıkanıklık başladığını bildirmesini sağlar.
   - Değerler:
     - `00`: ECN Desteklenmiyor (Non-ECT)
     - `01`: ECN Yetenekli İletim (ECT(1))
     - `10`: ECN Yetenekli İletim (ECT(0))
     - `11`: Tıkanıklık Yaşandı (Congestion Experienced - CE). Yönlendirici bu biti 11 yaparak hedefe ulaştırır; alıcı TCP başlığındaki ECE bayrağıyla kaynağı uyarır.

### IPv4 Parçalama (Fragmentation) ve Yeniden Birleştirme

Bir yönlendirici, gelen bir paketi MTU değeri daha küçük olan bir hatta iletmek zorunda kaldığında (ve DF biti 0 ise) paketi parçalara ayırır:
- Orijinal IP başlığı kopyalanır (bazı seçenekler hariç).
- Veri yükü MTU sınırına sığacak şekilde 8 sekizlinin katı olan bloklara bölünür.
- Her parçaya orijinal paketin `Identification` değeri verilir.
- `Fragment Offset` parçanın başladığı 8 baytlık birimi gösterir.
- Son parça hariç tüm parçalarda `MF = 1` yapılır; son parçada `MF = 0` olur.
- **Yeniden Birleştirme**: Parçalar ara yönlendiricilerde değil, **yalnızca nihai hedef ana bilgisayarda** birleştirilir. Parçalardan biri bile kaybolsa tüm datagram düşürülür.

### IPv6 (Internet Protocol Version 6 - RFC 8200)

IPv4 adreslerinin tükenmesi ve yönlendirici başlık işleme verimliliğini maksimize etmek amacıyla geliştirilen yeni nesil protokoldür.

#### IPv6 Sabit Başlık Anatomisi (RFC 8200 §3)

IPv6 başlığı kesinlikle **sabit 40 sekizli (320 bit)** uzunluğundadır:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Traffic Class |           Flow Label                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Payload Length        |  Next Header  |   Hop Limit   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                         Source Address                        +
|                           (128 bit)                           |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                      Destination Address                      +
|                           (128 bit)                           |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

1. **Version (4 bit)**: Değeri `6`'dır (`0110`).
2. **Traffic Class (8 bit)**: IPv4'teki ToS/DiffServ/ECN alanının birebir karşılığıdır (6 bit DSCP + 2 bit ECN).
3. **Flow Label (20 bit)**: Belirli bir iletişim akışına (flow) ait paketleri etiketler. Yönlendiriciler derin paket incelemesine (DPI) veya L4 portlarına bakmadan akış bazlı eşit maliyetli çoklu yol (ECMP) yönlendirmesi yapabilir.
4. **Payload Length (16 bit)**: 40 baytlık sabit IPv6 başlığından sonra gelen uzantı başlıkları ve L4 veri yükünün toplam uzunluğu.
5. **Next Header (8 bit)**: Sabit başlıktan hemen sonra gelen uzantı başlığının türünü veya L4 protokolünü (TCP=6, UDP=17, ICMPv6=58 vb.) belirtir.
6. **Hop Limit (8 bit)**: IPv4'teki TTL alanının karşılığıdır. Her yönlendiricide 1 azaltılır.
7. **Source Address (128 bit / 16 Sekizli)**: Kaynak IPv6 adresi.
8. **Destination Address (128 bit / 16 Sekizli)**: Hedef IPv6 adresi.

### IPv4 ve IPv6 Başlık Karşılaştırması

| Özellik | IPv4 (RFC 791) | IPv6 (RFC 8200) | Mimari Kazanım |
|---|---|---|---|
| **Adres Genişliği** | 32 bit (~4,3 milyar adres) | 128 bit ($3,4 \times 10^{38}$ adres) | Sonsuz adres havuzu, NAT zorunluluğunun kalkması |
| **Başlık Boyutu** | Değişken (20 - 60 bayt) | Sabit (40 bayt) | Donanımsal yönlendirme hızlanması |
| **Header Checksum** | Var (Her sekmede hesaplanır) | **YOK** | Yönlendirici gecikmesinin (latency) düşürülmesi |
| **Parçalama (Fragmentation)** | Yönlendiriciler ve kaynak yapabilir | **Yalnızca kaynak yapabilir** | Ara cihaz yükünün kalkması, PMTUD zorunluluğu |
| **Yayın (Broadcast)** | Var (`255.255.255.255`) | **YOK** | Ağ fırtınalarının önlenmesi, Multicast kullanımı |
| **Yapılandırma** | DHCP veya Statik | SLAAC (Otomatik) veya DHCPv6 | Tak-çalıştır ağ yapılandırması |

### IPv6 Uzantı Başlıkları (Extension Headers)

IPv6'da seçenekler sabit başlığın içine gömülmez; sabit başlık ile L4 protokolü arasına zincirleme (daisy-chain) bağlanan **Uzantı Başlıkları** olarak eklenir:

```text
[ IPv6 Başlığı (Next Header = 0) ] -> [ Hop-by-Hop Options (Next = 44) ] -> [ Fragment (Next = 6) ] -> [ TCP Başlığı ] -> [ Veri ]
```

En yaygın uzantı başlıkları:
- `0`: Hop-by-Hop Options (Her yönlendiricinin incelemesi gereken seçenekler)
- `43`: Routing (Genişletilmiş yönlendirme yolları)
- `44`: Fragment Header (Kaynaktan parçalanmış paketlerin yeniden birleştirme bilgisi)
- `50`: Encapsulating Security Payload (ESP - IPsec şifreli yük)
- `51`: Authentication Header (AH - IPsec veri bütünlüğü)
- `60`: Destination Options (Yalnızca nihai hedefin okuyacağı seçenekler)

### ICMPv4 (Internet Control Message Protocol - RFC 792)

IP protokolünün güvenilmez yapısını dengelemek amacıyla hata bildirimleri ve operasyonel denetim sağlamak için kullanılır.

#### ICMPv4 Başlık Formatı

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|      Type     |      Code     |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 İletiye Özgü İçerik (32 bit)                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

1. **Type (8 bit)**: İletinin ana türü.
2. **Code (8 bit)**: Türe bağlı alt ayrıntı / sebep.
3. **Checksum (16 bit)**: ICMP başlığı ve verisini kapsayan RFC 1071 sağlama toplamı.

#### Başlıca ICMP İletileri

- **Echo Request (Type 8, Code 0) ve Echo Reply (Type 0, Code 0)**: `ping` aracının kullandığı sorgu ve yanıt iletileri. Ek 32 bitlik alanda Tanımlayıcı (Identifier) ve Sıra Numarası (Sequence Number) taşınır.
- **Destination Unreachable (Type 3)**:
  - `Code 0`: Ağa ulaşılamıyor (Net Unreachable)
  - `Code 1`: Ana bilgisayara ulaşılamıyor (Host Unreachable)
  - `Code 2`: Protokol desteklenmiyor (Protocol Unreachable)
  - `Code 3`: Port kapalı / dinlenmiyor (Port Unreachable - UDP için yaygındır)
  - `Code 4`: Parçalama gerekiyor ancak DF biti set edilmiş (PMTUD için hayati hata mesajı)
- **Time Exceeded (Type 11)**:
  - `Code 0`: İletim sırasında TTL değeri sıfırlandı (`traceroute` aracının çalışma temeli).
  - `Code 1`: Parça birleştirme zaman aşımı.

### ICMPv6 (RFC 4443)

IPv6 ağlarında ICMPv6 yalnızca hata raporlamakla kalmaz; ARP ve IGMP'nin görevlerini de üstlenerek protokol yığınının merkezine yerleşir.

- **Hata İletileri (Type 0 - 127)**:
  - `Type 1`: Destination Unreachable (Hedefe ulaşılamıyor)
  - `Type 2`: Packet Too Big (Paket bağlantı MTU'sundan büyük; IPv6'da ara yönlendiriciler parçalama yapmadığından bu mesaj yeni MTU değerini bildirir)
  - `Type 3`: Time Exceeded (Hop limit sıfırlandı)
  - `Type 4`: Parameter Problem (Başlıkta hatalı alan)
- **Bilgilendirme İletileri (Type 128 - 255)**:
  - `Type 128`: Echo Request (Ping isteği)
  - `Type 129`: Echo Reply (Ping yanıtı)
  - `Type 130-132`: MLD (Multicast Listener Discovery)
  - `Type 133-137`: NDP (Neighbor Solicitation / Advertisement / Router Discovery)

---

## 5. İletim Katmanı Protokolleri

### UDP (User Datagram Protocol - RFC 768)

UDP, IP katmanının üzerine yalnızca port numaralandırması ve isteğe bağlı sağlama toplamı ekleyen son derece hafif, bağlantısız (connectionless) bir protokoldür. Sıralama garantisi, teslim garantisi, akış ve tıkanıklık denetimi sunmaz. DNS, DHCP, NTP, VoIP, canlı video ve QUIC gibi düşük gecikme gerektiren yapılar tarafından tercih edilir.

#### UDP Başlık Anatomisi (RFC 768)

Başlık yalnızca **8 sekizli (64 bit)** uzunluğundadır:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|            Length             |           Checksum            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

1. **Source Port (16 bit)**: Kaynak süreç port numarası (yanıt beklenmiyorsa 0 olabilir).
2. **Destination Port (16 bit)**: Hedef süreç port numarası (örn. DNS için 53).
3. **Length (16 bit)**: 8 baytlık UDP başlığı dahil tüm UDP datagramının sekizli cinsinden uzunluğu (en az 8).
4. **Checksum (16 bit)**: Sözde başlık, UDP başlığı ve veriyi kapsayan sağlama toplamı. IPv4'te isteğe bağlıdır (hesaplanmadıysa tüm bitler `0` yapılır; hesaplanıp `0x0000` çıktıysa `0xFFFF` olarak kodlanır). IPv6'da UDP sağlama toplamı **zorunludur**!

### TCP (Transmission Control Protocol - RFC 9293)

TCP; güvenilmez IP katmanı üzerinde güvenilir, sıralı, çift yönlü (full-duplex) ve bayt akışı (byte-stream) odaklı sanal bir bağlantı kuran protokoldür. 2022 yılında yayımlanan **RFC 9293**, orijinal RFC 793 standardını ve onlarca yıllık güncellemeleri tek bir otoriter metinde toplamıştır.

#### TCP Başlık Anatomisi (RFC 9293 §3.1)

Seçenek içermeyen bir TCP başlığı **20 sekizli (160 bit)** uzunluğundadır:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Sequence Number                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Acknowledgment Number                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Data |       |C|E|U|A|P|R|S|F|                               |
| Offset| Rsrvd |W|C|R|C|S|S|Y|I|            Window             |
|       |       |R|E|G|K|H|T|N|N|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Checksum            |         Urgent Pointer        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options                    |    Padding    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

1. **Source Port (16 bit)**: Gönderenin TCP portu.
2. **Destination Port (16 bit)**: Hedefin TCP portu (örn. HTTP 80, HTTPS 443, SSH 22).
3. **Sequence Number (32 bit)**: Bu segmentteki ilk veri baytının bağlantı akışı içindeki sıra numarası. SYN paketi ise bu değer **ISN (Initial Sequence Number)** olur.
4. **Acknowledgment Number (32 bit)**: ACK bayrağı set edilmişse geçerlidir. Alıcının gönderenden beklediği bir sonraki baytın sıra numarasıdır (kümülatif onay).
5. **Data Offset (4 bit)**: Başlığın 32-bit sözcük cinsinden uzunluğu. Seçeneksiz en kısa başlık için değer `5`'tir ($5 \times 4 = 20$ sekizli).
6. **Reserved (4 bit)**: Gelecek kullanımlar için `0` tutulur.
7. **Control Bits / Flags (8 bit)**: Kontrol bayrakları (ayrıntısı aşağıda).
8. **Window Size (16 bit)**: Alıcının mevcut tamponunda kabul edebileceği bayt sayısı (Akış Denetimi).
9. **Checksum (16 bit)**: Sözde başlık, TCP başlığı ve yükü kapsayan zorunlu sağlama toplamı.
10. **Urgent Pointer (16 bit)**: URG biti 1 ise acil verinin bittiği konumu gösterir.
11. **Options (Değişken)**: MSS, Pencere Ölçekleme, SACK gibi müzakere alanları.

### TCP Bayrakları (Flags) ve Kontrol Bitleri

- **CWR (Congestion Window Reduced - RFC 3168)**: Göndericinin ECE bayrağını aldığını ve tıkanıklık penceresini küçülttüğünü alıcıya bildirir.
- **ECE (ECN-Echo - RFC 3168)**: IP başlığında `CE` (11) bayrağını gören alıcı, ağda tıkanıklık olduğunu göndericiye bu bayrakla haber verir.
- **URG (Urgent)**: Acil işaretçisi alanının geçerli olduğunu belirtir.
- **ACK (Acknowledgment)**: Onay numarası alanının geçerli olduğunu gösterir. Bağlantı kurulduktan sonra gönderilen istisnasız tüm paketlerde `1`'dir.
- **PSH (Push)**: Alıcının tamponun dolmasını beklemeden gelen veriyi doğrudan uygulama katmanına iletmesini ister.
- **RST (Reset)**: Bağlantıyı anında sıfırlar ve koparır. Beklenmeyen bir porttan paket geldiğinde veya bağlantı kilitlendiğinde gönderilir.
- **SYN (Synchronize)**: Bağlantı kurulumunda sıra numaralarını senkronize etmek için kullanılır.
- **FIN (Finish)**: Göndericinin iletecek başka verisi kalmadığını ve kendi yönündeki gönderimi kapatmak istediğini bildirir.

### TCP 3 Aşamalı Bağlantı Kurulumu (3-Way Handshake)

```text
İstemci (Client)                                          Sunucu (Server)
      |                                                         |
      | -------- 1. [SYN] Seq=X, MSS=1460, WScale ------------->| (LISTEN -> SYN-RCVD)
(SYN-SENT)                                                      |
      |<-------- 2. [SYN, ACK] Seq=Y, Ack=X+1, MSS=1460 --------|
      |                                                         |
 (ESTABLISHED)                                                  |
      | -------- 3. [ACK] Seq=X+1, Ack=Y+1 -------------------->| (ESTABLISHED)
      |                                                         |
      | === Veri İletimi Başlar (HTTP, TLS vb.) ================|
```

1. **SYN**: İstemci rastgele bir başlangıç sıra numarası (ISN = X) seçer ve sunucuya gönderir.
2. **SYN-ACK**: Sunucu isteği kabul eder, kendi ISN'sini (Y) belirler ve istemcinin SYN'ini onaylar (`Ack = X + 1`).
3. **ACK**: İstemci sunucunun SYN'ini onaylar (`Ack = Y + 1`). Artık iki yönlü güvenilir kanal kurulmuştur.

### TCP Bağlantı Sonlandırma (4-Way Teardown)

TCP çift yönlü bir akış olduğundan her yön bağımsız olarak kapatılır:

```text
Uç A                                                      Uç B
  |                                                         |
  | -------- 1. [FIN, ACK] Seq=U, Ack=V ------------------->| (Uç A veri gönderimini kapattı)
(FIN-WAIT-1)                                                | (CLOSE-WAIT)
  |<-------- 2. [ACK] Seq=V, Ack=U+1 -----------------------|
(FIN-WAIT-2)                                                |
  |                                                         | (Uç B kalan verisini bitirir)
  |<-------- 3. [FIN, ACK] Seq=W, Ack=U+1 ------------------| (LAST-ACK)
  |                                                         |
(TIME-WAIT)                                                 |
  | -------- 4. [ACK] Seq=U+1, Ack=W+1 -------------------->| (CLOSED)
  |                                                         |
 [2 * MSL Beklemesi]                                        |
  v                                                         |
(CLOSED)                                                    |
```

**TIME-WAIT Durumu**: Uç A son ACK paketinin ağda kaybolması durumunda Uç B'nin göndereceği tekrar FIN paketini yakalayabilmek ve eski bağlantıdan kalan gecikmiş paketlerin yeni bağlantılarla karışmasını önlemek için **2 $\times$ MSL (Maximum Segment Lifetime - genelde 60-120 sn)** süresince bekler.

### TCP Durum Makinesi (State Machine)

TCP bağlantısı boyunca bir soketin bulunabileceği 11 durum:
1. `CLOSED`: Bağlantı yok, soket pasif.
2. `LISTEN`: Sunucu gelen bağlantı isteklerini dinliyor.
3. `SYN-SENT`: İstemci SYN gönderdi, yanıt bekliyor.
4. `SYN-RECEIVED`: Sunucu SYN aldı, SYN-ACK gönderdi, ACK bekliyor.
5. `ESTABLISHED`: Bağlantı açık, veri iletimi aktif.
6. `FIN-WAIT-1`: Uç kendi bağlantısını kapatmak için FIN gönderdi.
7. `FIN-WAIT-2`: Karşı uç FIN'e ACK döndü; karşı ucun kendi FIN'i bekleniyor.
8. `CLOSE-WAIT`: Karşı uçtan FIN geldi, yerel uygulamanın soketi kapatması bekleniyor.
9. `CLOSING`: İki uç aynı anda FIN gönderdiğinde el sıkışma durumu.
10. `LAST-ACK`: Karşı uca FIN gönderildi, son ACK bekleniyor.
11. `TIME-WAIT`: Son ACK gönderildi; eski paketlerin hatta sönümlenmesi bekleniyor.

### TCP Seçenekleri (MSS, Window Scale, SACK, Timestamps)

- **MSS (Maximum Segment Size - Seçenek Türü 2, 4 Bayt)**: Bir segmentte taşınabilecek azami TCP veri yükü (genelde MTU 1500 için $1500 - 20 - 20 = 1460$ bayt).
- **Window Scale (Pencere Ölçekleme - Seçenek Türü 3, 3 Bayt, RFC 7323)**: 16-bitlik pencere alanı en fazla 65.535 bayt belirtebilir. Yüksek bant genişliği ve gecikmeli hatlarda (BDP) pencereyi 14 bite kadar sola kaydırarak 1 GB'a kadar pencere boyutu tanımlamaya izin verir.
- **SACK Permitted ve SACK (Seçici Onay - Tür 4 ve 5, RFC 2018)**: Normal TCP kümülatif onay kullanır. SACK sayesinde aradaki tek bir paket kaybolduğunda yalnızca kaybolan blok yeniden istenir, başarıyla ulaşmış sonraki blokların tekrar iletimi önlenir.
- **Timestamps (Zaman Damgaları - Tür 8, 10 Bayt, RFC 7323)**: Gidiş-dönüş süresi (RTT) ölçümünün hassaslaştırılması ve sıra numarası taşmalarında eski paketlerin ayırt edilmesi (PAWS - Protection Against Wrapped Sequences) için kullanılır.

### SCTP (Stream Control Transmission Protocol - RFC 9260)

Telekomünikasyon (SS7/SIGTRAN) ve modern WebRTC veri kanallarında kullanılan gelişmiş iletim protokolü:
- **Çoklu Akış (Multi-streaming)**: Tek bir bağlantı içinde bağımsız mesaj akışları çalıştırır; bir akıştaki paket kaybı diğer akışları bloklamaz (Head-of-Line Blocking önlenir).
- **Çoklu Barındırma (Multi-homing)**: Uç noktaların birden fazla IP adresine sahip olmasına izin verir. Ana hat koptuğunda bağlantı kesilmeden yedek IP'ye şeffaf geçiş yapılır.
- **4 Aşamalı El Sıkışma**: `INIT -> INIT-ACK (State Cookie) -> COOKIE-ECHO -> COOKIE-ACK` akışıyla SYN-Flood DoS saldırılarını tamamen engeller.

---

## 6. Uygulama ve Ağ Yapılandırma Protokolleri

### DNS (Domain Name System - RFC 1035)

İnsan tarafından okunabilir alan adlarını (örn. `example.com`) sayısal IP adreslerine eşleyen dağıtık hiyerarşik veritabanı protokolüdür.

#### DNS İleti Formatı (RFC 1035 §4.1)

Sabit başlık **12 sekizli (96 bit)** uzunluğundadır:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          İşlem Kimliği (ID)   |QR|   Opcode  |AA|TC|RD|RA| Z |RCODE|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       Soru Sayısı (QDCOUNT)   |       Yanıt Sayısı (ANCOUNT)  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|      Yetki Sayısı (NSCOUNT)   |        Ek Kayıt (ARCOUNT)     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Sorular (Questions) ...                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 Yanıt Kayıtları (Answers) ...                 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 Yetki Kayıtları (Authority) ...               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                Ek Kayıtlar (Additional) ...                   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

1. **İşlem Kimliği (ID - 16 bit)**: İstemcinin sorgu ile gelen yanıtı eşleştirmesi için rastgele ürettiği kimlik.
2. **Bayraklar (Flags - 16 bit)**:
   - **QR (1 bit)**: `0` Sorgu (Query), `1` Yanıt (Response).
   - **Opcode (4 bit)**: `0` Standart sorgu, `1` Ters sorgu, `2` Sunucu durum sorgusu.
   - **AA (1 bit)**: Yetkili Yanıt (Authoritative Answer).
   - **TC (1 bit)**: Kesilmiş İleti (Truncated). UDP 512 bayt sınırını aştığında set edilir; istemci TCP üzerinden tekrar sorgulamalıdır.
   - **RD (1 bit)**: Özyineleme İstendi (Recursion Desired).
   - **RA (1 bit)**: Özyineleme Kullanılabilir (Recursion Available).
   - **Z (3 bit)**: Sıfır; gelecek standartlar için ayrılmıştır.
   - **RCODE (4 bit)**: Yanıt Kodu:
     - `0`: Hata Yok (No Error)
     - `1`: Biçim Hatası (Format Error)
     - `2`: Sunucu Hatası (Server Failure)
     - `3`: İsim Hatası (NXDOMAIN - Alan adı mevcut değil)
     - `4`: Desteklenmeyen Sorgu Türü (Not Implemented)
     - `5`: Reddedildi (Refused)
3. **Sayaçlar**:
   - `QDCOUNT`: Soru bölümündeki kayıt sayısı.
   - `ANCOUNT`: Yanıt bölümündeki kaynak kayıt sayısı (RR).
   - `NSCOUNT`: Yetkili ad sunucusu kayıt sayısı.
   - `ARCOUNT`: Ek bilgi kayıt sayısı.

#### DNS Kaynak Kayıtları (Resource Records - RR)

- **A (Tür 1)**: Alan adına karşılık gelen 32 bitlik IPv4 adresi.
- **AAAA (Tür 28)**: Alan adına karşılık gelen 128 bitlik IPv6 adresi.
- **CNAME (Tür 5)**: Başka bir alan adına yönlendiren takma ad (Canonical Name).
- **MX (Tür 15)**: E-posta sunucusu adresi ve öncelik değeri.
- **NS (Tür 2)**: Bölgeden (zone) sorumlu yetkili DNS sunucusu.
- **TXT (Tür 16)**: Metin verisi (SPF, DKIM, DMARC alan doğrulama kayıtları).
- **SOA (Tür 6)**: Bölgenin seri numarası, yenileme ve son kullanma süreleri.

### DHCPv4 (RFC 2131) ve BOOTP (RFC 951)

Bir ana bilgisayarın ağa bağlandığında otomatik olarak IP adresi, alt ağ maskesi, varsayılan ağ geçidi ve DNS sunucularını öğrenmesini sağlar. İstemci portu UDP 68, sunucu portu UDP 67'dir.

#### DORA Aşamaları

```text
İstemci (0.0.0.0:68)                               Sunucu (DHCP Server:67)
       |                                                    |
       | ------ 1. DHCPDISCOVER (Yayın: 255.255.255.255) -->|
       |                                                    |
       |<------ 2. DHCPOFFER (Önerilen IP, Kira Süresi) ----|
       |                                                    |
       | ------ 3. DHCPREQUEST (Seçilen IP'yi İsteme) ----->|
       |                                                    |
       |<------ 4. DHCPACK (Onay ve Yapılandırma) ----------|
```

- **Magic Cookie**: DHCP seçenekleri `0x63825363` sihirli sekizlileriyle başlar.
- **Yaygın Seçenekler**: Seçenek 53 (İleti Türü: Discover, Offer vb.), Seçenek 1 (Alt Ağ Maskesi), Seçenek 3 (Yönlendirici / Ağ Geçidi), Seçenek 6 (DNS Sunucuları), Seçenek 51 (IP Kira Süresi).

### DHCPv6 (RFC 8415)

IPv6 için adres ve yapılandırma dağıtımı sağlar. UDP 546 (istemci) ve 547 (sunucu) portlarını kullanır. İletişim multicast adresleri üzerinden yürütülür (`ff02::1:2` All_DHCP_Relay_Agents_and_Servers).
Dört adımlı döngüsü **SARR** olarak bilinir:
1. **Solicit**: İstemci sunucuları arar.
2. **Advertise**: Sunucular uygunluk bildirir.
3. **Request**: İstemci adres/parametre ister.
4. **Reply**: Sunucu onay ve adresleri teslim eder.

---

## 7. İnternet Sağlama Toplamı (Checksum) Hesaplama Algoritması

### RFC 1071 Bire Tümleyen Toplamı Mantığı

İnternet Protokollerinde (IPv4, ICMP, UDP, TCP) veri bütünlüğü doğrulaması **RFC 1071** belgesinde tanımlanan matematiksel yöntemle yapılır:
> **Kural**: Korunan alanlar 16 bitlik (2 sekizli) tam sayılar olarak ele alınır ve 1'e tümleyen (ones' complement) aritmetiğiyle toplanır. Elde edilen nihai toplamın 1'e tümleyeni (tüm bitlerin tersi: bitwise NOT) alınarak sağlama toplamı alanına yazılır.

#### Algoritmanın Adımları

1. Hesaplanacak veri dizisi 16 bitlik tamsayılar çifti olarak bölünür.
2. Eğer veri uzunluğu tek sayıda sekizli içeriyorsa, son sekizlinin sağına sanal bir sıfır (`0x00`) sekizlisi eklenir.
3. Sağlama toplamı alanı hesaplama başlangıcında `0x0000` kabul edilir.
4. Tüm 16 bitlik kelimeler 32 bitlik bir akümülatörde toplanır.
5. 16 biti aşan taşma bitleri (carry bits), alt 16 bite eklenir:
   $$\text{sum} = (\text{sum} \ \& \ \text{0xFFFF}) + (\text{sum} \gg 16)$$
6. Taşma kalmayana kadar bu katlama işlemi tekrarlanır.
7. Elde edilen 16 bitlik değerin tersi alınır: `~sum & 0xFFFF`.

#### Doğrulama Kuralı

Alıcı taraf, sağlama toplamı alanı da dahil olmak üzere aynı veriyi aynı yöntemle topladığında sonucun **`0x0000`** (veya 1'e tümleyen mantığında eşdeğeri olan tüm bitleri `1`, yani `0xFFFF`) çıkması gerekir. Farklı bir değer paketin yolda bozulduğunu gösterir.

### Sözde Başlık (Pseudo-Header) Yapısı

TCP ve UDP paketleri yalnızca kendi başlık ve yüklerini değil; paketin yanlış bir IP adresine veya yanlış bir protokole teslim edilmesini önlemek amacıyla L3 IP başlığındaki kritik alanları da sağlama toplamına dahil eder. Bu sanal başlığa **Sözde Başlık (Pseudo-Header)** denir. Sözde başlık hatta iletilmez, yalnızca hesaplama anında bellekte verinin önüne eklenir.

#### IPv4 Üzerinde Sözde Başlık (12 Sekizli)

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Kaynak IP Adresi                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Hedef IP Adresi                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Sıfır     |    Protokol   |         TCP/UDP Uzunluğu      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### IPv6 Üzerinde Sözde Başlık (40 Sekizli - RFC 8200 §8.1)

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                      Kaynak IPv6 Adresi                       +
|                           (128 bit)                           |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                       Hedef IPv6 Adresi                       +
|                           (128 bit)                           |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Üst Katman Paket Uzunluğu                 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Sıfır (3 sekizli)        | Sonraki Başlık|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Ethernet CRC-32 (FCS) Hesaplaması

Ethernet çerçevelerinin sonundaki 4 baytlık FCS, IEEE 802.3 standardında tanımlanan 32-bit Döngüsel Artıklık Denetimi (Cyclic Redundancy Check) ile hesaplanır. Kullanılan standart üreteç polinomu:

$$G(x) = x^{32} + x^{26} + x^{23} + x^{22} + x^{16} + x^{12} + x^{11} + x^{10} + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1$$

Bu polinom donanımsal shift-register devreleriyle gigabit hızlarında gerçek zamanlı olarak hesaplanır ve tek bitlik, çift bitlik tüm hataları ile 32 bitten kısa patlama (burst) hatalarının %100'ünü tespit eder.

---

## 8. Bütün Temel Ağ RFC’lerinin Kapsamlı Kataloğu

Aşağıdaki tablo, Ethernet haberleşmesinde ve TCP/IP mimarisinde yer alan bütün kritik RFC standartlarını, tarihsel durumlarını ve işlevlerini içerir:

| RFC No | Başlık | Yazarlar | Tarih | Durum | Yerine Geçtiği / Geçen | Temel Amacı ve İşlevi |
|---|---|---|---|---|---|---|
| **RFC 768** | User Datagram Protocol | J. Postel | Ağustos 1980 | Internet Standard | — | Minimal, bağlantısız, 8 bayt başlıklı L4 iletim protokolü (UDP). |
| **RFC 791** | Internet Protocol | J. Postel | Eylül 1981 | Internet Standard | RFC 760 | İnternet ağ katmanının temeli; IPv4 adresleme, yönlendirme ve parçalama. |
| **RFC 792** | Internet Control Message Protocol | J. Postel | Eylül 1981 | Internet Standard | — | Ağ teşhis, hata ve kontrol bildirimleri (Ping, Destination Unreachable). |
| **RFC 826** | An Ethernet Address Resolution Protocol | D. Plummer | Kasım 1982 | Internet Standard | — | IP adreslerini 48-bit Ethernet MAC adreslerine dinamik eşleyen protokol (ARP). |
| **RFC 894** | A Standard for the Transmission of IP Datagrams over Ethernet Networks | C. Hornig | Nisan 1984 | Internet Standard | — | IP datagramlarının standart Ethernet II (DIX) çerçevelerinde taşınması kuralı. |
| **RFC 903** | A Reverse Address Resolution Protocol | Finlayson vd. | Haziran 1984 | Internet Standard | — | Disksiz sistemlerin MAC adresinden IP öğrenmesini sağlayan protokol (RARP). |
| **RFC 951** | Bootstrap Protocol (BOOTP) | B. Croft, J. Gilmore | Eylül 1985 | Proposed Standard | — | RARP'ın yerini alan, UDP tabanlı IP ve açılış parametresi dağıtım protokolü. |
| **RFC 1035** | Domain Names - Implementation and Specification | P. Mockapetris | Kasım 1987 | Internet Standard | RFC 882, RFC 883 | Dağıtık alan adı çözümleme mimarisi, kayıt türleri ve sorgu/yanıt paket formatı. |
| **RFC 1042** | Standard for the Transmission of IP Datagrams over IEEE 802 Networks | J. Postel, J. Reynolds | Şubat 1988 | Internet Standard | RFC 948 | IEEE 802.3 ağlarında LLC/SNAP başlıklarıyla IP paketlerinin kapsüllenmesi. |
| **RFC 1071** | Computing the Internet Checksum | Braden, Borman, Partridge | Eylül 1988 | Informational | — | 16-bit bire tümleyen internet sağlama toplamı algoritması ve optimizasyonları. |
| **RFC 1112** | Host Extensions for IP Multicasting | S. Deering | Ağustos 1989 | Internet Standard | RFC 988, RFC 1054 | IPv4 çok noktaya yayın (multicast), IGMPv1 ve Multicast MAC adres eşlemesi. |
| **RFC 1191** | Path MTU Discovery | J. Mogul, S. Deering | Kasım 1990 | Proposed Standard | — | Uçtan uca yol boyunca parçalamayı önlemek için en küçük MTU'yu keşfetme. |
| **RFC 2131** | Dynamic Host Configuration Protocol | R. Droms | Mart 1997 | Proposed Standard | RFC 1541 | Otomatik dinamik IP ve ağ yapılandırma protokolü (DHCPv4). |
| **RFC 2236** | Internet Group Management Protocol, Version 2 | W. Fenner | Kasım 1997 | Proposed Standard | RFC 1112 | Grup ayrılma (Leave Group) mesajı eklenen IGMPv2 standardı. |
| **RFC 2474** | Definition of the Differentiated Services Field (DiffServ) | Nichols vd. | Aralık 1998 | Proposed Standard | RFC 1455, RFC 1349 | IPv4 ToS ve IPv6 Traffic Class alanlarının 6 bitlik DSCP olarak yeniden tanımlanması. |
| **RFC 2516** | A Method for Transmitting PPP Over Ethernet (PPPoE) | Mamakos vd. | Şubat 1999 | Informational | — | Ethernet ağlarında PPP oturumu ve kimlik doğrulama çerçevesi. |
| **RFC 2606** | Reserved Top Level DNS Names | D. Eastlake, A. Panitz | Haziran 1999 | Best Current Practice | — | Test ve belgelendirme için ayrılmış TLD'ler (`.test`, `.example`, `.invalid`, `.localhost`). |
| **RFC 3168** | The Addition of Explicit Congestion Notification (ECN) to IP | Ramakrishnan vd. | Eylül 2001 | Proposed Standard | RFC 2481 | IP ve TCP başlıklarında paket düşürmeden tıkanıklık uyarısı sağlayan 2 bitlik ECN. |
| **RFC 3376** | Internet Group Management Protocol, Version 3 | B. Cain vd. | Ekim 2002 | Proposed Standard | RFC 2236 | Kaynak odaklı çok noktaya yayın (Source-Specific Multicast - SSM) destekli IGMPv3. |
| **RFC 3849** | IPv6 Address Prefix Reserved for Documentation | G. Huston vd. | Temmuz 2004 | Informational | — | Belgelendirme ve örnekler için ayrılmış IPv6 adresi bloğu (`2001:db8::/32`). |
| **RFC 4443** | ICMPv6 for the IPv6 Specification | A. Conta vd. | Mart 2006 | Internet Standard | RFC 2463, RFC 1885 | IPv6 mimarisinin hata ve bilgi kontrol protokolü (ICMPv6). |
| **RFC 4861** | Neighbor Discovery for IP version 6 (NDP) | T. Narten vd. | Eylül 2007 | Proposed Standard | RFC 2461 | IPv6'da ARP, ICMP Router Discovery ve Redirect yerine geçen komşu keşif protokolü. |
| **RFC 5227** | IPv4 Address Conflict Detection | S. Cheshire | Temmuz 2008 | Proposed Standard | — | ARP Probe ve Announcement mekanizmalarıyla IP çakışmalarını önleme. |
| **RFC 5737** | IPv4 Address Blocks Reserved for Documentation | J. Arkko vd. | Ocak 2010 | Informational | — | Belgelendirme için ayrılmış IPv4 blokları (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`). |
| **RFC 8200** | Internet Protocol, Version 6 (IPv6) Specification | S. Deering, R. Hinden | Temmuz 2017 | Internet Standard | RFC 2460 | IPv6 temel şartnamesi; sabit 40 bayt başlık ve uzantı başlıkları mimarisi. |
| **RFC 8415** | Dynamic Host Configuration Protocol for IPv6 (DHCPv6) | Molaro vd. | Kasım 2018 | Proposed Standard | RFC 3315, RFC 3633 | IPv6 için dinamik adres ve yapılandırma dağıtımı (DHCPv6). |
| **RFC 9293** | Transmission Control Protocol (TCP) | W. Eddy (Ed.) | Ağustos 2022 | Internet Standard | RFC 793, RFC 879, RFC 2873, RFC 6093, RFC 6528 | Orijinal RFC 793 ve tüm güncellemeleri konsolide eden güncel ana TCP standardı. |
| **RFC 9542** | IANA Considerations for IEEE 802 Parameters | D. Eastlake | Şubat 2024 | Best Current Practice | RFC 7042 | Belgeleme MAC adresleri (`00:00:5e:00:53:xx`) ve IEEE parametre kuralları. |

---

## 9. Uçtan Uca Paket Analizleri ve Onaltılık (Hex) İncelemeler

Aşağıdaki worked-example (adım adım çözümlenmiş) paket dökümleri, gerçek ağ yakalamalarında (Wireshark veya `tcpdump -xx`) görülen bayt dizilimlerinin tam karşılığıdır.

### Örnek 1: Ethernet Üzerinde ARP İstek Paketi

Belgeleme MAC adresleri (`00:00:5e:00:53:01` $\to$ `ff:ff:ff:ff:ff:ff`) ve IPv4 adresleri (`192.0.2.1` $\to$ `192.0.2.2`) arasında oluşturulmuş 42 baytlık (dolgu hariç) ARP paketi:

```text
0000   ff ff ff ff ff ff 00 00 5e 00 53 01 08 06 00 01
0010   08 00 06 04 00 01 00 00 5e 00 53 01 c0 00 02 01
0020   00 00 00 00 00 00 c0 00 02 02 00 00 00 00 00 00
0030   00 00 00 00 00 00 00 00 00 00 00 00
```

#### Bayt Bayt Ayrıştırma Tablosu

| Bayt Aralığı | Değer (Hex) | Protokol | Alan Adı | Açıklama ve Çözümleme |
|---|---|---|---|---|
| `00 - 05` | `ff ff ff ff ff ff` | Ethernet | Hedef MAC Adresi | Yayın (Broadcast) adresi; tüm yerel cihazlar dinler. |
| `06 - 11` | `00 00 5e 00 53 01` | Ethernet | Kaynak MAC Adresi | İsteği yapan istasyonun MAC adresi (RFC 9542). |
| `12 - 13` | `08 06` | Ethernet | EtherType | `0x0806`: Paket yükü bir ARP iletisidir. |
| `14 - 15` | `00 01` | ARP | Donanım Türü (`ar$hrd`) | `1`: Ethernet donanımı. |
| `16 - 17` | `08 00` | ARP | Protokol Türü (`ar$pro`) | `0x0800`: IPv4 adresi çözümleniyor. |
| `18` | `06` | ARP | Donanım Boyutu (`ar$hln`) | `6` sekizli (48 bit MAC). |
| `19` | `04` | ARP | Protokol Boyutu (`ar$pln`)| `4` sekizli (32 bit IPv4). |
| `20 - 21` | `00 01` | ARP | İşlem Kodu (`ar$op`) | `1`: ARP İstek (Request) iletisi. |
| `22 - 27` | `00 00 5e 00 53 01` | ARP | Gönderen MAC (`ar$sha`) | İsteği başlatan cihazın fiziksel MAC adresi. |
| `28 - 31` | `c0 00 02 01` | ARP | Gönderen IP (`ar$spa`) | `192.0.2.1` (0xC0=192, 0x00=0, 0x02=2, 0x01=1). |
| `32 - 37` | `00 00 00 00 00 00` | ARP | Hedef MAC (`ar$tha`) | Bilinmiyor (İstek paketinde sıfır doldurulur). |
| `38 - 41` | `c0 00 02 02` | ARP | Hedef IP (`ar$tpa`) | `192.0.2.2` (MAC adresi aranan hedef cihaz). |
| `42 - 59` | `00 00 00 ...` | Ethernet | Dolgu (Padding) | Çerçeveyi minimum 60 bayta (FCS hariç) tamamlayan sıfırlar. |

---

### Örnek 2: Ethernet + IPv4 + UDP + DNS Sorgu Paketi

`example.com` adresi için A kaydı sorgulayan bir DNS paketi:

```text
0000   00 00 5e 00 53 02 00 00 5e 00 53 01 08 00 45 00
0010   00 3b 1a 2b 00 00 40 11 b6 4c c0 00 02 01 c6 33
0020   64 07 c4 12 00 35 00 27 82 1d 12 34 01 00 00 01
0030   00 00 00 00 00 00 07 65 78 61 6d 70 6c 65 03 63
0040   6f 6d 00 00 01 00 01
```

#### Bayt Bayt Ayrıştırma Tablosu

| Bayt Aralığı | Değer (Hex) | Protokol | Alan Adı | Açıklama ve Çözümleme |
|---|---|---|---|---|
| `00 - 11` | `00 00 5e 00 53 02 ...` | Ethernet | Hedef ve Kaynak MAC | `...53:02` yönlendirici MAC'i, `...53:01` istemci MAC'i. |
| `12 - 13` | `08 00` | Ethernet | EtherType | `0x0800`: IPv4 datagramı. |
| `14` | `45` | IPv4 | Sürüm ve IHL | Sürüm 4 (`4`), Başlık uzunluğu 20 bayt ($5 \times 4$ = `5`). |
| `15` | `00` | IPv4 | DSCP / ECN | Standart Best Effort iletim. |
| `16 - 17` | `00 3b` | IPv4 | Total Length | 59 sekizli ($20 \text{ bayt IP} + 8 \text{ bayt UDP} + 31 \text{ bayt DNS}$). |
| `18 - 19` | `1a 2b` | IPv4 | Identification | Paket kimlik numarası `0x1A2B`. |
| `20 - 21` | `00 00` | IPv4 | Flags & Offset | Parçalanmamış paket. |
| `22` | `40` | IPv4 | Time to Live (TTL) | 64 sekme sınırı. |
| `23` | `11` | IPv4 | Protocol | `17` (0x11): UDP protokolü. |
| `24 - 25` | `b6 4c` | IPv4 | Header Checksum | IPv4 başlığı sağlama toplamı. |
| `26 - 29` | `c0 00 02 01` | IPv4 | Kaynak IP | `192.0.2.1`. |
| `30 - 33` | `c6 33 64 07` | IPv4 | Hedef IP | `198.51.100.7` (DNS sunucusu). |
| `34 - 35` | `c4 12` | UDP | Source Port | İstemci dinamik portu: `50194`. |
| `36 - 37` | `00 35` | UDP | Destination Port | `53`: Standart DNS portu. |
| `38 - 39` | `00 27` | UDP | Length | 39 bayt ($8 \text{ bayt UDP} + 31 \text{ bayt DNS}$). |
| `40 - 41` | `82 1d` | UDP | Checksum | Sözde başlıkla hesaplanan UDP sağlama toplamı. |
| `42 - 43` | `12 34` | DNS | Transaction ID | Sorgu kimliği `0x1234`. |
| `44 - 45` | `01 00` | DNS | Flags | `RD=1` (Recursion Desired - Standart özyinelemeli sorgu). |
| `46 - 47` | `00 01` | DNS | QDCOUNT | 1 adet soru kaydı. |
| `48 - 53` | `00 00 00 00 00 00` | DNS | AN/NS/AR Count | Yanıt, yetki ve ek kayıt sayıları sıfır. |
| `54 - 64` | `07 65 78... 03 6f... 00` | DNS | QNAME | `7` byte `example`, `3` byte `com`, sonlandırıcı `0`. |
| `65 - 66` | `00 01` | DNS | QTYPE | `1`: A kaydı (IPv4 adresi sorgulanıyor). |
| `67 - 68` | `00 01` | DNS | QCLASS | `1`: IN (Internet sınıfı). |

---

### Örnek 3: Ethernet + IPv4 + TCP SYN Paketi

TCP bağlantı kurulumunun ilk aşaması (3-Way Handshake SYN):

```text
0000   00 00 5e 00 53 02 00 00 5e 00 53 01 08 00 45 00
0010   00 28 4a 12 40 00 40 06 86 5e c0 00 02 01 c6 33
0020   64 07 c4 12 00 50 12 34 56 78 00 00 00 00 50 02
0030   72 10 d3 c4 00 00
```

#### Bayt Bayt Ayrıştırma Tablosu

| Bayt Aralığı | Değer (Hex) | Protokol | Alan Adı | Açıklama ve Çözümleme |
|---|---|---|---|---|
| `14 - 33` | `45 00 ... c6 33 64 07`| IPv4 | IPv4 Başlığı | Protokol `6` (TCP), Kaynak `192.0.2.1`, Hedef `198.51.100.7`. |
| `34 - 35` | `c4 12` | TCP | Source Port | `50194`: İstemci çıkış portu. |
| `36 - 37` | `00 50` | TCP | Destination Port | `80`: HTTP web sunucusu portu. |
| `38 - 41` | `12 34 56 78` | TCP | Sequence Number | İstemcinin başlangıç sıra numarası (ISN = `0x12345678`). |
| `42 - 45` | `00 00 00 00` | TCP | Acknowledgment No | Bağlantı henüz kurulmadığından (ACK=0) sıfırdır. |
| `46` (üst 4) | `5` | TCP | Data Offset | 20 bayt ($5 \times 4$ sekizli - seçeneksiz başlık). |
| `46` (alt 4) | `0` | TCP | Reserved | Ayrılmış 4 bit sıfırdır. |
| `47` | `02` | TCP | Control Flags | `0x02` = `00000010` (Yalnızca **SYN** biti 1). |
| `48 - 49` | `72 10` | TCP | Window Size | `29200` baytlık alıcı tampon penceresi. |
| `50 - 51` | `d3 c4` | TCP | Checksum | Sözde başlık ve TCP başlığını doğrulayan sağlama toplamı. |
| `52 - 53` | `00 00` | TCP | Urgent Pointer | URG=0 olduğundan sıfırdır. |

---

### Örnek 4: Ethernet + IPv6 + ICMPv6 Echo İsteği

IPv6 üzerinde Ping isteği paketi:

```text
0000   33 33 00 00 00 01 00 00 5e 00 53 01 86 dd 60 00
0010   00 00 00 08 3a 40 20 01 0d b8 00 00 00 00 00 00
0020   00 00 00 00 00 01 20 01 0d b8 00 00 00 00 00 00
0030   00 00 00 00 00 02 80 00 24 5c 00 01 00 01
```

#### Bayt Bayt Ayrıştırma Tablosu

| Bayt Aralığı | Değer (Hex) | Protokol | Alan Adı | Açıklama ve Çözümleme |
|---|---|---|---|---|
| `00 - 11` | `33 33 00 00 00 01 ...` | Ethernet | Hedef ve Kaynak MAC | `33:33:...` IPv6 çok noktaya yayın MAC adresi. |
| `12 - 13` | `86 dd` | Ethernet | EtherType | `0x86DD`: IPv6 paketi. |
| `14 - 17` | `60 00 00 00` | IPv6 | Version, Class, Flow | Sürüm 6 (`6`), Traffic Class 0 (`00`), Flow Label 0 (`00000`). |
| `18 - 19` | `00 08` | IPv6 | Payload Length | 8 baytlık ICMPv6 yükü. |
| `20` | `3a` | IPv6 | Next Header | `58` (0x3A): ICMPv6 protokolü. |
| `21` | `40` | IPv6 | Hop Limit | 64 sekme sınırı. |
| `22 - 37` | `20 01 0d b8 ... 00 01`| IPv6 | Kaynak IPv6 | `2001:db8::1` (RFC 3849 belgeleme öneki). |
| `38 - 53` | `20 01 0d b8 ... 00 02`| IPv6 | Hedef IPv6 | `2001:db8::2`. |
| `54` | `80` | ICMPv6 | Type | `128` (0x80): Echo Request (Ping isteği). |
| `55` | `00` | ICMPv6 | Code | `0`. |
| `56 - 57` | `24 5c` | ICMPv6 | Checksum | IPv6 sözde başlığıyla hesaplanan zorunlu sağlama toplamı. |
| `58 - 59` | `00 01` | ICMPv6 | Identifier | İşlem kimliği `1`. |
| `60 - 61` | `00 01` | ICMPv6 | Sequence Number | Sıra numarası `1`. |

---

### Örnek 5: 802.1Q VLAN Etiketli Ethernet Çerçevesi

VLAN ID 100 etiketi taşıyan IPv4 çerçevesi başlığı:

```text
0000   00 00 5e 00 53 02 00 00 5e 00 53 01 81 00 00 64
0010   08 00 45 00 ...
```

#### Bayt Bayt Ayrıştırma Tablosu

| Bayt Aralığı | Değer (Hex) | Protokol | Alan Adı | Açıklama ve Çözümleme |
|---|---|---|---|---|
| `00 - 11` | `00 00 5e 00 53 02 ...` | Ethernet | Hedef & Kaynak MAC | 48 bitlik fiziksel istasyon adresleri. |
| `12 - 13` | `81 00` | 802.1Q | TPID | `0x8100`: Çerçevenin 802.1Q etiketli olduğunu gösterir. |
| `14 - 15` | `00 64` | 802.1Q | TCI (PCP, DEI, VID) | `PCP = 0` (Standart öncelik), `DEI = 0`, `VID = 0x064` (VLAN 100). |
| `16 - 17` | `08 00` | Ethernet | EtherType | Etiketin ardından gelen gerçek yük türü: `0x0800` (IPv4). |
| `18...` | `45 00 ...` | IPv4 | IPv4 Başlığı | Normal IPv4 datagramı başlar. |

---

## 10. Ağ Analizi ve Paket İnceleme Araçları Rehberi

Tel üzerindeki paketleri incelemek için kullanılan temel açık kaynaklı araçlar:

### `tcpdump` ile Hat Üzerinde Canlı İnceleme

```sh
# Ethernet başlıkları ve onaltılık (hex) dökümle paket yakalama:
sudo tcpdump -i eth0 -e -XX -nn "arp or ip"

# Yalnızca belirli bir IP ve TCP SYN paketlerini filtreleme:
sudo tcpdump -i any -nn "tcp[tcpflags] & tcp-syn != 0 and host 192.0.2.1"

# ICMPv6 paketlerini yakalayıp pcap dosyasına kaydetme:
sudo tcpdump -i eth0 -w icmpv6_capture.pcap "icmp6"
```

- `-e`: Veri bağlantı katmanı (Ethernet Hedef/Kaynak MAC ve EtherType) başlıklarını basar.
- `-XX`: Hem onaltılık (hex) hem de ASCII karakter dökümünü yan yana basar.
- `-nn`: IP ve port numaralarını isimlere çözmeden sayısal gösterir.

### Python / Scapy ile Bit Düzeyinde Paket Üretimi

RFC standartlarına uygun paketleri programatik olarak oluşturup göndermek için:

```python
from scapy.all import Ether, IP, TCP, sendp

# Ethernet + IPv4 + TCP SYN paketi oluşturma
packet = (
    Ether(src="00:00:5e:00:53:01", dst="00:00:5e:00:53:02") /
    IP(src="192.0.2.1", dst="198.51.100.7", id=0x1234, ttl=64) /
    TCP(sport=50194, dport=80, flags="S", seq=0x12345678)
)

# Paketi bit düzeyinde tel üzerine basma
sendp(packet, iface="eth0")
```

---

## 11. Tüm Katmanlardaki Protokollerin Araştırması ve wire Genişleme Yol Haritası

Bu bölümde, bilgisayar ağlarının tüm katmanlarındaki protokoller `wire` projesinin mimari ilkeleri çerçevesinde taranmış; hangi protokollerin projeye başarıyla eklenebileceği, RFC şema uygunlukları, sağlama toplamı mantıkları ve entegrasyon zorlukları teknik olarak değerlendirilmiştir.

### Protokol Uygunluk ve Kabul Kriterleri

Bir protokolün `wire` sistemine eklenebilmesi için şu dört temel koşul aranır:
1. **Otoriter IETF RFC Metni**: Protokol bir IETF RFC'si olarak yayımlanmış olmalıdır. Hiçbir RFC'nin tanımlamadığı protokollerde (LLDP, PTP) IEEE standardı kaynak olabilir. Sayfa, standardın lisanslı bir kopyasının metnine karşı doğrulanır ve sonuç kaydedilir (802.1Q için IEEE 802.1Q-2022, PTP için IEEE 1588-2008, LLDP için IEEE 802.1AB-2016); metnin kendisi depoya girmez.
2. **Okunabilir Başlık Şeması**: RFC düz metni içinde `src/rfc.mjs` ayrıştırıcısının okuyabileceği standart bir ASCII şeması (`+---+` sınırları ve `|Alan|` hücreleri), RFC 9000 biçiminde bir şekil (`Header Form (1) = 1,`) veya RFC 826 benzeri yapılandırılmış bir alan listesi bulunmalıdır.
3. **Deterministik Kodlama ve Ayrıştırma**: Alan genişlikleri bit düzeyinde kesin olmalı, değişken kısımlar açıkça sınırlandırılabilmelidir.
4. **Doğrulanabilir Örnek Paket**: Alan örnek değerlerinden deterministik olarak bir bayt dizisi üretilebilmeli ve gerekiyorsa sağlama toplamı (RFC 1071 veya CRC-32) matematiksel olarak doğrulanabilmelidir.

---

### Katman Katman Aday Protokoller

#### 1. Bağlantı Katmanı (Link Layer) Adayları

| Protokol | RFC | Bölüm / Şema Durumu | Değerlendirme ve Fizibilite |
|---|---|---|---|
| **PPPoE (PPP over Ethernet)** | **RFC 2516** | §4 (Figure) — 32 bit ızgara | **Eklendi**. 6 baytlık sabit başlık: Version (4), Type (4), Code (8), Session_ID (16), Length (16). Doğrulanmış IPv4/ICMP yükü ile çalışır. |
| **IEEE 802.1Q (VLAN Tagging)** | IEEE 802.1Q-2022 | §9.4, §9.6, §6.9.3; Figure 9-1, Table 9-1, 9-2, I-2 | **Eklendi**. TPID (16: 0x8100), PCP (3), DEI (1), VID (12), EtherType (16). Figure 9-1 metin olarak yalnızca bit etiketleriyle okunduğu için genişlikler, onları yazıyla veren maddelerden de denetlenir; öncelik değerlerinin trafik türleri Table I-2'den gelir. |
| **LLDP (Link Layer Discovery)** | IEEE 802.1AB | RFC yok | **Eklendi**. 7 bit tür ve 9 bit uzunluklu TLV'ler: Chassis ID, Port ID, TTL, End. TLV figürleri PDF'te görüntü olduğu için yerleşim, aynı bilgiyi yazıyla veren maddelerden (§8.4.1, §8.5.1), Table 8-1, 8-2, 8-3 ve §8.2'deki zorunlu sıradan okunur; TTL hesabı (aralık × çarpan + 1) §9.2.5.22'den. Standardın MIB modülleri de ayrıca denetlenir. |
| **MPLS etiket yığını** | **RFC 3032**, **RFC 5462** | RFC 5462 §2.1 — 32 bit ızgara | **Eklendi**. Label (20), TC (3), S (1), TTL (8). Şemanın sağındaki "Label Stack Entry" yazısı okuyucu tarafından kenar notu olarak ayıklanır. |
| **RARP (Reverse ARP)** | **RFC 903** | RFC 826 şablonu | **Eklendi**. RFC 826 ile aynı 28 baytlık yerleşim (`ar$op = 3/4`), disksiz önyükleme için tam doğrulanmıştır. |
| **LLC / SNAP Kapsüllemesi** | **RFC 1042** | Liste tanımı | **Orta Uygunluk**. IEEE 802 ağlarında IP taşıma standardıdır. |

#### 2. Ağ / İnternet Katmanı (Network Layer) Adayları

| Protokol | RFC | Bölüm / Şema Durumu | Değerlendirme ve Fizibilite |
|---|---|---|---|
| **IGMPv2 (Group Management)** | **RFC 2236** | §2 (Message Formats) — 32 bit ızgara | **Eklendi**. Sabit 8 sekizli başlık: Type (8), Max Resp Time (8), Checksum (16), Group Address (32). RFC 1071 sağlama toplamı. |
| **IPv6 Fragment Header** | **RFC 8200** | §4.5 (Fragment Header) — 32 bit ızgara | **Eklendi**. Sabit 8 sekizli uzantı başlığı: Next Header (8), Reserved (8), Fragment Offset (13), Res (2), M Flag (1), Identification (32). |
| **GRE (Generic Routing Encapsulation)** | **RFC 2784** | §2.1 — 32 bit ızgara | **Eklendi**. C (1), Reserved0 (12), Version (3), Protocol Type (16), Checksum (16), Reserved1 (16). Doğrulanmış IPv4 yükü taşır. |
| **IPsec AH (Authentication Header)** | **RFC 4302** | §2 — 32 bit ızgara | **Eklendi**. Next Header (8), Payload Len (8), Reserved (16), SPI (32), Sequence Number (32), ICV (değişken). TCP segmentlerini korur. |
| **IPsec ESP** | **RFC 4303** | §2 — 32 bit ızgara | **Eklendi**. SPI (32), Sequence Number (32), Payload (değişken), Padding, Pad Length (8), Next Header (8), ICV (değişken). Başlık ve kuyruk aynı şemanın iki ayrı satırından doğrulanır; değişken alanlar örnek için boyutlandırılır. |
| **IGMPv3 Membership Query** | **RFC 9776** | §4.1 — 32 bit ızgara | **Eklendi**. Type, Max Resp Code, Checksum, Group Address, Flags, S, QRV, QQIC, Number of Sources. |
| **OSPFv2 Hello** | **RFC 2328** | A.3.1, A.3.2 — 32 bit ızgara | **Eklendi**. 24 sekizlilik ortak başlık ve Hello gövdesi; 64 bitlik Authentication alanı iki satırda çizildiği için genişliği metinden okunur. |
| **VRRPv3** | **RFC 9568** | §5.1 — 32 bit ızgara | **Eklendi**. IPv4 sağlama toplamı sözde başlıksız hesaplanır (§5.2.8). |
| **IPv6 Segment Routing Header** | **RFC 8754** | §2 — 32 bit ızgara | **Eklendi**. Routing Type 4; segment listesi ters sıradadır. |

#### 3. İletim Katmanı (Transport Layer) Adayları

| Protokol | RFC | Bölüm / Şema Durumu | Değerlendirme ve Fizibilite |
|---|---|---|---|
| **SCTP (Stream Control Transmission)** | **RFC 9260** | §3.1 (Common Header) — 32 bit ızgara | **Eklendi**. 12 baytlık ortak başlık: Source Port (16), Destination Port (16), Verification Tag (32), Checksum (32 - CRC-32c). Doğrulanmış INIT yığını taşır. |
| **DCCP (Datagram Congestion Control)** | **RFC 4340** | §5.1 — 32 bit ızgara | **Eklendi**. Source Port (16), Dest Port (16), Data Offset (8), CCVal (4), CsCov (4), Checksum (16), Res (3), Type (4), X (1), Sequence Number (24). RFC 1071 sağlama toplamı. |
| **VXLAN (Virtual eXtensible LAN)** | **RFC 7348** | §5 — 32 bit ızgara | **Eklendi**. Flags (8), Reserved (24), VNI (24), Reserved (8). İç Ethernet çerçevesini L4 üzerinden tüneller. |
| **QUIC Initial paketi** | **RFC 9000** | §17.2.2 (Figure 15) — şekil gösterimi | **Eklendi**. RFC 9000 ASCII ızgara yerine `Header Form (1) = 1,` biçiminde şekiller kullandığı için `src/rfc.mjs` bu biçimi ayrıca okur. Aralıklar (0..160) ve değişken uzunluklu tamsayılar (i) da karşılaştırılır; örnekteki genişlikler aralığın içinde olmalıdır. |
| **QUIC 1-RTT (kısa başlık)** | **RFC 9000** | §17.3.1 (Figure 19) — şekil gösterimi | **Eklendi**. Header Form 0, Spin Bit, Key Phase, hedef bağlantı kimliği ve paket numarası. |
| **Geneve** | **RFC 8926** | §3.1 — 32 bit ızgara | **Eklendi**. Ver (2), Opt Len (6), O (1), C (1), Rsvd (6), Protocol Type (16), VNI (24), Reserved (8), seçenekler. |

#### 4. Uygulama ve Ağ Yönetimi Katmanı (Application / Management Layer) Adayları

| Protokol | RFC | Bölüm / Şema Durumu | Değerlendirme ve Fizibilite |
|---|---|---|---|
| **DHCPv4 / BOOTP** | **RFC 2131** | §2 Table 1 — sekizli tablosu | **Eklendi**. 236 baytlık sabit kısım: op (8), htype (8), hlen (8), hops (8), xid (32), secs (16), flags (16), ciaddr, yiaddr, siaddr, giaddr (32), chaddr (16 bayt), sname (64 bayt), file (128 bayt) ve options. Figure 1 ölçekli çizilmediği için genişlikler sekizli sayılarını veren Table 1'den doğrulanır. Örnek: RFC 2132 seçenekli DHCPDISCOVER. |
| **NTP (Network Time Protocol)** | **RFC 5905** | §7.3 (Figure 8) — 32 bit ızgara | **Eklendi**. Sabit 48 baytlık (384 bit) temel başlık: LI (2), VN (3), Mode (3), Stratum (8), Poll (8), Precision (8), Root Delay (32), Root Dispersion (32), Reference ID (32) ve dört adet 64 bitlik zaman damgası. Figure 8'in ilk satırı bit ızgarasından bir karakter kaydığı için ilk altı alan §7.3 metnindeki "N-bit" tanımlarından, kalanı şemadan doğrulanır. |
| **DHCPv6** | **RFC 8415** | §8 (Figure 2) — 32 bit ızgara | **Eklendi**. İstemci-sunucu iletileri için sabit 4 baytlık başlık: msg-type (8), transaction-id (24), ardından seçenekler. Örnek: Client Identifier, Option Request, Elapsed Time ve IA_NA seçenekli Solicit. Relay iletilerinin 34 baytlık başlığı ayrı ele alınmadı. |
| **TLS 1.3 Record Layer** | **RFC 8446** | §5.1 — Bayt listesi | **Orta Uygunluk**. 5 baytlık kayıt başlığı: Content Type (8), Legacy Version (16: 0x0303), Length (16), Şifreli Yük. Şifreleme öncesi ve sonrası ayrımı gerektirir. |
| **RTCP Sender Report** | **RFC 3550** | §6.4.1 — 32 bit ızgara | **Eklendi**. Ortak başlık, gönderici bilgisi ve bir alım raporu bloğu (52 sekizli). Şemanın solundaki "header", "sender info" etiketleri ve `+=+=+` bölüm çizgileri okuyucu tarafından tanınır. |
| **STUN** | **RFC 8489** | §5 — 32 bit ızgara | **Eklendi**. 20 sekizlilik başlık; 96 bitlik Transaction ID üç satırlık tek bir hücre olarak okunur. Örnek: XOR-MAPPED-ADDRESS taşıyan Binding yanıtı. |
| **WebSocket** | **RFC 6455** | §5.2 — 32 bit ızgara ve ABNF | **Eklendi**. FIN, RSV1-3, Opcode, MASK, Payload len; Masking-key genişliği ABNF'deki "32 bits in length" yorumundan doğrulanır. Örnek RFC 6455 §5.7'deki maskelenmiş "Hello" çerçevesidir. |
| **HTTP/2 çerçevesi** | **RFC 9113** | §4.1 (Figure 1) — şekil gösterimi | **Eklendi**. Length (24), Type (8), Flags (8), Reserved (1), Stream Identifier (31), Frame Payload. Örnek: SETTINGS çerçevesi. |
| **PTP (Precision Time Protocol)** | IEEE 1588-2008 | RFC yok; Table 18 ve Table 26 | **Eklendi**. 34 sekizlilik ortak başlık ve Sync iletisinin originTimestamp alanı. Alan adları ve genişlikleri lisanslı bir kopyanın metnindeki ileti tablolarından ve `struct PortIdentity`, `struct Timestamp` tanımlarından okunur; sonuç kaydedilir, metin depoya girmez. |
| **PTP Follow_Up, Delay_Req, Delay_Resp, Announce** | IEEE 1588-2008 | Table 25–28 | **Eklendi**. Gecikme istek-yanıt mekanizması ve ana saat seçimi için kullanılan iletiler; Announce'taki `ClockQuality` yapısı da metindeki `struct` tanımından okunur. |
| **HTTP/3 çerçevesi** | **RFC 9114** | §7.1 (Figure 3) — şekil gösterimi | **Eklendi**. Type (i), Length (i), Frame Payload. Örnek: SETTINGS çerçevesi. |
| **BGP OPEN** | **RFC 4271** | §4.1, §4.2 — 32 bit ızgara | **Eklendi**. 16 sekizlilik Marker, Length, Type; OPEN gövdesi. OPEN şeması kısa bir cetvelle başladığı için okuyucu şemanın en geniş ayırıcısını cetvel sayar. |

---

### Önceliklendirme ve Uygulama Matrisi

`wire` projesine yeni protokoller eklenirken izlenmesi tavsiye edilen fazlar ve gerekçeleri:

```text
[Faz 1 - Hızlı Kazanımlar]    ──>  PPPoE (RFC 2516) & IGMPv2 (RFC 2236) & NTP (RFC 5905)
                                  (Temiz 32-bit ASCII şeması, sabit bayt boyutları, doğrudan RFC 1071 / UDP entegrasyonu)

[Faz 2 - Temel Ağ Altyapısı]  ──>  DHCPv4 (RFC 2131) & SCTP (RFC 9260) & IPv6 Fragment (RFC 8200)
                                  (Ağ mühendisliği için kritik değer, zengin alan tabloları)

[Faz 3 - Tünelleme ve Güvenlik]──> GRE (RFC 2784) & IPsec AH (RFC 4302) & DHCPv6 (RFC 8415)
```

1. **IGMPv2 (RFC 2236)**: Ağ katmanındaki boşluğu doldurur. 8 baytlık başlığı RFC 792 ICMP ile benzer yapıda olduğundan kodlayıcı ve test altyapısına 1 saatte entegre edilebilir.
2. **PPPoE (RFC 2516)**: Bağlantı katmanında Ethernet ile IP arasındaki eksik köprüyü tamamlar.
3. **NTP (RFC 5905)**: 48 baytlık sabit ve kusursuz 32 bit şemasıyla UDP üzerinde taşınan en zarif protokoldür.
4. **DHCPv4 (RFC 2131)**: Ziyaretçilerin ve öğrencilerin paket yakalamalarında en çok aradığı protokoldür; geniş alan tablosuyla siteye büyük eğitsel değer katar.

---

## Sonuç ve Başvuru Notu

Bu kılavuz, `wire` projesinin temel felsefesi olan **"tel üzerindeki her bit, kaynağıyla"** prensibine dayanır. Sistemdeki alan genişlikleri, offset değerleri ve paket yapıları doğrudan IETF RFC metinlerindeki ASCII şemalar, şekiller ve şartnamelerle makine düzeyinde karşılaştırılarak doğrulanmaktadır. RFC'si olmayan iki protokol IEEE standartlarına dayanır: PTP, IEEE 1588-2008'in lisanslı bir kopyasına karşı doğrulanır; LLDP, IEEE 802.1AB-2016'nın lisanslı bir kopyasına ve standardın MIB modüllerine karşı doğrulanır.
