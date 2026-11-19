#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later

import json
import os
import sys

# Translations map: protocol_id -> field_key -> dict(name=..., label=..., desc_en=..., desc_tr=..., values_en=..., values_tr=...)
TRANSLATIONS = {}

# ---------------------------------------------------------------------------
# LINK PROTOCOLS: ethernet, vlan, arp, rarp, pppoe, lldp, mpls
# ---------------------------------------------------------------------------
TRANSLATIONS['ethernet'] = {
    'dst': {
        'name': 'Destination Address',
        'label': 'Hedef adresi',
        'desc_en': 'The 48-bit Ethernet MAC address of the destination station.',
        'desc_tr': 'Çerçevenin gönderildiği istasyonun 48 bitlik Ethernet adresi.',
    },
    'src': {
        'name': 'Source Address',
        'label': 'Kaynak adresi',
        'desc_en': 'The 48-bit Ethernet MAC address of the transmitting station.',
        'desc_tr': 'Çerçeveyi gönderen istasyonun 48 bitlik Ethernet adresi.',
    },
    'type': {
        'name': 'Type',
        'label': 'Tür',
        'desc_en': 'Specifies the protocol encapsulated in the data field. For frames carrying an IP datagram, this must be hexadecimal 0800.',
        'desc_tr': 'Veri alanında hangi protokolün taşındığını belirtir. IP datagramı taşıyan çerçevelerde değeri onaltılık 0800 olmalıdır.',
        'values_en': [["0x0800", "IP datagram (RFC 894)"], ["ether_type$ADDRESS_RESOLUTION", "ARP packet; RFC 826 does not specify the numeric value"]],
        'values_tr': [["0x0800", "IP datagramı (RFC 894)"], ["ether_type$ADDRESS_RESOLUTION", "ARP paketi; RFC 826 bu türün sayısal değerini vermez"]]
    },
    'data': {
        'name': 'Data',
        'label': 'Veri',
        'desc_en': 'Packet of the protocol specified by the Type field. For IP: IP header followed immediately by IP data.',
        'desc_tr': 'Tür alanının belirttiği protokolün paketi. IP için: IP başlığı ve hemen ardından IP verisi.',
    }
}

TRANSLATIONS['vlan'] = {
    'tpid': {
        'name': 'Tag Protocol Identifier (TPID)',
        'label': 'Etiket protokolü tanımlayıcısı',
        'desc_en': 'Two-octet EtherType identifying the frame as tagged and specifying the tag type. 0x8100 for Customer VLAN Tag (C-TAG).',
        'desc_tr': 'Çerçevenin etiketli olduğunu ve etiketin türünü gösteren EtherType; iki sekizlidir. Müşteri VLAN etiketi (C-TAG) için 81-00.',
        'values_en': [["0x8100", "C-TAG (Customer VLAN Tag)"], ["0x88a8", "S-TAG (Service VLAN Tag) or B-TAG"], ["0x88e7", "I-TAG (Backbone Service Instance Tag)"]],
        'values_tr': [["0x8100", "C-TAG (Customer VLAN Tag)"], ["0x88a8", "S-TAG (Service VLAN Tag) ya da B-TAG"], ["0x88e7", "I-TAG (Backbone Service Instance Tag)"]]
    },
    'pcp': {
        'name': 'Priority Code Point (PCP)',
        'label': 'Öncelik kodu',
        'desc_en': 'Priority of the frame and drop eligibility according to encoding. In default 8P0D encoding, PCP equals priority (1 lowest, 7 highest; Table I-2).',
        'desc_tr': 'Çerçevenin önceliği ve, seçilen kodlamaya göre, atılabilirliği. Varsayılan 8P0D kodlamasında PCP önceliğe eşittir. Öncelik değerlerinin önerilen trafik türleri Table I-2\'dedir; 1 en düşük, 7 en yüksek önceliktir.',
        'values_en': [["1", "Background (BK)"], ["0", "Best Effort, default (BE)"], ["2", "Excellent Effort (EE)"], ["3", "Critical Applications (CA)"], ["4", "Video, under 100 ms (VI)"], ["5", "Voice, under 10 ms (VO)"], ["6", "Internetwork Control (IC)"], ["7", "Network Control (NC)"]],
        'values_tr': [["1", "Arka plan (Background) (BK)"], ["0", "Eldeki olanaklarla iletim (Best Effort), varsayılan (BE)"], ["2", "Yüksek öncelikli iletim (Excellent Effort) (EE)"], ["3", "Kritik uygulamalar (CA)"], ["4", "Görüntü, 100 ms altında (VI)"], ["5", "Ses, 10 ms altında (VO)"], ["6", "Ağlar arası denetim (IC)"], ["7", "Ağ denetimi (NC)"]]
    },
    'dei': {
        'name': 'Drop Eligible Indicator (DEI)',
        'label': 'Atılabilirlik göstergesi',
        'desc_en': 'Conveys the drop_eligible parameter when port is configured with Use_DEI: 1 indicates frames eligible for dropping in congestion.',
        'desc_tr': 'Port Use_DEI ile yapılandırıldığında çerçevenin drop_eligible parametresini taşır: 1, tıkanıklıkta öncelikle atılabilecek çerçeveyi gösterir.'
    },
    'vid': {
        'name': 'VLAN Identifier (VID)',
        'label': 'VLAN kimliği',
        'desc_en': '12-bit unsigned integer specifying the VLAN to which the frame belongs. Special values are defined in Table 9-2.',
        'desc_tr': 'Çerçevenin ait olduğu VLAN; 12 bitlik işaretsiz sayı. Bazı değerlerin özel anlamı vardır (Table 9-2).',
        'values_en': [["0", "Null VID: tag carries priority only"], ["1", "Default PVID"], ["2", "Default SR_PVID (SRP stream traffic)"], ["0xFFF", "Reserved for implementation; not transmitted"]],
        'values_tr': [["0", "Null VID: etiket yalnızca öncelik taşır"], ["1", "Varsayılan PVID"], ["2", "Varsayılan SR_PVID (SRP akış trafiği)"], ["0xFFF", "Uygulamaya ayrılmış; etikette gönderilmez"]]
    },
    'type': {
        'name': 'EtherType',
        'label': 'Ethernet türü',
        'desc_en': 'Type of payload following the VLAN tag; matches EtherType in untagged frames. 0x0800 indicates IPv4 datagram.',
        'desc_tr': 'Etiketin ardından gelen yükün türü; etiketsiz çerçevedeki EtherType ile aynıdır. 0x0800 IPv4 datagramıdır.'
    }
}

TRANSLATIONS['arp'] = {
    'hrd': {
        'name': 'Hardware Type (ar$hrd)',
        'label': 'Donanım adres uzayı',
        'desc_en': 'Hardware type parameter specifying the network hardware type. 1 for Ethernet.',
        'desc_tr': 'Donanım adresinin türü. Ethernet için 1.',
        'values_en': [["1", "Ethernet (ares_hrd$Ethernet)"]],
        'values_tr': [["1", "Ethernet (ares_hrd$Ethernet)"]]
    },
    'pro': {
        'name': 'Protocol Type (ar$pro)',
        'label': 'Protokol adres uzayı',
        'desc_en': 'Protocol address type being resolved. On Ethernet, taken from the set of EtherType values (0x0800 for IPv4).',
        'desc_tr': 'Çözümlenen protokol adresinin türü. Ethernet donanımında bu değer Ethernet tür alanının değer kümesinden gelir.'
    },
    'hln': {
        'name': 'Hardware Address Length (ar$hln)',
        'label': 'Donanım adresi uzunluğu',
        'desc_en': 'Byte length of each hardware address. 6 for 48-bit Ethernet MAC addresses.',
        'desc_tr': 'Her donanım adresinin sekizli cinsinden uzunluğu.'
    },
    'pln': {
        'name': 'Protocol Address Length (ar$pln)',
        'label': 'Protokol adresi uzunluğu',
        'desc_en': 'Byte length of each protocol address. 4 for 32-bit IPv4 addresses.',
        'desc_tr': 'Her protokol adresinin sekizli cinsinden uzunluğu.'
    },
    'op': {
        'name': 'Operation (ar$op)',
        'label': 'İşlem kodu',
        'desc_en': 'Specifies the operation: 1 for ARP Request, 2 for ARP Reply.',
        'desc_tr': 'Paketin istek mi yanıt mı olduğunu belirtir.',
        'values_en': [["1", "Request (ares_op$REQUEST)"], ["2", "Reply (ares_op$REPLY)"]],
        'values_tr': [["1", "İstek (ares_op$REQUEST)"], ["2", "Yanıt (ares_op$REPLY)"]]
    },
    'sha': {
        'name': 'Sender Hardware Address (ar$sha)',
        'label': 'Gönderenin donanım adresi',
        'desc_en': 'Hardware address of the sender; length given by ar$hln.',
        'desc_tr': 'Bu paketi gönderenin donanım adresi; uzunluğu ar$hln alanından gelir.'
    },
    'spa': {
        'name': 'Sender Protocol Address (ar$spa)',
        'label': 'Gönderenin protokol adresi',
        'desc_en': 'Protocol address of the sender; length given by ar$pln.',
        'desc_tr': 'Bu paketi gönderenin protokol adresi; uzunluğu ar$pln alanından gelir.'
    },
    'tha': {
        'name': 'Target Hardware Address (ar$tha)',
        'label': 'Hedefin donanım adresi',
        'desc_en': 'Hardware address of the target, if known. Undefined and set to zeroes in an ARP request.',
        'desc_tr': 'Hedefin donanım adresi, biliniyorsa. İstek paketinde henüz bilinmez.'
    },
    'tpa': {
        'name': 'Target Protocol Address (ar$tpa)',
        'label': 'Hedefin protokol adresi',
        'desc_en': 'Protocol address of the target whose hardware address is requested.',
        'desc_tr': 'Donanım adresi aranan hedefin protokol adresi.'
    }
}

TRANSLATIONS['rarp'] = {
    'hrd': {
        'name': 'Hardware Type (ar$hrd)',
        'label': 'Donanım adres uzayı',
        'desc_en': 'Hardware type parameter specifying the network hardware type. 1 for Ethernet.',
        'desc_tr': 'Donanım adresinin türü. Ethernet için 1.',
        'values_en': [["1", "Ethernet (ares_hrd$Ethernet)"]],
        'values_tr': [["1", "Ethernet (ares_hrd$Ethernet)"]]
    },
    'pro': {
        'name': 'Protocol Type (ar$pro)',
        'label': 'Protokol adres uzayı',
        'desc_en': 'Protocol address type being resolved. 0x0800 for IPv4.',
        'desc_tr': 'Çözümlenen protokol adresinin türü. IPv4 için 0x0800.'
    },
    'hln': {
        'name': 'Hardware Address Length (ar$hln)',
        'label': 'Donanım adresi uzunluğu',
        'desc_en': 'Byte length of each hardware address. 6 for 48-bit MAC addresses.',
        'desc_tr': 'Her donanım adresinin sekizli cinsinden uzunluğu. 48 bitlik MAC adresleri için 6\'dır.'
    },
    'pln': {
        'name': 'Protocol Address Length (ar$pln)',
        'label': 'Protokol adresi uzunluğu',
        'desc_en': 'Byte length of each protocol address. 4 for 32-bit IPv4 addresses.',
        'desc_tr': 'Her protokol adresinin sekizli cinsinden uzunluğu. 32 bitlik IPv4 adresleri için 4\'tür.'
    },
    'op': {
        'name': 'Operation (ar$op)',
        'label': 'İşlem kodu',
        'desc_en': 'Specifies the operation: 3 for Reverse Request, 4 for Reverse Reply.',
        'desc_tr': 'Paketin ters istek mi yoksa ters yanıt mı olduğunu belirtir: 3 Ters İstek, 4 Ters Yanıt.',
        'values_en': [["3", "Reverse Request"], ["4", "Reverse Reply"]],
        'values_tr': [["3", "Ters İstek (Reverse Request)"], ["4", "Ters Yanıt (Reverse Reply)"]]
    },
    'sha': {
        'name': 'Sender Hardware Address (ar$sha)',
        'label': 'Gönderenin donanım adresi',
        'desc_en': 'Hardware address of the sender; length given by ar$hln.',
        'desc_tr': 'Bu paketi gönderen istasyonun donanım adresi; uzunluğu ar$hln alanından gelir.'
    },
    'spa': {
        'name': 'Sender Protocol Address (ar$spa)',
        'label': 'Gönderenin protokol adresi',
        'desc_en': 'Sender protocol address. In a RARP request, undefined (0.0.0.0) because the sender does not yet know its IP.',
        'desc_tr': 'Gönderenin protokol adresi. RARP isteğinde gönderen kendi IP adresini henüz bilmediğinden tanımsızdır ve 0.0.0.0 girilir.'
    },
    'tha': {
        'name': 'Target Hardware Address (ar$tha)',
        'label': 'Hedefin donanım adresi',
        'desc_en': 'Hardware address of the target whose IP address is requested. The requesting machine puts its own MAC here.',
        'desc_tr': 'Protokol adresi aranan hedef donanım adresi. İstek iletisinde arayan cihaz kendi donanım adresini girer.'
    },
    'tpa': {
        'name': 'Target Protocol Address (ar$tpa)',
        'label': 'Hedefin protokol adresi',
        'desc_en': 'Target protocol address. Sent as 0.0.0.0 in the request; populated with the assigned IP address in the server\'s reply.',
        'desc_tr': 'Hedef protokol adresi. İstek iletisinde tanımsızdır ve 0.0.0.0 olarak gönderilir; RARP sunucusunun yanıtında doldurulur.'
    }
}

TRANSLATIONS['pppoe'] = {
    'ver': {
        'name': 'Version (VER)',
        'label': 'Sürüm',
        'desc_en': 'PPPoE specification version. Must be set to 1 (0x1).',
        'desc_tr': 'PPPoE belirtim sürümü. Bu sürüm için değeri 1 (0x1) olmalıdır.'
    },
    'type': {
        'name': 'Type (TYPE)',
        'label': 'Tür',
        'desc_en': 'PPPoE specification type. Must be set to 1 (0x1).',
        'desc_tr': 'PPPoE belirtim türü. Bu sürüm için değeri 1 (0x1) olmalıdır.'
    },
    'code': {
        'name': 'Code (CODE)',
        'label': 'İşlem kodu',
        'desc_en': 'Indicates the packet function during Discovery or Session stage.',
        'desc_tr': 'Paketin Keşif (Discovery) veya Oturum (Session) aşamasındaki işlevini belirtir.',
        'values_en': [["0x00", "Session Data"], ["0x09", "PADI (Active Discovery Initiation)"], ["0x07", "PADO (Active Discovery Offer)"], ["0x19", "PADR (Active Discovery Request)"], ["0x65", "PADS (Active Discovery Session-confirmation)"], ["0xa7", "PADT (Active Discovery Terminate)"]],
        'values_tr': [["0x00", "Oturum Verisi (Session Data)"], ["0x09", "PADI (Active Discovery Initiation)"], ["0x07", "PADO (Active Discovery Offer)"], ["0x19", "PADR (Active Discovery Request)"], ["0x65", "PADS (Active Discovery Session-confirmation)"], ["0xa7", "PADT (Active Discovery Terminate)"]]
    },
    'session_id': {
        'name': 'Session ID (SESSION_ID)',
        'label': 'Oturum kimliği',
        'desc_en': '16-bit identifier uniquely identifying the PPPoE session. 0x0000 in discovery; assigned by the Access Concentrator in PADS.',
        'desc_tr': 'Kurulan PPPoE oturumunu benzersiz olarak tanımlayan 16 bitlik kimlik. Keşif paketlerinde 0x0000 olarak başlar, PADS aşamasında Erişim Yoğunlaştırıcı (Access Concentrator) tarafından atanır.'
    },
    'length': {
        'name': 'Payload Length (LENGTH)',
        'label': 'Yük uzunluğu',
        'desc_en': 'Byte length of the PPPoE payload following the header, excluding Ethernet or PPPoE headers.',
        'desc_tr': 'PPPoE başlığından sonra gelen yükün sekizli cinsinden uzunluğu. Ethernet veya PPPoE başlıklarının boyutunu içermez.'
    },
    'payload': {
        'name': 'Payload and Tags',
        'label': 'Yük ve etiketler',
        'desc_en': 'PPPoE tags in discovery stage (TAG_TYPE, TAG_LENGTH, TAG_VALUE); 2-octet PPP protocol ID and network packet in session stage.',
        'desc_tr': 'Keşif aşamasında PPPoE etiketleri (TAG_TYPE, TAG_LENGTH, TAG_VALUE); oturum aşamasında ise 2 sekizlilik PPP protokol kimliği ve taşınan ağ katmanı paketidir (örneğin IPv4 veya IPv6).'
    }
}

TRANSLATIONS['lldp'] = {
    'chassis_type': {
        'name': 'Chassis ID TLV: Type',
        'label': 'Kasa kimliği TLV türü',
        'desc_en': 'TLV type; 1 for Chassis ID (Table 8-1). Mandatory first TLV of every LLDPDU. High 7 bits of the first octet.',
        'desc_tr': 'TLV türü; Chassis ID için 1 (Table 8-1). Her LLDPDU\'nun ilk TLV\'sidir. Tür alanı, TLV\'nin ilk sekizlisinin en anlamlı yedi bitidir; 9–126 ileride kullanılmak üzere ayrılmıştır.'
    },
    'chassis_len': {
        'name': 'Chassis ID TLV: Length',
        'label': 'Kasa kimliği TLV uzunluğu',
        'desc_en': 'Length of information string in octets: subtype octet plus identifier (§8.5.2.1). 9-bit field.',
        'desc_tr': 'Bilgi dizisinin sekizli cinsinden uzunluğu: alt tür sekizlisi ile kimliğin toplamı (§8.5.2.1). Alan, ilk sekizlinin en az anlamlı bitiyle başlar ve 9 bittir.'
    },
    'chassis_subtype': {
        'name': 'Chassis ID subtype',
        'label': 'Kasa kimliği alt türü',
        'desc_en': 'Basis for chassis identification (Table 8-2). 4 indicates MAC address of a port on the chassis.',
        'desc_tr': 'Kimliğin neye dayandığı (Table 8-2). 4, kasadaki bir portun MAC adresidir. 0 ve 8–255 ayrılmıştır.',
        'values_en': [["1", "chassisComponent"], ["2", "interfaceAlias"], ["3", "portComponent"], ["4", "macAddress"], ["5", "networkAddress"], ["6", "interfaceName"], ["7", "local"]],
        'values_tr': [["1", "Kasa bileşeni (chassisComponent)"], ["2", "Arayüz takma adı (interfaceAlias)"], ["3", "Port bileşeni (portComponent)"], ["4", "MAC adresi (macAddress)"], ["5", "Ağ adresi (networkAddress)"], ["6", "Arayüz adı (interfaceName)"], ["7", "Yerel olarak atanmış (local)"]]
    },
    'chassis_id': {
        'name': 'Chassis ID',
        'label': 'Kasa kimliği',
        'desc_en': 'Identifier value for the chassis; must not be empty. MAC address of a port in this example.',
        'desc_tr': 'Kasayı tanımlayan değer; boş olamaz. Bu örnekte bir portunun MAC adresi.'
    },
    'port_type': {
        'name': 'Port ID TLV: Type',
        'label': 'Port kimliği TLV türü',
        'desc_en': 'TLV type; 2 for Port ID (Table 8-1). Mandatory second TLV of every LLDPDU.',
        'desc_tr': 'TLV türü; Port ID için 2 (Table 8-1). LLDPDU\'nun ikinci TLV\'si olmalıdır.'
    },
    'port_len': {
        'name': 'Port ID TLV: Length',
        'label': 'Port kimliği TLV uzunluğu',
        'desc_en': 'Total length in octets of subtype octet plus port identifier (§8.5.3.1).',
        'desc_tr': 'Alt tür sekizlisi ile port kimliğinin toplam uzunluğu, sekizli olarak (§8.5.3.1).'
    },
    'port_subtype': {
        'name': 'Port ID subtype',
        'label': 'Port kimliği alt türü',
        'desc_en': 'Basis for port identification (Table 8-3). 5 indicates interface ifName.',
        'desc_tr': 'Port kimliğinin neye dayandığı (Table 8-3). 5, arayüzün ifName değeridir. 0 ve 8–255 ayrılmıştır.',
        'values_en': [["1", "interfaceAlias"], ["2", "portComponent"], ["3", "macAddress"], ["4", "networkAddress"], ["5", "interfaceName"], ["6", "agentCircuitId"], ["7", "local"]],
        'values_tr': [["1", "Arayüz takma adı (interfaceAlias)"], ["2", "Port bileşeni (portComponent)"], ["3", "MAC adresi (macAddress)"], ["4", "Ağ adresi (networkAddress)"], ["5", "Arayüz adı (interfaceName)"], ["6", "Agent circuit ID (agentCircuitId)"], ["7", "Yerel olarak atanmış (local)"]]
    },
    'port_id': {
        'name': 'Port ID',
        'label': 'Port kimliği',
        'desc_en': 'Identifier of the transmitting port; must not be empty. ASCII string "eth0" in this example.',
        'desc_tr': 'Çerçeveyi gönderen portun kimliği; boş olamaz. Bu örnekte ASCII "eth0".'
    },
    'ttl_type': {
        'name': 'Time To Live TLV: Type',
        'label': 'Yaşam süresi TLV türü',
        'desc_en': 'TLV type; 3 for Time To Live (Table 8-1). Mandatory third TLV of every LLDPDU.',
        'desc_tr': 'TLV türü; Time To Live için 3 (Table 8-1). LLDPDU\'nun üçüncü TLV\'si olmalıdır.'
    },
    'ttl_len': {
        'name': 'Time To Live TLV: Length',
        'label': 'Yaşam süresi TLV uzunluğu',
        'desc_en': 'Length of TTL field: 2 octets.',
        'desc_tr': 'TTL alanının uzunluğu: 2 sekizli.'
    },
    'ttl': {
        'name': 'Time To Live',
        'label': 'Yaşam süresi',
        'desc_en': 'Seconds the receiver considers this information valid; 0–65535. 0 requests deletion of all stored info for this port.',
        'desc_tr': 'Alıcının bu bilgileri kaç saniye geçerli sayacağı; 0–65535. Değeri txTTL\'dir: min(msgTxInterval × msgTxHold + 1, 65535) (§9.2.5.22). Varsayılan değerlerle (30 s, 4) 121\'dir. 0, alıcının bu porta ait bütün bilgileri silmesini ister.'
    },
    'end_type': {
        'name': 'End Of LLDPDU TLV: Type',
        'label': 'Bitiş TLV türü',
        'desc_en': 'End TLV type, 0. Optional; when present, must be the last TLV (§8.2).',
        'desc_tr': 'Bitiş TLV\'sinin türü, 0. Bitiş TLV\'si isteğe bağlıdır; varsa son TLV olmalıdır (§8.2).'
    },
    'end_len': {
        'name': 'End Of LLDPDU TLV: Length',
        'label': 'Bitiş TLV uzunluğu',
        'desc_en': 'End TLV is a 2-octet all-zero TLV; length is 0.',
        'desc_tr': 'Bitiş TLV\'si 2 sekizlilik, tamamı sıfır bir TLV\'dir; uzunluğu 0\'dır.'
    }
}

TRANSLATIONS['mpls'] = {
    'label': {
        'name': 'Label',
        'label': 'Etiket',
        'desc_en': '20-bit label value determining forwarding at the next hop. 0–15 are reserved values; 16 is first unreserved label.',
        'desc_tr': 'Bir sonraki atlamanın paketi nasıl ileteceğini belirleyen etiket değeri. 0–15 özel değerlerdir; 16 ilk sıradan etikettir.',
        'values_en': [["0", "IPv4 Explicit NULL"], ["1", "Router Alert"], ["2", "IPv6 Explicit NULL"], ["3", "Implicit NULL (signaling only)"], ["16–1048575", "Unreserved labels"]],
        'values_tr': [["0", "IPv4 açık boş etiket (IPv4 Explicit NULL)"], ["1", "Yönlendirici uyarısı (Router Alert)"], ["2", "IPv6 açık boş etiket (IPv6 Explicit NULL)"], ["3", "Örtük boş etiket (Implicit NULL), yalnızca sinyalleşmede"], ["16–1048575", "Sıradan etiketler"]]
    },
    'tc': {
        'name': 'Traffic Class (TC)',
        'label': 'Trafik sınıfı',
        'desc_en': 'Traffic Class for QoS (DiffServ and ECN). Formerly designated Exp in RFC 3032.',
        'desc_tr': 'Trafik sınıfı; DiffServ ve ECN için kullanılır. RFC 3032\'deki adı Exp\'ti.'
    },
    's': {
        'name': 'Bottom of Stack (S)',
        'label': 'Yığın sonu',
        'desc_en': 'Set to 1 if this entry is the bottom of the label stack; 0 if another label stack entry follows.',
        'desc_tr': 'Bu girdi yığının son girdisiyse 1, ardından başka bir etiket geliyorsa 0.'
    },
    'ttl': {
        'name': 'Time to Live (TTL)',
        'label': 'Yaşam süresi',
        'desc_en': 'Decremented at each label switching hop; packet discarded if 0. Typically copied from IP header TTL on push.',
        'desc_tr': 'Her etiket anahtarlama atlamasında bir azaltılır; 0\'a inen paket atılır. Etiket eklenirken genellikle IP başlığının TTL değeri kopyalanır.'
    }
}

# ---------------------------------------------------------------------------
# NETWORK & ROUTING: ipv4, ipv6, ipv6-frag, srh, icmp, icmpv6, igmp, igmpv3, gre, ah, esp, ospf, vrrp
# ---------------------------------------------------------------------------
TRANSLATIONS['ipv4'] = {
    'version': {
        'name': 'Version',
        'label': 'Sürüm',
        'desc_en': 'Format of the internet header; 4 for IPv4.',
        'desc_tr': 'Başlığın biçimini belirtir. Bu belge sürüm 4’ü tarif eder.'
    },
    'ihl': {
        'name': 'IHL',
        'label': 'IPv4 başlık uzunluğu',
        'desc_en': 'Internet Header Length in 32-bit words; valid range 5–15 (e.g. 5 means a 20-octet header).',
        'desc_tr': 'IPv4 başlığının 32 bitlik sözcük cinsinden uzunluğu. Geçerli değer 5–15’tir; örneğin IHL 5, 20 baytlık başlık anlamına gelir.'
    },
    'tos': {
        'name': 'Type of Service',
        'label': 'Hizmet türü',
        'desc_en': 'Quality of service indicator in RFC 791; currently first 6 bits are DSCP (RFC 2474), last 2 bits are ECN (RFC 3168).',
        'desc_tr': 'RFC 791’de hizmet niteliği göstergesi. Günümüzde ilk altı biti DSCP (RFC 2474 §3), son iki biti ECN alanıdır (RFC 3168 §5).'
    },
    'length': {
        'name': 'Total Length',
        'label': 'Toplam uzunluk',
        'desc_en': 'Total length of the datagram in octets, including header and data (max 65,535; all hosts must accept at least 576).',
        'desc_tr': 'Datagramın başlık ve veri dahil sekizli cinsinden toplam uzunluğu. En çok 65.535 olabilir; her konak en az 576 sekizlilik datagramı kabul edebilmelidir.'
    },
    'id': {
        'name': 'Identification',
        'label': 'Tanımlayıcı',
        'desc_en': 'Identifying value assigned by the sender to aid in reassembling fragmented datagrams.',
        'desc_tr': 'Gönderenin atadığı, bir datagramın parçalarını birleştirmeye yarayan tanımlayıcı değer.'
    },
    'flags': {
        'name': 'Flags',
        'label': 'Bayraklar',
        'desc_en': 'Control flags: bit 0 reserved (must be zero), bit 1 DF (Don\'t Fragment), bit 2 MF (More Fragments).',
        'desc_tr': 'Denetim bayrakları. Bit 0 ayrılmıştır ve sıfır olmalıdır; bit 1 DF (parçalama), bit 2 MF (daha parça var).',
        'values_en': [["bit 0", "Reserved, must be zero"], ["bit 1 (DF)", "0 = fragmentable, 1 = don't fragment"], ["bit 2 (MF)", "0 = last fragment, 1 = more fragments"]],
        'values_tr': [["bit 0", "Ayrılmış, sıfır olmalı"], ["bit 1 (DF)", "0 = parçalanabilir, 1 = parçalanamaz"], ["bit 2 (MF)", "0 = son parça, 1 = başka parça var"]]
    },
    'frag': {
        'name': 'Fragment Offset',
        'label': 'Parça konumu',
        'desc_en': 'Position of this fragment in the datagram, measured in 8-octet (64-bit) units; 0 for the first fragment.',
        'desc_tr': 'Bu parçanın datagram içindeki yeri. 8 sekizlilik (64 bit) birimlerle ölçülür; ilk parçanın değeri sıfırdır.'
    },
    'ttl': {
        'name': 'Time to Live',
        'label': 'Yaşam süresi',
        'desc_en': 'Maximum time the datagram is allowed in the internet system. Decremented at each hop; discarded when 0.',
        'desc_tr': 'Datagramın internet sisteminde kalabileceği en uzun süre. Datagramı işleyen her modül değeri en az bir azaltır; sıfır olduğunda datagram yok edilir.'
    },
    'protocol': {
        'name': 'Protocol',
        'label': 'Protokol',
        'desc_en': 'Next-level protocol used in the data portion of the internet datagram.',
        'desc_tr': 'Veri kısmında kullanılan bir üst düzey protokol.',
        'values_en': [["1", "ICMP (RFC 792)"], ["6", "TCP (RFC 8200 §8.1)"], ["17", "UDP (RFC 768)"]],
        'values_tr': [["1", "ICMP (RFC 792)"], ["6", "TCP (RFC 8200 §8.1)"], ["17", "UDP (RFC 768)"]]
    },
    'checksum': {
        'name': 'Header Checksum',
        'label': 'Başlık sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum of all 16-bit words in the header; field itself is zero during computation.',
        'desc_tr': 'Yalnızca başlık üzerinde hesaplanır: başlıktaki 16 bitlik sözcüklerin bire tümleyen toplamının bire tümleyeni. Hesap sırasında bu alan sıfır sayılır.'
    },
    'src': {
        'name': 'Source Address',
        'label': 'Kaynak adresi',
        'desc_en': '32-bit IPv4 source address.',
        'desc_tr': 'Kaynak adresi.'
    },
    'dst': {
        'name': 'Destination Address',
        'label': 'Hedef adresi',
        'desc_en': '32-bit IPv4 destination address.',
        'desc_tr': 'Hedef adresi.'
    },
    'options': {
        'name': 'Options',
        'label': 'Seçenekler',
        'desc_en': 'Variable-length optional parameters; padded with zeroes to a multiple of 32 bits when present.',
        'desc_tr': 'Değişken uzunlukta seçenekler. Datagramda bulunmayabilir; bulunduğunda başlık 32 bit sınırına kadar doldurulur.'
    }
}

TRANSLATIONS['ipv6'] = {
    'version': {
        'name': 'Version',
        'label': 'Sürüm',
        'desc_en': 'Internet Protocol version number; 4 bits set to 6.',
        'desc_tr': 'İnternet Protokolü sürüm numarası; değeri 6’dır.'
    },
    'tc': {
        'name': 'Traffic Class',
        'label': 'Trafik sınıfı',
        'desc_en': '8-bit traffic class field for DSCP and ECN (RFC 8200 §7).',
        'desc_tr': '8 bitlik trafik sınıfı alanı.'
    },
    'flow': {
        'name': 'Flow Label',
        'label': 'Akış etiketi',
        'desc_en': '20-bit flow label used by source to label sequences of packets requiring special handling (RFC 6437).',
        'desc_tr': '20 bitlik akış etiketi.'
    },
    'length': {
        'name': 'Payload Length',
        'label': 'Yük uzunluğu',
        'desc_en': 'Length of the IPv6 payload in octets, including any extension headers following the 40-octet IPv6 base header.',
        'desc_tr': 'Bu başlıktan sonra gelen yükün sekizli cinsinden uzunluğu. Uzantı başlıkları yükün parçası sayılır.'
    },
    'next': {
        'name': 'Next Header',
        'label': 'Sonraki başlık',
        'desc_en': 'Identifies the type of header immediately following the IPv6 header; uses the same values as IPv4 Protocol.',
        'desc_tr': 'IPv6 başlığının hemen ardından gelen başlığın türü. IPv4 Protocol alanıyla aynı değerleri kullanır.',
        'values_en': [["6", "TCP (RFC 8200 §8.1)"], ["17", "UDP (RFC 8200 §8.1)"], ["58", "ICMPv6 (RFC 4443 §2.3)"]],
        'values_tr': [["6", "TCP (RFC 8200 §8.1)"], ["17", "UDP (RFC 8200 §8.1)"], ["58", "ICMPv6 (RFC 4443 §2.3)"]]
    },
    'hop': {
        'name': 'Hop Limit',
        'label': 'Atlama sınırı',
        'desc_en': 'Decremented by 1 by each node that forwards the packet; packet is discarded if Hop Limit reaches 0.',
        'desc_tr': 'Paketi ileten her düğüm değeri bir azaltır. Sıfır olarak gelen ya da sıfıra düşen paket iletilmez, atılır.'
    },
    'src': {
        'name': 'Source Address',
        'label': 'Kaynak adresi',
        'desc_en': '128-bit address of the originator of the packet.',
        'desc_tr': 'Paketi oluşturanın 128 bitlik adresi.'
    },
    'dst': {
        'name': 'Destination Address',
        'label': 'Hedef adresi',
        'desc_en': '128-bit address of the recipient of the packet (or next router if a Routing header is present).',
        'desc_tr': 'Paketin hedeflenen alıcısının 128 bitlik adresi. Routing başlığı varsa nihai alıcı olmayabilir.'
    }
}

TRANSLATIONS['ipv6-frag'] = {
    'next_header': {
        'name': 'Next Header',
        'label': 'Sonraki başlık',
        'desc_en': 'Identifies the initial header type of the Fragmentable Part. Uses standard IANA protocol numbers.',
        'desc_tr': 'Parçalanan yükün ilk başlık türünü tanımlar. IPv4 Protokol alanıyla aynı IANA değerlerini kullanır (örneğin UDP için 17, TCP için 6, ICMPv6 için 58).'
    },
    'reserved': {
        'name': 'Reserved',
        'label': 'Ayrılmış',
        'desc_en': '8-bit reserved field; initialized to zero by sender and ignored by receiver.',
        'desc_tr': 'Gelecekteki kullanım için ayrılmış 8 bitlik alan. İletimde sıfır olmalı, alımda yoksayılmalıdır.'
    },
    'fragment_offset': {
        'name': 'Fragment Offset',
        'label': 'Parça kayması',
        'desc_en': 'Offset (in 8-octet units) of data following this header, relative to the start of the Fragmentable Part.',
        'desc_tr': 'Bu başlığı izleyen verinin, orijinal paketin parçalanabilir kısmının başlangıcına göre 8 sekizlilik birimler cinsinden kayma miktarı.'
    },
    'res': {
        'name': 'Res',
        'label': 'Ayrılmış bitler',
        'desc_en': '2-bit reserved field; must be initialized to zero on transmission.',
        'desc_tr': 'Ayrılmış 2 bit. Gönderimde sıfır olmalıdır.'
    },
    'm': {
        'name': 'More Fragments (M)',
        'label': 'Daha fazla parça',
        'desc_en': '1 indicates more fragments follow; 0 indicates last fragment.',
        'desc_tr': '1 ise bu parçadan sonra başka parçaların da geleceğini; 0 ise bu parçanın son parça olduğunu belirtir.',
        'values_en': [["0", "Last fragment"], ["1", "More fragments follow"]],
        'values_tr': [["0", "Son parça"], ["1", "Devam eden parçalar var"]]
    },
    'identification': {
        'name': 'Identification',
        'label': 'Tanımlayıcı',
        'desc_en': '32-bit unique identifier to correlate fragments from the same original IPv6 packet.',
        'desc_tr': 'Aynı kaynak ve hedef adreslerine sahip parçaları yeniden birleştirirken doğru pakete ait parçaları eşleştiren benzersiz 32 bitlik kimlik.'
    },
    'payload': {
        'name': 'Fragmented Payload Data',
        'label': 'Parçalanmış yük verisi',
        'desc_en': 'Payload octets of this fragment. Length must be a multiple of 8 octets, except for the final fragment.',
        'desc_tr': 'Orijinal paketin bu parçaya düşen sekizlileridir. Son parça hariç tüm parçaların veri uzunluğu 8 sekizlinin katı olmalıdır.'
    }
}

TRANSLATIONS['srh'] = {
    'next_header': {
        'name': 'Next Header',
        'label': 'Sonraki başlık',
        'desc_en': 'Type of header immediately following the SRH; 59 indicates No Next Header (RFC 8200 §4.7).',
        'desc_tr': 'SRH\'den sonra gelen başlığın türü; IPv6 başlığının Next Header alanıyla aynı değerleri kullanır. 59 (No Next Header), SRH\'den sonra başka başlık olmadığını gösterir (RFC 8200 §4.7).'
    },
    'hdr_ext_len': {
        'name': 'Hdr Ext Len',
        'label': 'Başlık uzantısı uzunluğu',
        'desc_en': 'Length of SRH header in 8-octet units, not including the first 8 octets (e.g. 4 for 40 octets).',
        'desc_tr': 'İlk 8 sekizli hariç SRH başlığının uzunluğu, 8 sekizlilik birim olarak. 40 sekizlilik başlık için 4\'tür.'
    },
    'routing_type': {
        'name': 'Routing Type',
        'label': 'Yönlendirme türü',
        'desc_en': 'Segment Routing Header routing type; must be 4.',
        'desc_tr': 'Yönlendirme türü; SRH için 4.'
    },
    'segments_left': {
        'name': 'Segments Left',
        'label': 'Kalan kesim sayısı',
        'desc_en': 'Number of route segments remaining before destination is reached. Points to Segment List[n].',
        'desc_tr': 'Hedefe ulaşana kadar kalan yönlendirme adımlarının sayısı; Segment List\'in sıradaki elemanının indisidir.'
    },
    'last_entry': {
        'name': 'Last Entry',
        'label': 'Son girdi indisi',
        'desc_en': 'Index of the last element in Segment List; 0-indexed (e.g. 1 for two segments).',
        'desc_tr': 'Segment List dizisindeki son elemanın indisi; sıfırdan başlar (örneğin iki eleman için 1).'
    },
    'flags': {
        'name': 'Flags',
        'label': 'Bayraklar',
        'desc_en': '8-bit flags field; unused bits must be zero.',
        'desc_tr': 'Sekiz bitlik bayrak dizisi.'
    },
    'tag': {
        'name': 'Tag',
        'label': 'Etiket',
        'desc_en': 'Tag grouping a set of packets (e.g. packets sharing the same ingress interface).',
        'desc_tr': 'Bir grup paketi etiketleyen değer; örneğin paketin girdiği arayüz grubunu tanımlayabilir.'
    },
    'segment0': {
        'name': 'Segment List [0]',
        'label': 'Kesim listesi [0]',
        'desc_en': 'First segment (final destination); 128-bit IPv6 address.',
        'desc_tr': 'Listenin son adımı olan nihai hedef adres; 128 bitlik IPv6 adresi.'
    },
    'segment1': {
        'name': 'Segment List [1]',
        'label': 'Kesim listesi [1]',
        'desc_en': 'Second segment (first intermediate segment router); 128-bit IPv6 address.',
        'desc_tr': 'Listenin ilk adımı olan ara yönlendirici adresi; paket ilk olarak buraya yönlendirilir.'
    },
    'tlvs': {
        'name': 'Optional TLVs',
        'label': 'İsteğe bağlı TLV\'ler',
        'desc_en': 'Optional variable-length TLV structures following the Segment List.',
        'desc_tr': 'Kesim listesinden sonra gelebilen değişken uzunlukta TLV yapıları.'
    }
}

TRANSLATIONS['icmp'] = {
    'type': {
        'name': 'Type',
        'label': 'İleti türü',
        'desc_en': 'ICMP message type: 8 for Echo Request, 0 for Echo Reply.',
        'desc_tr': 'İletinin türü. 8 Yankı İsteği (Echo), 0 Yankı Yanıtıdır (Echo Reply).',
        'values_en': [["0", "Echo Reply"], ["3", "Destination Unreachable"], ["4", "Source Quench"], ["8", "Echo Request"], ["11", "Time Exceeded"]],
        'values_tr': [["0", "Yankı yanıtı (Echo Reply)"], ["3", "Hedefe ulaşılamıyor (Destination Unreachable)"], ["4", "Kaynağın gönderim hızını azaltma isteği (Source Quench)"], ["8", "Yankı isteği (Echo Request)"], ["11", "Süre aşıldı (Time Exceeded)"]]
    },
    'code': {
        'name': 'Code',
        'label': 'Alt kod',
        'desc_en': 'Further qualifies the message; 0 for Echo and Echo Reply.',
        'desc_tr': 'Türe bağlı alt kod. Yankı iletilerinde 0\'dır.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum of the entire ICMP message; zero during computation.',
        'desc_tr': 'ICMP mesajının tamamı üzerinden hesaplanan 16 bitlik bire tümleyen sağlama toplamı.'
    },
    'id': {
        'name': 'Identifier',
        'label': 'Tanımlayıcı',
        'desc_en': 'Identifier to match requests with replies; often set to the sending process ID.',
        'desc_tr': 'İstekle yanıtı eşleştirmeye yarayan tanımlayıcı; genellikle gönderen sürecin işlem numarası (PID) kullanılır.'
    },
    'seq': {
        'name': 'Sequence Number',
        'label': 'Sıra numarası',
        'desc_en': 'Sequence number incremented with each echo request sent.',
        'desc_tr': 'Her istekte bir artırılan sıra numarası.'
    },
    'data': {
        'name': 'Data',
        'label': 'Veri',
        'desc_en': 'Optional payload data sent in the request and echoed back in the reply.',
        'desc_tr': 'İstekte gönderilen ve yanıtta aynen geri döndürülen veri.'
    }
}

TRANSLATIONS['icmpv6'] = {
    'type': {
        'name': 'Type',
        'label': 'İleti türü',
        'desc_en': 'ICMPv6 message type: 0–127 error messages, 128–255 informational messages (128 Echo Request, 129 Echo Reply).',
        'desc_tr': 'İletinin türü: 0–127 hata iletileri, 128–255 bilgilendirme iletileridir.',
        'values_en': [["1", "Destination Unreachable"], ["2", "Packet Too Big"], ["3", "Time Exceeded"], ["128", "Echo Request"], ["129", "Echo Reply"]],
        'values_tr': [["1", "Hedefe ulaşılamıyor (Destination Unreachable)"], ["2", "Paket çok büyük (Packet Too Big)"], ["3", "Süre aşıldı (Time Exceeded)"], ["128", "Yankı isteği (Echo Request)"], ["129", "Yankı yanıtı (Echo Reply)"]]
    },
    'code': {
        'name': 'Code',
        'label': 'Alt kod',
        'desc_en': 'Subtype code qualifying the message; 0 for Echo Request and Echo Reply.',
        'desc_tr': 'Türe bağlı alt kod. Yankı iletilerinde her zaman 0\'dır.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum computed over the IPv6 pseudo-header and ICMPv6 message.',
        'desc_tr': 'IPv6 sözde başlığı ve ICMPv6 iletisinin tamamı üzerinden hesaplanan 16 bitlik sağlama toplamı.'
    },
    'body': {
        'name': 'Message Body',
        'label': 'İleti gövdesi',
        'desc_en': 'Message body depending on Type. For Echo Request/Reply: 16-bit Identifier, 16-bit Sequence Number, and payload.',
        'desc_tr': 'İleti türüne göre değişen gövde. Yankı iletisinde 16 bitlik Tanımlayıcı, 16 bitlik Sıra Numarası ve veri yükü bulunur.'
    }
}

TRANSLATIONS['igmp'] = {
    'type': {
        'name': 'Type',
        'label': 'İleti türü',
        'desc_en': 'IGMPv2 message type: 0x11 Membership Query, 0x16 v2 Report, 0x17 Leave Group.',
        'desc_tr': 'İletinin türü: 0x11 Üyelik Sorgusu, 0x16 v2 Üyelik Raporu, 0x17 Gruptan Ayrılma.',
        'values_en': [["0x11", "Membership Query"], ["0x12", "v1 Membership Report"], ["0x16", "v2 Membership Report"], ["0x17", "Leave Group"]],
        'values_tr': [["0x11", "Üyelik Sorgusu (Membership Query)"], ["0x12", "Sürüm 1 Üyelik Raporu (v1 Report)"], ["0x16", "Sürüm 2 Üyelik Raporu (v2 Report)"], ["0x17", "Gruptan Ayrılma (Leave Group)"]]
    },
    'max_resp_time': {
        'name': 'Max Resp Time',
        'label': 'Azami yanıt süresi',
        'desc_en': 'Maximum response time in tenths of a second (units of 100 ms). 0 in reports and leave messages.',
        'desc_tr': 'Sorguya verilecek yanıt için izin verilen en uzun süre, saniyenin onda biri (100 ms) cinsinden.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum of the 8-octet IGMP message.',
        'desc_tr': '8 sekizlilik IGMP iletisinin tamamı üzerinden hesaplanan 16 bitlik sağlama toplamı.'
    },
    'group_address': {
        'name': 'Group Address',
        'label': 'Grup adresi',
        'desc_en': 'Multicast group IPv4 address being reported or queried; 0.0.0.0 in a general query.',
        'desc_tr': 'Sorgulanan ya da bildirilen çok noktaya yayın (multicast) IPv4 adresi; genel sorguda 0.0.0.0\'dır.'
    }
}

TRANSLATIONS['igmpv3'] = {
    'type': {
        'name': 'Type',
        'label': 'İleti türü',
        'desc_en': 'IGMPv3 message type: 0x11 for Membership Query.',
        'desc_tr': 'İletinin türü. IGMPv3 Üyelik Sorgusu için 0x11\'dir.',
        'values_en': [["0x11", "Membership Query"], ["0x22", "v3 Membership Report"]],
        'values_tr': [["0x11", "Üyelik Sorgusu (Membership Query)"], ["0x22", "v3 Üyelik Raporu (v3 Report)"]]
    },
    'max_resp': {
        'name': 'Max Resp Code',
        'label': 'Azami yanıt kodu',
        'desc_en': 'Maximum response time code in units of 1/10 second; values >= 128 use floating-point decoding.',
        'desc_tr': 'Azami yanıt süresi kodu, 1/10 saniye biriminde. 128\'den küçükse doğrudan saniyenin onda biridir; 128 ve üzerinde kayan noktalı olarak çözülür.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum of the entire IGMP message.',
        'desc_tr': 'Tüm IGMP mesajı üzerinden hesaplanan 16 bitlik RFC 1071 sağlama toplamı.'
    },
    'group': {
        'name': 'Group Address',
        'label': 'Grup adresi',
        'desc_en': 'Multicast group address being queried; 0.0.0.0 in General Queries.',
        'desc_tr': 'Sorgulanan çok noktaya yayın grup adresi. Genel sorgularda 0.0.0.0\'dır.'
    },
    'flags': {
        'name': 'Resv',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved 4 bits; set to 0 by sender and ignored by receiver.',
        'desc_tr': 'Ayrılmış 4 bit; gönderici 0 gönderir, alıcı yok sayar.'
    },
    's': {
        'name': 'S (Suppress Router Processing)',
        'label': 'Yönlendirici işlemeyi bastır',
        'desc_en': 'Suppress Router-Side Processing bit. When 1, neighbor routers suppress timer updates.',
        'desc_tr': 'Yönlendirici tarafı işlemeyi bastırma bayrağı; 1 olduğunda komşu yönlendiriciler zamanlayıcı güncellemelerini durdurur.'
    },
    'qrv': {
        'name': 'QRV',
        'label': 'Sorgulayıcı dayanıklılık değeri',
        'desc_en': 'Querier\'s Robustness Variable (1–7).',
        'desc_tr': 'Sorgulayıcının sağlamlık değişkeni (Robustness Variable); 1–7 arası değer alır.'
    },
    'qqic': {
        'name': 'QQIC',
        'label': 'Sorgulayıcı sorgu aralığı kodu',
        'desc_en': 'Querier\'s Query Interval Code, specifying the query interval in seconds.',
        'desc_tr': 'Sorgulayıcının sorgu aralığı kodu (Querier\'s Query Interval Code), saniye cinsinden sorgu aralığını belirtir.'
    },
    'n': {
        'name': 'Number of Sources (N)',
        'label': 'Kaynak sayısı',
        'desc_en': 'Number of source IP addresses present in the Source Addresses list.',
        'desc_tr': 'Sorguda listelenen kaynak IP adreslerinin sayısı; genel sorgularda 0\'dır.'
    },
    'sources': {
        'name': 'Source Addresses',
        'label': 'Kaynak adresleri',
        'desc_en': 'List of N 32-bit unicast IP addresses of multicast sources being queried.',
        'desc_tr': 'Sorgulanan kaynakların 32 bitlik tek noktaya yayın (unicast) IP adresleri listesi.'
    }
}

TRANSLATIONS['gre'] = {
    'c': {
        'name': 'Checksum Present (C)',
        'label': 'Sağlama toplamı var',
        'desc_en': 'Checksum bit. 1 indicates Checksum and Reserved1 fields are present.',
        'desc_tr': 'Sağlama Toplamı Var (C) biti. 1 ise Checksum ve Reserved1 alanları mevcuttur.'
    },
    'res0': {
        'name': 'Reserved0',
        'label': 'Ayrılmış bitler',
        'desc_en': 'Reserved 12 bits; must be zero on transmission.',
        'desc_tr': 'Ayrılmış 12 bit; gönderimde sıfır olmalıdır.'
    },
    'ver': {
        'name': 'Version (Ver)',
        'label': 'Sürüm',
        'desc_en': 'GRE version number; 0 for RFC 2784 GRE.',
        'desc_tr': 'GRE sürüm numarası; standart GRE için 0 olmalıdır.'
    },
    'proto': {
        'name': 'Protocol Type',
        'label': 'Protokol türü',
        'desc_en': 'EtherType of the encapsulated payload protocol (e.g. 0x0800 for IPv4, 0x86DD for IPv6).',
        'desc_tr': 'Kapsüllenen yük protokolünün EtherType değeri (örneğin IPv4 için 0x0800).'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum of the GRE header and payload when C bit is 1.',
        'desc_tr': 'C biti 1 olduğunda başlık ve yük üzerinden hesaplanan 16 bitlik sağlama toplamı.'
    },
    'res1': {
        'name': 'Reserved1',
        'label': 'Ayrılmış',
        'desc_en': '16-bit reserved field present when C bit is 1; must be zero on transmission.',
        'desc_tr': 'C biti 1 olduğunda eklenen ve gönderimde sıfır olması gereken 16 bitlik ayrılmış alan.'
    }
}

TRANSLATIONS['ah'] = {
    'next_header': {
        'name': 'Next Header',
        'label': 'Sonraki başlık',
        'desc_en': 'Specifies the protocol type of the payload following this header (e.g. 6 for TCP, 17 for UDP, 4 for IPv4 encapsulation).',
        'desc_tr': 'Taşınan sonraki yükün protokol türünü belirtir (örneğin TCP için 6, UDP için 17, IPv4 tünellemesi için 4).',
        'values_en': [["6", "TCP (RFC 9293)"], ["17", "UDP (RFC 768)"], ["4", "IPv4 Encapsulation (RFC 2003)"]],
        'values_tr': [["6", "TCP (RFC 9293)"], ["17", "UDP (RFC 768)"], ["4", "IPv4 Kapsüllemesi (RFC 2003)"]]
    },
    'payload_len': {
        'name': 'Payload Len',
        'label': 'Yük uzunluğu',
        'desc_en': 'Length of AH in 32-bit words (4 octets) minus 2. Value is 4 for the standard 24-octet header.',
        'desc_tr': 'AH başlığının 32 bitlik sözcük (4 sekizli) cinsinden toplam uzunluğundan 2 çıkarılmış değeri. 24 sekizlilik standart başlık için 4\'tür.'
    },
    'reserved': {
        'name': 'Reserved',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved for future use; must be zero on transmission and ignored by receiver.',
        'desc_tr': 'Gelecekteki kullanım için ayrılmıştır; gönderici tarafından sıfırlanmalı ve alıcı tarafından yoksayılmalıdır.'
    },
    'spi': {
        'name': 'Security Parameters Index (SPI)',
        'label': 'Güvenlik parametreleri dizini',
        'desc_en': '32-bit index value specifying the Security Association (SA) on the receiving side.',
        'desc_tr': 'Alıcı tarafta paketin hangi Güvenlik İlişkisine (Security Association - SA) ait olduğunu belirten 32 bitlik dizin değeri.'
    },
    'seq': {
        'name': 'Sequence Number',
        'label': 'Sıra numarası',
        'desc_en': 'Monotonically increasing 32-bit counter incremented for each transmitted packet to prevent replay attacks.',
        'desc_tr': 'Tekrar oynatma saldırılarını önlemek için her gönderilen pakette bir artırılan tekdüze artan 32 bitlik sıra numarası.'
    },
    'icv': {
        'name': 'Integrity Check Value (ICV)',
        'label': 'Bütünlük denetim değeri',
        'desc_en': 'Variable-length cryptographic HMAC value (commonly 96 or 128 bits), padded to a multiple of 32 bits.',
        'desc_tr': 'Kriptografik HMAC algoritmasıyla üretilen değişken uzunluklu (genellikle 96 veya 128 bit) Bütünlük Denetim Değeri. 32 bitin katı olacak şekilde doldurulur.'
    }
}

TRANSLATIONS['esp'] = {
    'spi': {
        'name': 'Security Parameters Index (SPI)',
        'label': 'Güvenlik parametreleri dizini',
        'desc_en': '32-bit index specifying the Security Association (SA) on the receiving side. Cannot be 0.',
        'desc_tr': 'Alıcı tarafta paketin hangi Güvenlik İlişkisine (SA) ait olduğunu belirten 32 bitlik dizin; 0 olamaz.'
    },
    'seq': {
        'name': 'Sequence Number',
        'label': 'Sıra numarası',
        'desc_en': 'Monotonically increasing 32-bit counter starting at 1 for anti-replay protection.',
        'desc_tr': 'Her pakette bir artan sayaç. SA kurulurken 0\'dır, ilk paket 1 taşır; alıcı tekrar saldırılarını bu değerle ayıklar.'
    },
    'payload_data': {
        'name': 'Payload Data',
        'label': 'Yük verisi',
        'desc_en': 'Encrypted payload data specified by Next Header; includes IV if required by the cipher.',
        'desc_tr': 'Next Header alanının türünü belirttiği veri; şifreleme algoritması gerektiriyorsa başında bir başlatma vektörü (IV) bulunur. Uzunluğu pakete göre değişir; buradaki genişlik bu örneğe aittir.'
    },
    'padding': {
        'name': 'Padding',
        'label': 'Dolgu',
        'desc_en': '0–255 octets of padding to align ciphertext to cipher block size or 4-octet boundary.',
        'desc_tr': 'Şifreli metni blok ya da 4 sekizli sınırına tamamlayan 0–255 sekizlilik dolgu. Varsayılan içerik 1\'den başlayan artan baytlardır.'
    },
    'pad_length': {
        'name': 'Pad Length',
        'label': 'Dolgu uzunluğu',
        'desc_en': 'Number of padding octets immediately preceding this field; 0 indicates no padding.',
        'desc_tr': 'Hemen önündeki dolgu baytlarının sayısı; 0, dolgu olmadığını gösterir.'
    },
    'next_header': {
        'name': 'Next Header',
        'label': 'Sonraki başlık',
        'desc_en': 'Protocol type of the payload data; uses same values as IPv4 Protocol (e.g. 4 IPv4, 6 TCP, 17 UDP, 59 dummy).',
        'desc_tr': 'Payload Data\'daki verinin türü; IPv4 Protocol alanıyla aynı değerleri kullanır. 4 iç IPv4 paketi (tünel kipi), 6 TCP, 17 UDP, 59 sahte (dummy) pakettir.',
        'values_en': [["4", "IPv4 (tunnel mode)"], ["6", "TCP"], ["17", "UDP"], ["41", "IPv6 (tunnel mode)"], ["59", "Dummy packet (traffic masking)"]],
        'values_tr': [["4", "IPv4 (tünel kipi)"], ["6", "TCP"], ["17", "UDP"], ["41", "IPv6 (tünel kipi)"], ["59", "Sahte paket (trafik gizleme)"]]
    },
    'icv': {
        'name': 'Integrity Check Value (ICV)',
        'label': 'Bütünlük denetim değeri',
        'desc_en': 'Cryptographic checksum computed over ESP header, payload, and trailer; 16 octets in this example.',
        'desc_tr': 'ESP başlığı, yük ve kuyruk üzerinden hesaplanan bütünlük değeri. Uzunluğu seçilen algoritmaya bağlıdır; bu örnekte 16 sekizlidir.'
    }
}

TRANSLATIONS['ospf'] = {
    'version': {
        'name': 'Version #',
        'label': 'Sürüm numarası',
        'desc_en': 'OSPF version; 2 for OSPFv2 (RFC 2328).',
        'desc_tr': 'OSPF sürümü; bu belge sürüm 2\'yi tanımlar.'
    },
    'type': {
        'name': 'Type',
        'label': 'Tür',
        'desc_en': 'OSPF packet type: 1 Hello, 2 Database Description, 3 Link State Request, 4 Link State Update, 5 Link State Ack.',
        'desc_tr': 'OSPF paket türü.',
        'values_en': [["1", "Hello"], ["2", "Database Description"], ["3", "Link State Request"], ["4", "Link State Update"], ["5", "Link State Acknowledgment"]],
        'values_tr': [["1", "Komşu keşfi (Hello)"], ["2", "Veritabanı tanımı (Database Description)"], ["3", "Bağlantı durumu isteği (Link State Request)"], ["4", "Bağlantı durumu güncellemesi (Link State Update)"], ["5", "Bağlantı durumu onayı (Link State Acknowledgment)"]]
    },
    'length': {
        'name': 'Packet length',
        'label': 'Paket uzunluğu',
        'desc_en': 'Total length of the OSPF packet in octets, including the 24-octet standard header.',
        'desc_tr': 'Başlık dahil OSPF paketinin uzunluğu, sekizli olarak.'
    },
    'router_id': {
        'name': 'Router ID',
        'label': 'Yönlendirici kimliği',
        'desc_en': '32-bit Router ID of the router originating the packet.',
        'desc_tr': 'Paketi gönderen yönlendiricinin kimliği.'
    },
    'area_id': {
        'name': 'Area ID',
        'label': 'Bölge kimliği',
        'desc_en': '32-bit Area ID to which the packet belongs; 0.0.0.0 represents the backbone area.',
        'desc_tr': 'Paketin ait olduğu alan; omurga alanı 0.0.0.0\'dır.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': 'Standard IP checksum of the entire OSPF packet except authentication.',
        'desc_tr': 'Kimlik doğrulama alanı hariç bütün paketin IP sağlama toplamı.'
    },
    'autype': {
        'name': 'AuType',
        'label': 'Kimlik doğrulama türü',
        'desc_en': 'Authentication type: 0 Null, 1 Simple password, 2 Cryptographic authentication.',
        'desc_tr': 'Kullanılan kimlik doğrulama yöntemi.',
        'values_en': [["0", "Null authentication"], ["1", "Simple password"], ["2", "Cryptographic authentication"]],
        'values_tr': [["0", "Kimlik doğrulama yok (Null authentication)"], ["1", "Basit parola (Simple password)"], ["2", "Kriptografik kimlik doğrulama (Cryptographic authentication)"]]
    },
    'authentication': {
        'name': 'Authentication',
        'label': 'Kimlik doğrulama',
        'desc_en': '64-bit authentication field; uninterpreted when AuType is 0.',
        'desc_tr': 'Kimlik doğrulama yönteminin kullandığı 64 bitlik alan; AuType 0 iken anlamı yoktur.'
    },
    'network_mask': {
        'name': 'Network Mask',
        'label': 'Ağ maskesi',
        'desc_en': 'Network mask associated with the interface over which the Hello packet is sent.',
        'desc_tr': 'Paketin gönderildiği arayüzün ağ maskesi.'
    },
    'hello_interval': {
        'name': 'HelloInterval',
        'label': 'Komşu keşfi ileti aralığı',
        'desc_en': 'Number of seconds between Hello packets transmitted by this router (e.g. 10 s for broadcast networks).',
        'desc_tr': 'Yönlendiricinin Hello paketleri arasındaki süre, saniye olarak. Yerel ağ için örnek değer 10 s\'dir (RFC 2328 C.3).'
    },
    'options': {
        'name': 'Options',
        'label': 'Seçenekler',
        'desc_en': 'Optional routing capabilities supported by the router (RFC 2328 A.2); 0x02 indicates E-bit (external LSA support).',
        'desc_tr': 'Yönlendiricinin desteklediği isteğe bağlı yetenekler (RFC 2328 A.2). 0x02, E bitidir: AS dışı LSA\'ların alana taşınabildiğini gösterir.'
    },
    'rtr_pri': {
        'name': 'Rtr Pri',
        'label': 'Yönlendirici önceliği',
        'desc_en': 'Router priority in Designated Router election; 0 indicates ineligible to become DR or BDR.',
        'desc_tr': 'Yönlendiricinin Designated Router seçimindeki önceliği; 0, yönlendiricinin DR ya da BDR olamayacağını gösterir.'
    },
    'dead_interval': {
        'name': 'RouterDeadInterval',
        'label': 'Komşu zaman aşımı',
        'desc_en': 'Seconds to wait without receiving Hellos before declaring a neighbor down (typically 4 × HelloInterval).',
        'desc_tr': 'Bir komşudan Hello alınmayınca onun kapandığına karar verilene kadar geçen süre, saniye olarak. HelloInterval\'ın bir katı olmalıdır (örneğin 4) (RFC 2328 C.3).'
    },
    'dr': {
        'name': 'Designated Router',
        'label': 'Atanmış yönlendirici',
        'desc_en': 'IP address of the Designated Router for this network; 0.0.0.0 if none.',
        'desc_tr': 'Gönderenin bu ağ için bildiği Designated Router\'ın arayüz adresi; yoksa 0.0.0.0.'
    },
    'bdr': {
        'name': 'Backup Designated Router',
        'label': 'Yedek atanmış yönlendirici',
        'desc_en': 'IP address of the Backup Designated Router for this network; 0.0.0.0 if none.',
        'desc_tr': 'Backup Designated Router\'ın arayüz adresi; yoksa 0.0.0.0.'
    },
    'neighbor': {
        'name': 'Neighbor',
        'label': 'Komşu',
        'desc_en': 'Router IDs of neighbors from which valid Hello packets were received within RouterDeadInterval.',
        'desc_tr': 'Son RouterDeadInterval içinde Hello paketi alınan bir komşunun Router ID\'si. Liste uzunluğu değişkendir; bu örnekte bir komşu vardır.'
    }
}

TRANSLATIONS['vrrp'] = {
    'version': {
        'name': 'Version',
        'label': 'Sürüm',
        'desc_en': 'VRRP version; 3 for VRRPv3 (RFC 9568).',
        'desc_tr': 'VRRP sürümü; bu belge için 3.'
    },
    'type': {
        'name': 'Type',
        'label': 'Tür',
        'desc_en': 'VRRP packet type; only type 1 (ADVERTISEMENT) is defined.',
        'desc_tr': 'Paket türü; tanımlı tek tür 1, ADVERTISEMENT\'tır.'
    },
    'vrid': {
        'name': 'Virtual Rtr ID (VRID)',
        'label': 'Sanal yönlendirici kimliği',
        'desc_en': 'Identifies the virtual router on this LAN; range 1–255.',
        'desc_tr': 'Paketin ait olduğu sanal yönlendirici, 1–255.'
    },
    'priority': {
        'name': 'Priority',
        'label': 'Öncelik',
        'desc_en': 'Priority of the sending VRRP router for the virtual router (default 100 for backups, 255 for owner).',
        'desc_tr': 'Gönderen yönlendiricinin bu sanal yönlendirici için önceliği. Yedekler için varsayılan 100\'dür.',
        'values_en': [["255", "Address owner"], ["1–254", "Backup routers; default 100"], ["0", "Master releasing responsibility"]],
        'values_tr': [["255", "Sanal adreslerin sahibi"], ["1–254", "Yedek yönlendiriciler; varsayılan 100"], ["0", "Etkin yönlendirici görevi bırakıyor"]]
    },
    'count': {
        'name': 'IPvX Addr Count',
        'label': 'IP adresi sayısı',
        'desc_en': 'Number of IPv4 or IPv6 addresses included in this VRRP advertisement; at least 1.',
        'desc_tr': 'Pakette bulunan IPv4 ya da IPv6 adreslerinin sayısı; en az 1.'
    },
    'rsvd': {
        'name': 'Reserve',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved 4 bits; set to 0 by sender and ignored by receiver.',
        'desc_tr': '0 gönderilir, alıcı yok sayar.'
    },
    'max_adv': {
        'name': 'Max Advertise Interval',
        'label': 'Azami duyuru aralığı',
        'desc_en': 'Interval between advertisements in centiseconds (10 ms units); default is 100 (1 second).',
        'desc_tr': 'Duyurular arasındaki süre, santisaniye olarak; varsayılan 100 (1 saniye).'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit RFC 1071 checksum calculated over the entire VRRP message with Checksum set to 0.',
        'desc_tr': 'IPv4\'te VRRP mesajının, Checksum alanı 0 alınarak hesaplanan RFC 1071 sağlama toplamı.'
    },
    'address': {
        'name': 'IPv4 Address',
        'label': 'IPv4 adresi',
        'desc_en': 'IPv4 address associated with the virtual router; count specified by IPvX Addr Count.',
        'desc_tr': 'Sanal yönlendiriciyle ilişkili IPv4 adresi. Adres sayısı IPvX Addr Count\'tan gelir; bu örnekte bir adres vardır.'
    }
}

# ---------------------------------------------------------------------------
# TRANSPORT & TUNNELING: udp, tcp, sctp, dccp, quic, quic-1rtt, vxlan, geneve
# ---------------------------------------------------------------------------
TRANSLATIONS['udp'] = {
    'sport': {
        'name': 'Source Port',
        'label': 'Kaynak port',
        'desc_en': 'Optional source port; indicates sending process when meaningful, otherwise zero.',
        'desc_tr': 'İsteğe bağlı alan. Anlamlı olduğunda gönderen sürecin portunu belirtir; kullanılmıyorsa sıfır konur.'
    },
    'dport': {
        'name': 'Destination Port',
        'label': 'Hedef port',
        'desc_en': 'Destination port meaningful within the context of the destination IP address.',
        'desc_tr': 'Belirli bir internet hedef adresi bağlamında anlam taşıyan hedef portu.'
    },
    'length': {
        'name': 'Length',
        'label': 'Uzunluk',
        'desc_en': 'Length in octets of the UDP datagram, including this 8-octet header and data.',
        'desc_tr': 'UDP datagramının bayt cinsinden toplam uzunluğu. 8 baytlık sabit başlığı ve veri yükünü kapsar.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement of one\'s complement sum of pseudo-header, UDP header, and data.',
        'desc_tr': 'IP başlığından alınan bilgilerle kurulan sözde başlığın, UDP başlığının ve verinin bire tümleyen toplamının 16 bitlik bire tümleyeni.'
    },
    'data': {
        'name': 'Data',
        'label': 'Veri',
        'desc_en': 'Payload data octets carried by the datagram.',
        'desc_tr': 'Datagramın taşıdığı veri sekizlileri.'
    }
}

TRANSLATIONS['tcp'] = {
    'sport': {
        'name': 'Source Port',
        'label': 'Kaynak port',
        'desc_en': 'Source port number.',
        'desc_tr': 'Kaynak port numarası.'
    },
    'dport': {
        'name': 'Destination Port',
        'label': 'Hedef port',
        'desc_en': 'Destination port number (e.g. 80 for HTTP web servers).',
        'desc_tr': 'Hedef port numarası. Örneğin standart HTTP web sunucusu için 80.'
    },
    'seq': {
        'name': 'Sequence Number',
        'label': 'Sıra numarası',
        'desc_en': 'Sequence number of the first data octet in this segment (or Initial Sequence Number if SYN is set).',
        'desc_tr': 'Segmentteki ilk veri sekizlisinin sıra numarası. SYN bayrağı varsa bu değer başlangıç sıra numarasıdır (ISN) ve ilk veri sekizlisi ISN+1’dir.'
    },
    'ack': {
        'name': 'Acknowledgment Number',
        'label': 'Onay numarası',
        'desc_en': 'If ACK is set, this is the next sequence number the sender is expecting to receive.',
        'desc_tr': 'ACK biti varsa, gönderenin almayı beklediği bir sonraki sıra numarası. Bağlantı kurulduktan sonra her zaman gönderilir.'
    },
    'doff': {
        'name': 'Data Offset',
        'label': 'Veri başlangıcı',
        'desc_en': 'Length of the TCP header in 32-bit words (range 5–15; multiply by 4 to get bytes).',
        'desc_tr': 'TCP başlığının 32 bitlik sözcük cinsinden uzunluğu. Geçerli değer 5–15’tir; bu değerin dört katı, yükün başladığı bayt ofsetini verir.'
    },
    'rsrvd': {
        'name': 'Reserved',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved control bits for future use; must be zero in transmitted segments.',
        'desc_tr': 'İleride kullanılmak üzere ayrılmış denetim bitleri. Üretilen segmentlerde sıfır olmalı, alınan segmentlerde yok sayılmalıdır.'
    },
    'cwr': {
        'name': 'CWR',
        'label': 'Tıkanıklık penceresi azaltıldı',
        'desc_en': 'Congestion Window Reduced flag (RFC 3168).',
        'desc_tr': 'Congestion Window Reduced.'
    },
    'ece': {
        'name': 'ECE',
        'label': 'ECN bildirimi',
        'desc_en': 'ECN-Echo flag (RFC 3168).',
        'desc_tr': 'ECN-Echo.'
    },
    'urg': {
        'name': 'URG',
        'label': 'Acil işaretçisi geçerli',
        'desc_en': 'Urgent Pointer field significant.',
        'desc_tr': 'Urgent Pointer alanı anlamlıdır.'
    },
    'ackf': {
        'name': 'ACK',
        'label': 'Onay numarası geçerli',
        'desc_en': 'Acknowledgment field significant.',
        'desc_tr': 'Acknowledgment alanı anlamlıdır.'
    },
    'psh': {
        'name': 'PSH',
        'label': 'Veriyi uygulamaya hemen ilet',
        'desc_en': 'Push Function: request immediate delivery of data to receiving application.',
        'desc_tr': 'Push işlevi.'
    },
    'rst': {
        'name': 'RST',
        'label': 'Bağlantıyı sıfırla',
        'desc_en': 'Reset the connection.',
        'desc_tr': 'Bağlantıyı sıfırla.'
    },
    'syn': {
        'name': 'SYN',
        'label': 'Sıra numaralarını eşzamanla',
        'desc_en': 'Synchronize sequence numbers during connection establishment.',
        'desc_tr': 'Sıra numaralarını eşzamanla.'
    },
    'fin': {
        'name': 'FIN',
        'label': 'Gönderim sona erdi',
        'desc_en': 'No more data from sender; initiates connection teardown.',
        'desc_tr': 'Gönderenden başka veri yok.'
    },
    'window': {
        'name': 'Window',
        'label': 'Pencere boyutu',
        'desc_en': 'Number of data octets beginning with ACK number that sender is willing to accept (receive window).',
        'desc_tr': 'Gönderenin, Acknowledgment alanındaki numaradan başlayarak kabul etmeye hazır olduğu veri sekizlisi sayısı. İşaretsiz sayı olarak ele alınmalıdır.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum of all 16-bit words in header, pseudo-header, and text.',
        'desc_tr': 'Başlık ve metindeki 16 bitlik sözcüklerin bire tümleyen toplamının 16 bitlik bire tümleyeni. Hesap sırasında alanın kendisi sıfır sayılır.'
    },
    'urgent': {
        'name': 'Urgent Pointer',
        'label': 'Acil işaretçisi',
        'desc_en': 'Positive offset from sequence number indicating the location of urgent data; valid only if URG flag is set.',
        'desc_tr': 'Acil verinin yerini segmentin sıra numarasına göre pozitif bir uzaklık olarak verir. Yalnızca URG biti olan segmentlerde yorumlanır.'
    },
    'options': {
        'name': 'Options',
        'label': 'Seçenekler',
        'desc_en': 'Variable-length options (e.g. MSS, Window Scale, SACK, Timestamps); padded to a 32-bit boundary.',
        'desc_tr': 'Değişken uzunlukta seçenekler; başlık 32 bitin katı olacak biçimde doldurulur.'
    }
}

TRANSLATIONS['sctp'] = {
    'sport': {
        'name': 'Source Port',
        'label': 'Kaynak port',
        'desc_en': 'SCTP source port number of the sender; zero cannot be used.',
        'desc_tr': 'Göndericinin SCTP port numarası. Sıfır değeri kullanılamaz.'
    },
    'dport': {
        'name': 'Destination Port',
        'label': 'Hedef port',
        'desc_en': 'SCTP destination port number of the receiver (e.g. 3868 for Diameter, 2905 for M3UA).',
        'desc_tr': 'Hedef SCTP port numarası. Örneğin Diameter için 3868, M3UA için 2905.'
    },
    'vtag': {
        'name': 'Verification Tag',
        'label': 'Doğrulama etiketi',
        'desc_en': '32-bit random identifier for packet verification by receiver; must be 0x00000000 in INIT chunks.',
        'desc_tr': 'Alıcının paketi doğrulaması için kullanılan 32 bitlik rastgele kimlik. İlişki başlatılırken (INIT yığınında) 0x00000000 olmalıdır.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '32-bit CRC-32c checksum protecting the entire SCTP packet (common header and all chunks).',
        'desc_tr': 'Tüm SCTP paketini (ortak başlık ve yığınlar) koruyan 32 bitlik CRC-32c sağlama toplamı.'
    },
    'chunks': {
        'name': 'Chunks',
        'label': 'Yığınlar',
        'desc_en': 'Control or data chunks carried in the packet (e.g. INIT, SACK, DATA), each with Type, Flags, Length, and Value.',
        'desc_tr': 'Pakette taşınan denetim veya veri yığınları (örneğin INIT, INIT ACK, SACK, DATA). Her yığın Tür (8 bit), Bayraklar (8 bit), Uzunluk (16 bit) ve Değer alanlarından oluşur.'
    }
}

TRANSLATIONS['dccp'] = {
    'sport': {
        'name': 'Source Port',
        'label': 'Kaynak port',
        'desc_en': 'Source port number of the sending client/server.',
        'desc_tr': 'Paketi gönderen istemcinin port numarası.'
    },
    'dport': {
        'name': 'Destination Port',
        'label': 'Hedef port',
        'desc_en': 'Destination port number (e.g. 5004 for media streams over DCCP).',
        'desc_tr': 'Hedef port numarası. Örneğin RTP üzerinden DCCP ortam akışları için 5004.'
    },
    'data_offset': {
        'name': 'Data Offset',
        'label': 'Veri ofseti',
        'desc_en': 'Offset to data in 32-bit words; 3 for the base 12-octet header.',
        'desc_tr': 'DCCP başlığının ve seçeneklerinin 32 bitlik sözcük cinsinden uzunluğu. Yalnızca 12 sekizlilik temel başlık için 3\'tür.'
    },
    'ccval': {
        'name': 'CCVal',
        'label': 'Tıkanıklık denetim değeri',
        'desc_en': 'Congestion Control Value used by sender\'s CCID for window or RTT tracking.',
        'desc_tr': 'Tıkanıklık Denetim Değeri (CCVal); göndericinin Tıkanıklık Denetim Profili (CCID) tarafından pencere veya RTT takibi için kullanılır.'
    },
    'cscov': {
        'name': 'CsCov',
        'label': 'Sağlama kapsamı',
        'desc_en': 'Checksum Coverage: 0 indicates checksum covers the entire header and payload.',
        'desc_tr': 'Sağlama Toplamı Kapsamı (Checksum Coverage). 0 ise başlık ve yükün tamamı korunur.'
    },
    'checksum': {
        'name': 'Checksum',
        'label': 'Sağlama toplamı',
        'desc_en': '16-bit one\'s complement checksum computed over the IP pseudo-header and DCCP packet.',
        'desc_tr': 'IP sözde başlığı ve DCCP paketi üzerinden RFC 1071 yöntemine göre hesaplanan 16 bitlik sağlama toplamı.'
    },
    'res': {
        'name': 'Res',
        'label': 'Ayrılmış',
        'desc_en': '3-bit reserved field; must be set to zero on transmission.',
        'desc_tr': 'Ayrılmış 3 bit. Gönderimde sıfırlanmalıdır.'
    },
    'type': {
        'name': 'Type',
        'label': 'İleti türü',
        'desc_en': 'DCCP packet type: 1 Request, 2 Response, 3 Data, 4 Ack, 5 DataAck, 7 Close, 8 Reset.',
        'desc_tr': 'DCCP paketinin türü: 1 DCCP-Request, 2 DCCP-Response, 3 DCCP-Data, 4 DCCP-Ack, 5 DCCP-DataAck vb.',
        'values_en': [["1", "DCCP-Request"], ["2", "DCCP-Response"], ["3", "DCCP-Data"], ["4", "DCCP-Ack"], ["5", "DCCP-DataAck"], ["7", "DCCP-Close"], ["8", "DCCP-Reset"]],
        'values_tr': [["1", "DCCP-Request (Bağlantı İsteği)"], ["2", "DCCP-Response (Bağlantı Yanıtı)"], ["3", "DCCP-Data (Veri)"], ["4", "DCCP-Ack (Onay)"], ["5", "DCCP-DataAck (Veri ve Onay)"], ["7", "DCCP-Close (Kapatma)"], ["8", "DCCP-Reset (Sıfırlama)"]]
    },
    'x': {
        'name': 'X',
        'label': 'Genişletilmiş sıra bayrağı',
        'desc_en': 'Extended Sequence Numbers: 0 indicates 24-bit sequence numbers; 1 indicates 48-bit.',
        'desc_tr': 'Genişletilmiş Sıra Numaraları bayrağı; 0 ise 24 bitlik temel sıra numarası kullanılır (X=0).'
    },
    'seq': {
        'name': 'Sequence Number',
        'label': 'Sıra numarası',
        'desc_en': '24-bit sequence number incremented for every packet transmitted.',
        'desc_tr': 'Gönderilen her DCCP paketinde artırılan 24 bitlik sıra numarası (X=0 iken).'
    }
}

TRANSLATIONS['quic'] = {
    'header_form': {
        'name': 'Header Form',
        'label': 'Başlık biçimi',
        'desc_en': '1 for Long Header packets (used during connection establishment).',
        'desc_tr': 'Uzun başlık biçimi için 1; el sıkışma ve bağlantı kurulum paketlerinde kullanılır.'
    },
    'fixed_bit': {
        'name': 'Fixed Bit',
        'label': 'Sabit bit',
        'desc_en': 'Always set to 1 in QUIC packets.',
        'desc_tr': 'QUIC paketlerinde her zaman 1.'
    },
    'long_packet_type': {
        'name': 'Long Packet Type',
        'label': 'Uzun paket türü',
        'desc_en': 'QUIC long header packet type: 0 Initial, 1 0-RTT, 2 Handshake, 3 Retry.',
        'desc_tr': 'Uzun başlık paket türü: 0 Başlangıç (Initial), 1 0-RTT, 2 Bağlantı kurulumu (Handshake), 3 Yeniden deneme (Retry).',
        'values_en': [["0", "Initial"], ["1", "0-RTT"], ["2", "Handshake"], ["3", "Retry"]],
        'values_tr': [["0", "Başlangıç (Initial)"], ["1", "0-RTT"], ["2", "Bağlantı kurulumu (Handshake)"], ["3", "Yeniden deneme (Retry)"]]
    },
    'reserved_bits': {
        'name': 'Reserved Bits',
        'label': 'Ayrılmış bitler',
        'desc_en': 'Reserved bits; must be set to 0 after header protection removal.',
        'desc_tr': 'Ayrılmış; başlık koruması kaldırıldıktan sonra 0 olmalıdır.'
    },
    'pn_length': {
        'name': 'Packet Number Length',
        'label': 'Paket numarası uzunluğu',
        'desc_en': 'Packet Number field length minus one, in octets (0 means 1 octet).',
        'desc_tr': 'Packet Number alanının uzunluğu eksi bir, sekizli olarak; 0 bir sekizli demektir.'
    },
    'version': {
        'name': 'Version',
        'label': 'Sürüm',
        'desc_en': 'QUIC protocol version; 0x00000001 for QUIC version 1 (RFC 9000).',
        'desc_tr': 'QUIC sürümü; sürüm 1 için 0x00000001 (RFC 9000). 0 ise sürüm uzlaşma paketidir.'
    },
    'dcid_len': {
        'name': 'DCID Length',
        'label': 'Hedef bağlantı kimliği uzunluğu',
        'desc_en': 'Length in octets of the Destination Connection ID (0–20 octets).',
        'desc_tr': 'Ardından gelen Hedef Bağlantı Kimliği alanının sekizli cinsinden uzunluğu; 0–20 sekizlidir.'
    },
    'dcid': {
        'name': 'Destination Connection ID',
        'label': 'Hedef bağlantı kimliği',
        'desc_en': 'Destination Connection ID identifying the connection on the receiving endpoint.',
        'desc_tr': 'Alıcının bu paketi ait olduğu bağlantıyla eşleştirmek için kullandığı bağlantı kimliği.'
    },
    'scid_len': {
        'name': 'SCID Length',
        'label': 'Kaynak bağlantı kimliği uzunluğu',
        'desc_en': 'Length in octets of the Source Connection ID (0–20 octets).',
        'desc_tr': 'Kaynak Bağlantı Kimliği alanının sekizli cinsinden uzunluğu.'
    },
    'scid': {
        'name': 'Source Connection ID',
        'label': 'Kaynak bağlantı kimliği',
        'desc_en': 'Source Connection ID that the sender wishes the peer to use for replies.',
        'desc_tr': 'Gönderenin, karşı tarafın kendisine yazarken kullanmasını istediği bağlantı kimliği.'
    },
    'token_length': {
        'name': 'Token Length',
        'label': 'Belirteç uzunluğu',
        'desc_en': 'Length of the Token field as a variable-length integer; 0 if no token.',
        'desc_tr': 'Ardından gelen belirtecin uzunluğu, değişken uzunluklu tamsayı olarak. Belirteç yoksa 0.'
    },
    'token': {
        'name': 'Token',
        'label': 'Belirteç',
        'desc_en': 'Address validation token issued previously by server in a Retry packet or NEW_TOKEN frame.',
        'desc_tr': 'Sunucunun bir Retry paketinde ya da önceki bir bağlantıda NEW_TOKEN çerçevesiyle verdiği belirteç; istemcinin adresini doğrulamaya yarar. İçeriği yalnızca sunucu için anlamlıdır.'
    },
    'length': {
        'name': 'Length',
        'label': 'Uzunluk',
        'desc_en': 'Length of Packet Number and protected payload in octets, encoded as a variable-length integer.',
        'desc_tr': 'Packet Number ve şifreli yükün toplam uzunluğu, değişken uzunluklu tamsayı olarak. Aynı datagramda birden çok QUIC paketi taşınabildiği için gereklidir.'
    },
    'packet_number': {
        'name': 'Packet Number',
        'label': 'Paket numarası',
        'desc_en': 'Packet number; length derived from Packet Number Length in the first octet.',
        'desc_tr': 'Paket numarası; uzunluğu ilk sekizlideki Packet Number Length alanından gelir. Her paket numara uzayı (Initial, Handshake, uygulama) 0\'dan başlar.'
    },
    'payload': {
        'name': 'Packet Payload',
        'label': 'Paket yükü',
        'desc_en': 'Encrypted payload frames (e.g. CRYPTO with TLS ClientHello, ACK, PADDING) plus 16-octet AEAD auth tag.',
        'desc_tr': 'Şifreli çerçeveler: Initial\'da TLS ClientHello\'yu taşıyan CRYPTO çerçeveleri, ACK ve PADDING. Sonunda AEAD algoritmasının 16 sekizlilik doğrulama etiketi bulunur.'
    }
}

TRANSLATIONS['quic-1rtt'] = {
    'header_form': {
        'name': 'Header Form',
        'label': 'Başlık biçimi',
        'desc_en': '0 for Short Header packets (1-RTT application data).',
        'desc_tr': 'Kısa başlık için 0.'
    },
    'fixed_bit': {
        'name': 'Fixed Bit',
        'label': 'Sabit bit',
        'desc_en': 'Always set to 1.',
        'desc_tr': 'Her zaman 1.'
    },
    'spin_bit': {
        'name': 'Spin Bit',
        'label': 'Gecikme ölçüm biti',
        'desc_en': 'Latency spin bit used for passive RTT measurement across network paths (RFC 9000 §17.4).',
        'desc_tr': 'Gecikme ölçümü için kullanılabilen bit; kullanılmıyorsa uç nokta rastgele değer gönderebilir (RFC 9000 §17.4).'
    },
    'reserved_bits': {
        'name': 'Reserved Bits',
        'label': 'Ayrılmış bitler',
        'desc_en': 'Reserved bits; must be 0 after header protection removal.',
        'desc_tr': 'Ayrılmış; başlık koruması kaldırıldıktan sonra 0 olmalıdır.'
    },
    'key_phase': {
        'name': 'Key Phase',
        'label': 'Anahtar evresi',
        'desc_en': 'Key phase bit indicating which packet protection key is used to protect this packet.',
        'desc_tr': 'Paketi korumak için kullanılan anahtar kuşağı.'
    },
    'pn_length': {
        'name': 'Packet Number Length',
        'label': 'Paket numarası uzunluğu',
        'desc_en': 'Packet Number field length minus one, in octets (1 means 2 octets).',
        'desc_tr': 'Packet Number alanının uzunluğu eksi bir, sekizli olarak; 1, iki sekizli demektir.'
    },
    'dcid': {
        'name': 'Destination Connection ID',
        'label': 'Hedef bağlantı kimliği',
        'desc_en': 'Destination Connection ID chosen by receiver to identify the connection.',
        'desc_tr': 'Alıcının bağlantıyı tanıdığı kimlik. Uzunluğu pakette yazmaz; alıcı onu kendisi seçtiği için bilir.'
    },
    'packet_number': {
        'name': 'Packet Number',
        'label': 'Paket numarası',
        'desc_en': 'Packet number; length specified by Packet Number Length in the first octet.',
        'desc_tr': 'Paket numarası; uzunluğu ilk sekizlideki Packet Number Length\'ten gelir.'
    },
    'payload': {
        'name': 'Packet Payload',
        'label': 'Paket yükü',
        'desc_en': 'Encrypted application frames (e.g. STREAM, ACK) followed by 16-octet AEAD auth tag.',
        'desc_tr': 'Şifreli çerçeveler (STREAM, ACK vb.) ve AEAD doğrulama etiketi.'
    }
}

TRANSLATIONS['vxlan'] = {
    'r0': {'name': 'Reserved (R)', 'label': 'Ayrılmış', 'desc_en': 'Reserved bit; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış bit. Gönderimde sıfır olmalıdır.'},
    'r1': {'name': 'Reserved (R)', 'label': 'Ayrılmış', 'desc_en': 'Reserved bit; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış bit. Gönderimde sıfır olmalıdır.'},
    'r2': {'name': 'Reserved (R)', 'label': 'Ayrılmış', 'desc_en': 'Reserved bit; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış bit. Gönderimde sıfır olmalıdır.'},
    'r3': {'name': 'Reserved (R)', 'label': 'Ayrılmış', 'desc_en': 'Reserved bit; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış bit. Gönderimde sıfır olmalıdır.'},
    'i': {'name': 'VNI Flag (I)', 'label': 'VNI bayrağı', 'desc_en': 'VXLAN Network Identifier (VNI) presence bit; must be set to 1.', 'desc_tr': 'Geçerli bir VXLAN Ağ Tanımlayıcısı (VNI) olduğunu belirtir. İletim için 1 olmalıdır.'},
    'r4': {'name': 'Reserved (R)', 'label': 'Ayrılmış', 'desc_en': 'Reserved bit; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış bit. Gönderimde sıfır olmalıdır.'},
    'r5': {'name': 'Reserved (R)', 'label': 'Ayrılmış', 'desc_en': 'Reserved bit; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış bit. Gönderimde sıfır olmalıdır.'},
    'r6': {'name': 'Reserved (R)', 'label': 'Ayrılmış', 'desc_en': 'Reserved bit; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış bit. Gönderimde sıfır olmalıdır.'},
    'res0': {'name': 'Reserved', 'label': 'Ayrılmış alan', 'desc_en': '24-bit reserved field; must be set to 0 on transmission and ignored by receiver.', 'desc_tr': 'Gelecekteki kullanım için ayrılmış 24 bit. Gönderimde sıfır olmalı, alımda yoksayılmalıdır.'},
    'vni': {'name': 'VNI', 'label': 'Ağ tanımlayıcısı', 'desc_en': '24-bit VXLAN Network Identifier (VNI) specifying the overlay virtual segment.', 'desc_tr': 'İletişim kuran sanal makinelerin bulunduğu bireysel VXLAN mantıksal ağını tanımlayan 24 bitlik kimlik değeri.'},
    'res1': {'name': 'Reserved', 'label': 'Ayrılmış alan', 'desc_en': '8-bit reserved field; must be set to 0 on transmission.', 'desc_tr': 'Ayrılmış 8 bit. Gönderimde sıfır olmalıdır.'},
    'inner_frame': {'name': 'Inner Ethernet Frame', 'label': 'İç Ethernet çerçevesi', 'desc_en': 'Encapsulated inner Ethernet frame (Destination MAC, Source MAC, EtherType, payload), excluding FCS.', 'desc_tr': 'Tünel içinde taşınan kapsüllenmiş iç Ethernet çerçevesidir (Hedef MAC, Kaynak MAC, EtherType ve yük). FCS alanı dahil edilmez.'}
}

TRANSLATIONS['geneve'] = {
    'ver': {
        'name': 'Version (Ver)',
        'label': 'Sürüm',
        'desc_en': 'Geneve tunnel header version; currently 0. Unknown versions must be dropped.',
        'desc_tr': 'Tünel başlığının sürümü; güncel sürüm 0\'dır. Bilinmeyen sürümdeki paketler atılır.'
    },
    'opt_len': {
        'name': 'Opt Len',
        'label': 'Seçenek uzunluğu',
        'desc_en': 'Total length of variable-length options in 4-octet words; 0 indicates no options.',
        'desc_tr': 'Değişken uzunluklu seçeneklerin toplam uzunluğu, 4 sekizlilik sözcük olarak. 0, seçenek olmadığını gösterir.'
    },
    'o': {
        'name': 'O (OAM)',
        'label': 'İşletim ve bakım iletisi',
        'desc_en': 'OAM bit; 1 indicates this packet contains operations and management data rather than payload.',
        'desc_tr': 'Paket yük değil denetim (OAM) iletisi taşıyorsa 1. Bu paketler normal yük gibi iletilmez, tünel uç noktası tarafından işlenir.'
    },
    'c': {
        'name': 'Critical Options (C)',
        'label': 'Kritik seçenek',
        'desc_en': 'Critical options present bit; 1 if at least one critical option TLV is present.',
        'desc_tr': 'Seçeneklerden en az biri kritikse 1. Kritik bir seçeneği tanımayan uç nokta paketi atmalıdır.'
    },
    'rsvd': {
        'name': 'Rsvd.',
        'label': 'Ayrılmış',
        'desc_en': '6-bit reserved field; must be 0 on transmission and ignored on receipt.',
        'desc_tr': 'Ayrılmış; gönderimde 0, alımda yok sayılır.'
    },
    'protocol_type': {
        'name': 'Protocol Type',
        'label': 'Protokol türü',
        'desc_en': 'EtherType of the encapsulated payload (e.g. 0x6558 for Transparent Ethernet Bridging, 0x0800 IPv4).',
        'desc_tr': 'Seçeneklerden sonra gelen yükün türü, EtherType değeriyle. 0x6558 (Transparent Ethernet Bridging) katman 2 Ethernet çerçevesidir.',
        'values_en': [["0x6558", "Ethernet frame (Transparent Bridging)"], ["0x0800", "IPv4"], ["0x86dd", "IPv6"]],
        'values_tr': [["0x6558", "Ethernet çerçevesi"], ["0x0800", "IPv4"], ["0x86dd", "IPv6"]]
    },
    'vni': {
        'name': 'Virtual Network Identifier (VNI)',
        'label': 'Sanal ağ kimliği',
        'desc_en': '24-bit Virtual Network Identifier (VNI) identifying the overlay broadcast domain.',
        'desc_tr': 'Paketin ait olduğu sanal ağın 24 bitlik kimliği; VXLAN\'daki VNI ile aynı genişliktedir.'
    },
    'reserved': {
        'name': 'Reserved',
        'label': 'Ayrılmış',
        'desc_en': '8-bit reserved field; must be set to 0 on transmission.',
        'desc_tr': 'Ayrılmış; gönderimde 0.'
    },
    'options': {
        'name': 'Variable-Length Options',
        'label': 'Değişken uzunluklu seçenekler',
        'desc_en': 'Sequence of TLV formatted options whose length is specified by Opt Len.',
        'desc_tr': 'Opt Len ile belirtilen uzunlukta, art arda dizilmiş TLV biçiminde seçenekler.'
    }
}

# ---------------------------------------------------------------------------
# SERVICES & HOST CONFIG: dns, coap, dhcp, dhcpv6, ntp
# ---------------------------------------------------------------------------
TRANSLATIONS['dns'] = {
    'id': {
        'name': 'ID',
        'label': 'Sorgu kimliği',
        'desc_en': '16-bit identifier assigned by the program generating the query; copied into replies to match responses.',
        'desc_tr': 'Sorguyu üreten programın atadığı tanımlayıcı. Yanıta kopyalanır; istekte bulunan bununla yanıtları bekleyen sorgularla eşleştirir.'
    },
    'qr': {
        'name': 'QR',
        'label': 'Sorgu veya yanıt',
        'desc_en': '1 bit indicating whether message is a query (0) or response (1).',
        'desc_tr': 'İletinin sorgu (0) mu yanıt (1) mı olduğunu belirtir.'
    },
    'opcode': {
        'name': 'OPCODE',
        'label': 'İşlem kodu',
        'desc_en': '4-bit field specifying query type: 0 Standard query (QUERY), 1 Inverse query (IQUERY), 2 Status request.',
        'desc_tr': 'Sorgunun türü. Sorguyu başlatan belirler, yanıta kopyalanır.',
        'values_en': [["0", "Standard query (QUERY)"], ["1", "Inverse query (IQUERY)"], ["2", "Server status (STATUS)"], ["3–15", "Reserved for future use"]],
        'values_tr': [["0", "Standart sorgu (QUERY)"], ["1", "Ters sorgu (IQUERY)"], ["2", "Sunucu durum isteği (STATUS)"], ["3–15", "İleride kullanım için ayrılmış"]]
    },
    'aa': {
        'name': 'AA',
        'label': 'Yetkili yanıt',
        'desc_en': 'Authoritative Answer: 1 indicates the responding name server is an authority for the domain in question.',
        'desc_tr': 'Authoritative Answer. Yanıtlarda geçerlidir: yanıtlayan ad sunucusu, soru bölümündeki alan adı için yetkilidir.'
    },
    'tc': {
        'name': 'TC',
        'label': 'Kesilmiş ileti',
        'desc_en': 'TrunCation: 1 specifies that message was truncated due to length greater than that permitted on channel.',
        'desc_tr': 'TrunCation. İleti, iletim kanalının izin verdiğinden uzun olduğu için kesilmiştir.'
    },
    'rd': {
        'name': 'RD',
        'label': 'Özyineleme isteği',
        'desc_en': 'Recursion Desired: directs the name server to pursue the query recursively.',
        'desc_tr': 'Recursion Desired. Sorguda ayarlanabilir ve yanıta kopyalanır; ad sunucusundan sorguyu özyinelemeli izlemesini ister.'
    },
    'ra': {
        'name': 'RA',
        'label': 'Özyineleme desteği',
        'desc_en': 'Recursion Available: set or cleared in response to denote recursive query support by the server.',
        'desc_tr': 'Recursion Available. Yanıtta, ad sunucusunun özyinelemeli sorgu desteği sunup sunmadığını belirtir.'
    },
    'z': {
        'name': 'Z',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved for future use; must be zero in all queries and responses.',
        'desc_tr': 'İleride kullanım için ayrılmıştır. Bütün sorgu ve yanıtlarda sıfır olmalıdır.'
    },
    'rcode': {
        'name': 'RCODE',
        'label': 'Yanıt kodu',
        'desc_en': 'Response code: 0 No error, 1 Format error, 2 Server failure, 3 Non-Existent Domain (NXDOMAIN), etc.',
        'desc_tr': 'Yanıt kodu; yanıtlarda ayarlanır.',
        'values_en': [["0", "No error"], ["1", "Format error"], ["2", "Server failure"], ["3", "Name Error (NXDOMAIN)"], ["4", "Not implemented"], ["5", "Refused"], ["6–15", "Reserved"]],
        'values_tr': [["0", "Hata yok"], ["1", "Biçim hatası"], ["2", "Sunucu hatası"], ["3", "Ad hatası: alan adı yok"], ["4", "Uygulanmamış"], ["5", "Reddedildi"], ["6–15", "İleride kullanım için ayrılmış"]]
    },
    'qdcount': {
        'name': 'QDCOUNT',
        'label': 'Soru sayısı',
        'desc_en': 'Number of entries in the question section.',
        'desc_tr': 'Soru bölümündeki kayıt sayısı.'
    },
    'ancount': {
        'name': 'ANCOUNT',
        'label': 'Yanıt kaydı sayısı',
        'desc_en': 'Number of resource records in the answer section.',
        'desc_tr': 'Yanıt bölümündeki kaynak kaydı sayısı.'
    },
    'nscount': {
        'name': 'NSCOUNT',
        'label': 'Yetki kaydı sayısı',
        'desc_en': 'Number of name server resource records in the authority records section.',
        'desc_tr': 'Yetki kayıtları bölümündeki ad sunucusu kaynak kaydı sayısı.'
    },
    'arcount': {
        'name': 'ARCOUNT',
        'label': 'Ek kayıt sayısı',
        'desc_en': 'Number of resource records in the additional records section.',
        'desc_tr': 'Ek kayıtlar bölümündeki kaynak kaydı sayısı.'
    },
    'sections': {
        'name': 'Sections',
        'label': 'Bölümler',
        'desc_en': 'Question, Answer, Authority, and Additional sections. Example contains a single question (QNAME, QTYPE, QCLASS).',
        'desc_tr': 'Soru, yanıt, yetki ve ek bölümleri. Örnekte tek bir soru vardır: QNAME, QTYPE ve QCLASS (RFC 1035 §4.1.2).'
    }
}

TRANSLATIONS['coap'] = {
    'ver': {
        'name': 'Version (Ver)',
        'label': 'Sürüm',
        'desc_en': 'CoAP version number; binary 01 (1) in RFC 7252.',
        'desc_tr': 'CoAP sürüm numarası. Bu belirtim için ikili 01 (1) değerinde olmalıdır.'
    },
    't': {
        'name': 'Type (T)',
        'label': 'İleti türü',
        'desc_en': 'Reliability type: 0 Confirmable (CON), 1 Non-confirmable (NON), 2 Acknowledgement (ACK), 3 Reset (RST).',
        'desc_tr': 'İletinin güvenilirlik türünü belirtir: 0: Onaylanabilir (CON), 1: Onaylanamaz (NON), 2: Onay (ACK), 3: Sıfırlama (RST).',
        'values_en': [["0", "Confirmable (CON)"], ["1", "Non-confirmable (NON)"], ["2", "Acknowledgement (ACK)"], ["3", "Reset (RST)"]],
        'values_tr': [["0", "Onaylanabilir (Confirmable - CON)"], ["1", "Onaylanamaz (Non-confirmable - NON)"], ["2", "Onay (Acknowledgement - ACK)"], ["3", "Sıfırlama (Reset - RST)"]]
    },
    'tkl': {
        'name': 'Token Length (TKL)',
        'label': 'Belirteç uzunluğu',
        'desc_en': 'Length in octets of the variable-length Token field following the header (0–8 octets).',
        'desc_tr': 'Başlıktan hemen sonra gelen değişken uzunluklu Belirteç (Token) alanının sekizli cinsinden uzunluğu (0-8 sekizli).'
    },
    'code': {
        'name': 'Code',
        'label': 'İleti kodu',
        'desc_en': '8-bit code (3-bit class, 5-bit detail) specifying request method (0.xx) or response status (2.xx, 4.xx, 5.xx).',
        'desc_tr': 'İstek yöntemini (0.xx) veya yanıt durum kodunu (2.xx, 4.xx, 5.xx) belirten 8 bitlik kod. 3 bit sınıf ve 5 bit ayrıntıdan oluşur.',
        'values_en': [["1", "GET (0.01)"], ["2", "POST (0.02)"], ["3", "PUT (0.03)"], ["4", "DELETE (0.04)"], ["69", "2.05 Content (Response)"], ["132", "4.04 Not Found (Response)"]],
        'values_tr': [["1", "GET (0.01)"], ["2", "POST (0.02)"], ["3", "PUT (0.03)"], ["4", "DELETE (0.04)"], ["69", "2.05 Content (Yanıt)"], ["132", "4.04 Not Found (Yanıt)"]]
    },
    'message_id': {
        'name': 'Message ID',
        'label': 'İleti kimliği',
        'desc_en': '16-bit sequence number used to detect duplicates and match ACK/RST responses to requests.',
        'desc_tr': 'Yinelenen iletileri tespit etmek ve ACK/RST yanıtlarını isteklerle eşleştirmek için kullanılan 16 bitlik sıra numarası.'
    },
    'token': {
        'name': 'Token',
        'label': 'Belirteç',
        'desc_en': 'Client-generated token of length TKL used to correlate concurrent requests and responses.',
        'desc_tr': 'İstek ile yanıtı eşleştirmek için istemci tarafından oluşturulan TKL sekizli uzunluğundaki değer.'
    },
    'options': {
        'name': 'Options',
        'label': 'Seçenekler',
        'desc_en': 'Sequence of TLV-formatted options equivalent to HTTP headers (Uri-Path, Content-Format, Max-Age, etc.).',
        'desc_tr': 'HTTP başlıklarına eşdeğer TLV formatındaki seçenekler (Uri-Path, Content-Format, Max-Age vb.).'
    }
}

TRANSLATIONS['dhcp'] = {
    'op': {
        'name': 'op',
        'label': 'İşlem kodu',
        'desc_en': 'Message op code: 1 BOOTREQUEST (client to server), 2 BOOTREPLY (server to client).',
        'desc_tr': 'İleti işlem kodu: istemciden sunucuya giden iletilerde 1 (BOOTREQUEST), sunucudan istemciye gidenlerde 2 (BOOTREPLY).',
        'values_en': [["1", "BOOTREQUEST"], ["2", "BOOTREPLY"]],
        'values_tr': [["1", "Önyükleme isteği (BOOTREQUEST)"], ["2", "Önyükleme yanıtı (BOOTREPLY)"]]
    },
    'htype': {
        'name': 'htype',
        'label': 'Donanım adresi türü',
        'desc_en': 'Hardware address type; uses ARP hardware types (1 for 10Mb Ethernet).',
        'desc_tr': 'Donanım adresi türü; ARP\'nin donanım türü numaralarını kullanır. Ethernet için 1.'
    },
    'hlen': {
        'name': 'hlen',
        'label': 'Donanım adresi uzunluğu',
        'desc_en': 'Hardware address length in octets (6 for Ethernet MAC addresses).',
        'desc_tr': 'Donanım adresinin sekizli cinsinden uzunluğu; Ethernet MAC adresi için 6.'
    },
    'hops': {
        'name': 'hops',
        'label': 'Atlama sayısı',
        'desc_en': 'Client sets to 0; optionally incremented by relay agents during cross-subnet forwarding.',
        'desc_tr': 'İstemci sıfır yazar; ileti bir aktarıcı ajan (relay agent) üzerinden geçtikçe artırılabilir.'
    },
    'xid': {
        'name': 'xid',
        'label': 'İşlem kimliği',
        'desc_en': 'Transaction ID: random 32-bit integer chosen by client to match requests with server replies.',
        'desc_tr': 'İstemcinin seçtiği rastgele işlem kimliği. İstemci ve sunucu, istek ile yanıtı bu değerle eşleştirir.'
    },
    'secs': {
        'name': 'secs',
        'label': 'Geçen süre',
        'desc_en': 'Seconds elapsed since client began address acquisition or renewal process.',
        'desc_tr': 'İstemcinin adres alma veya yenileme sürecine başlamasından bu yana geçen saniye.'
    },
    'flags': {
        'name': 'flags',
        'label': 'Bayraklar',
        'desc_en': 'Leftmost bit is BROADCAST (B) flag (1 requests broadcast reply when client lacks IP); remaining 15 bits zero.',
        'desc_tr': 'En soldaki bit BROADCAST (B) bayrağıdır: henüz IP adresi olmadığı için tek noktaya yayın yanıtı alamayan istemci bu biti 1 yaparak yanıtın yayınla gönderilmesini ister. Kalan 15 bit sıfır olmalıdır (MBZ).'
    },
    'ciaddr': {
        'name': 'ciaddr',
        'label': 'İstemci IP adresi',
        'desc_en': 'Client IP address; only filled when in BOUND, RENEW, or REBINDING state and able to answer ARPs.',
        'desc_tr': 'İstemcinin IP adresi; yalnızca istemci BOUND, RENEW veya REBINDING durumundayken ve ARP isteklerine yanıt verebiliyorken doldurulur.'
    },
    'yiaddr': {
        'name': 'yiaddr',
        'label': 'İstemciye önerilen IP adresi',
        'desc_en': '\'your\' (client) IP address offered or assigned by server in DHCPOFFER and DHCPACK.',
        'desc_tr': '\'your\' adresi: sunucunun istemciye önerdiği veya atadığı IP adresi. DHCPOFFER ve DHCPACK\'te doldurulur.'
    },
    'siaddr': {
        'name': 'siaddr',
        'label': 'Önyükleme sunucusunun IP adresi',
        'desc_en': 'IP address of next server to use in bootstrap (e.g. TFTP server) returned in DHCPOFFER/DHCPACK.',
        'desc_tr': 'Önyüklemenin bir sonraki adımında kullanılacak sunucunun (ör. TFTP sunucusu) adresi; sunucu DHCPOFFER ve DHCPACK\'te döndürür.'
    },
    'giaddr': {
        'name': 'giaddr',
        'label': 'Aktarıcı IP adresi',
        'desc_en': 'Relay agent IP address used in booting via a relay agent; zero on local subnets.',
        'desc_tr': 'İletiyi başka bir alt ağdaki sunucuya ileten aktarıcı ajanın adresi; doğrudan iletişimde sıfırdır.'
    },
    'chaddr': {
        'name': 'chaddr',
        'label': 'İstemci donanım adresi',
        'desc_en': 'Client hardware address: 6-octet MAC for Ethernet, padded with 10 zeroes to 16 octets.',
        'desc_tr': 'İstemcinin donanım adresi. Ethernet\'te ilk 6 sekizli MAC adresidir (hlen), kalan 10 sekizli sıfırla doldurulur.'
    },
    'sname': {
        'name': 'sname',
        'label': 'Sunucu adı',
        'desc_en': 'Optional null-terminated server host name string (64 octets).',
        'desc_tr': 'İsteğe bağlı sunucu konak adı, boş karakterle sonlanan dizgi. Option Overload seçeneğiyle ek seçenek alanı olarak da kullanılabilir.'
    },
    'file': {
        'name': 'file',
        'label': 'Önyükleme dosyası',
        'desc_en': 'Boot file name, null-terminated string (128 octets).',
        'desc_tr': 'Önyükleme dosyasının adı, boş karakterle sonlanan dizgi. DHCPDISCOVER\'da boş veya genel bir ad, DHCPOFFER\'da tam dizin yoludur.'
    },
    'options': {
        'name': 'options',
        'label': 'Seçenekler',
        'desc_en': 'Options starting with magic cookie 0x63825363; clients must be prepared to receive at least 312 octets.',
        'desc_tr': 'Sihirli çerez (0x63825363) ile başlayan seçenek listesi. İstemci en az 312 sekizlilik seçenek alanı alabilmelidir; bu da 576 sekizlilik bir DHCP iletisi demektir.'
    }
}

TRANSLATIONS['dhcpv6'] = {
    'msg_type': {
        'name': 'msg-type',
        'label': 'İleti türü',
        'desc_en': 'DHCPv6 message type (e.g. 1 SOLICIT, 2 ADVERTISE, 3 REQUEST, 7 REPLY).',
        'desc_tr': 'DHCP ileti türü (§7.3).',
        'values_en': [["1", "SOLICIT"], ["2", "ADVERTISE"], ["3", "REQUEST"], ["4", "CONFIRM"], ["5", "RENEW"], ["6", "REBIND"], ["7", "REPLY"], ["8", "RELEASE"], ["9", "DECLINE"], ["10", "RECONFIGURE"], ["11", "INFORMATION-REQUEST"], ["12", "RELAY-FORW"], ["13", "RELAY-REPL"]],
        'values_tr': [["1", "Sunucu arama (SOLICIT)"], ["2", "Sunucu duyurusu (ADVERTISE)"], ["3", "İstek (REQUEST)"], ["4", "Onaylama (CONFIRM)"], ["5", "Yenileme (RENEW)"], ["6", "Yeniden bağlanma (REBIND)"], ["7", "Yanıt (REPLY)"], ["8", "Adresi bırakma (RELEASE)"], ["9", "Adresi reddetme (DECLINE)"], ["10", "Yeniden yapılandırma (RECONFIGURE)"], ["11", "Bilgi isteği (INFORMATION-REQUEST)"], ["12", "Aktarılan istek (RELAY-FORW)"], ["13", "Aktarılan yanıt (RELAY-REPL)"]]
    },
    'transaction_id': {
        'name': 'transaction-id',
        'label': 'İşlem kimliği',
        'desc_en': 'Transaction ID chosen by client to correlate message exchanges with server.',
        'desc_tr': 'Bu ileti alışverişinin işlem kimliği. İstemci rastgele seçer; sunucu yanıtta aynı değeri döndürür.'
    },
    'options': {
        'name': 'options',
        'label': 'Seçenekler',
        'desc_en': 'Variable-length DHCPv6 options carried in the message (§21).',
        'desc_tr': 'İletinin taşıdığı seçenekler (§21); iletinin boyutundan 4 sekizli eksik uzunlukta.'
    }
}

TRANSLATIONS['ntp'] = {
    'li': {
        'name': 'LI',
        'label': 'Artık saniye göstergesi',
        'desc_en': 'Leap Indicator warning of impending leap second insertion or deletion; 3 means unsynchronized clock.',
        'desc_tr': 'Leap Indicator (artık saniye göstergesi). Günün son dakikasına artık saniye eklenip çıkarılacağını bildirir. 3, saatin henüz eşzamanlanmadığı anlamına gelir.',
        'values_en': [["0", "no warning"], ["1", "last minute has 61 seconds"], ["2", "last minute has 59 seconds"], ["3", "alarm condition (clock unsynchronized)"]],
        'values_tr': [["0", "Uyarı yok"], ["1", "Son dakika 61 saniye"], ["2", "Son dakika 59 saniye"], ["3", "Bilinmiyor (saat eşzamanlı değil)"]]
    },
    'vn': {
        'name': 'VN',
        'label': 'Sürüm numarası',
        'desc_en': 'NTP version number; 4 for NTPv4.',
        'desc_tr': 'Version Number: NTP sürüm numarası; NTPv4 için 4.'
    },
    'mode': {
        'name': 'Mode',
        'label': 'Kip',
        'desc_en': 'Association mode: 3 client request, 4 server reply, 1 symmetric active, 2 symmetric passive.',
        'desc_tr': 'İletişim kipi. İstemci isteği 3, sunucu yanıtı 4 taşır.',
        'values_en': [["0", "reserved"], ["1", "symmetric active"], ["2", "symmetric passive"], ["3", "client"], ["4", "server"], ["5", "broadcast"], ["6", "NTP control message"], ["7", "reserved for private use"]],
        'values_tr': [["0", "Ayrılmış"], ["1", "Simetrik etkin"], ["2", "Simetrik edilgen"], ["3", "İstemci"], ["4", "Sunucu"], ["5", "Yayın (broadcast)"], ["6", "NTP denetim iletisi"], ["7", "Özel kullanım için ayrılmış"]]
    },
    'stratum': {
        'name': 'Stratum',
        'label': 'Saat katmanı',
        'desc_en': 'Stratum level of the clock: 1 primary reference, 2–15 secondary via NTP, 16 unsynchronized, 0 Kiss-o\'-Death.',
        'desc_tr': 'Sunucunun başvuru saatine uzaklığı. 1 birincil sunucu (ör. GPS alıcılı), 2–15 NTP ile eşzamanlanan ikincil sunucu, 16 eşzamansızdır. 0 ise Kiss-o\'-Death paketini belirtir.',
        'values_en': [["0", "unspecified or invalid (Kiss-o'-Death)"], ["1", "primary server"], ["2–15", "secondary server"], ["16", "unsynchronized"]],
        'values_tr': [["0", "Belirtilmemiş / geçersiz (Kiss-o'-Death)"], ["1", "Birincil sunucu"], ["2–15", "İkincil sunucu"], ["16", "Eşzamansız"]]
    },
    'poll': {
        'name': 'Poll',
        'label': 'Sorgulama aralığı',
        'desc_en': 'Maximum interval between successive messages, in log2 seconds (e.g. 6 represents 2^6 = 64 seconds).',
        'desc_tr': 'Ardışık iletiler arasındaki en uzun aralık, log₂ saniye cinsinden işaretli tamsayı. 6 değeri 2⁶ = 64 saniyedir.'
    },
    'precision': {
        'name': 'Precision',
        'label': 'Hassasiyet',
        'desc_en': 'Precision of system clock, in log2 seconds (e.g. -23 represents 2^-23 ≈ 119 nanoseconds).',
        'desc_tr': 'Sistem saatinin duyarlılığı, log₂ saniye cinsinden işaretli (ikiye tümleyen) tamsayı. Örnekteki 0xe9 = −23, yani 2⁻²³ ≈ 119 nanosaniyedir.'
    },
    'rootdelay': {
        'name': 'Root Delay',
        'label': 'Kök gecikmesi',
        'desc_en': 'Total round-trip delay to reference clock, in NTP short format (16-bit integer, 16-bit fraction).',
        'desc_tr': 'Başvuru saatine kadar toplam gidiş-dönüş gecikmesi, NTP kısa biçiminde (16.16). Örnekteki 0x00000a3d ≈ 0,040 saniyedir.'
    },
    'rootdisp': {
        'name': 'Root Dispersion',
        'label': 'Kök dağılımı',
        'desc_en': 'Total dispersion accumulated to reference clock, in NTP short format.',
        'desc_tr': 'Başvuru saatine kadar biriken toplam belirsizlik (dispersion), NTP kısa biçiminde. Örnekteki 0x00000831 ≈ 0,032 saniyedir.'
    },
    'refid': {
        'name': 'Reference ID',
        'label': 'Başvuru saati kimliği',
        'desc_en': 'Reference identifier: 4-character ASCII source for stratum 1 ("GPS", "PPS"), kiss code for stratum 0, IPv4 for stratum > 1.',
        'desc_tr': 'Başvuru kaynağının kimliği. Stratum 1\'de dört karakterlik ASCII saat kaynağı ("GPS", "PPS" gibi), Stratum 0\'da kiss kodu ("RATE", "DENY"), daha üst stratumlarda IPv4 üzerinden üst sunucunun adresidir.'
    },
    'reftime': {
        'name': 'Reference Timestamp',
        'label': 'Başvuru zaman damgası',
        'desc_en': 'Time when system clock was last set or corrected, in 64-bit NTP timestamp format.',
        'desc_tr': 'Sistem saatinin en son ayarlandığı an, 64 bitlik NTP zaman damgası biçiminde. Örnek: 16 Kasım 2026 11:58:20 UTC.'
    },
    'org': {
        'name': 'Origin Timestamp (T1)',
        'label': 'İsteğin gönderim zamanı',
        'desc_en': 'Time request departed client, copied by server from client\'s Transmit Timestamp.',
        'desc_tr': 'İsteğin istemciden ayrıldığı an. Sunucu, istemcinin Transmit Timestamp değerini bu alana kopyalar; istemci bununla yanıtı kendi isteğiyle eşleştirir. Örnek: 12:00:00,000 UTC.'
    },
    'rec': {
        'name': 'Receive Timestamp (T2)',
        'label': 'İsteğin alım zamanı',
        'desc_en': 'Time request arrived at server in 64-bit NTP timestamp format.',
        'desc_tr': 'İsteğin sunucuya ulaştığı an. Örnek: 12:00:00,012 UTC.'
    },
    'xmt': {
        'name': 'Transmit Timestamp (T3)',
        'label': 'Yanıtın gönderim zamanı',
        'desc_en': 'Time response departed server in 64-bit NTP timestamp format.',
        'desc_tr': 'Yanıtın sunucudan ayrıldığı an. Örnek: 12:00:00,013 UTC.'
    },
    'ext': {
        'name': 'Extension Fields and MAC',
        'label': 'Uzantı alanları ve MAC',
        'desc_en': 'Optional extension fields and Key Identifier plus message digest (MAC); not present in base 48-octet header.',
        'desc_tr': 'İsteğe bağlı uzantı alanları ile Key Identifier (32 bit) ve ileti özeti (dgst). Temel 48 sekizlilik başlıkta bulunmaz.'
    }
}

# ---------------------------------------------------------------------------
# PTP PROTOCOLS: ptp, ptp-announce, ptp-delay-req, ptp-delay-resp, ptp-follow-up
# ---------------------------------------------------------------------------
PTP_COMMON_FIELDS = {
    'transport_specific': {
        'name': 'transportSpecific',
        'label': 'Taşımaya özgü alan',
        'desc_en': 'Field available to underlying transport protocol (Annex D–I). 0 default in Ethernet (Table F.2); bit 0 in UDP/IPv4 requests 124-octet padding.',
        'desc_tr': 'Alt katmandaki taşıma protokolünün kullanabileceği alan; anlamı taşıma eklerinde (Annex D–I) tanımlanır. Ethernet eşlemesinde 0 DEFAULT değeridir (Table F.2); UDP/IPv4 eşlemesinde bit 0, sürüm 1 donanımı için 124 sekizlilik dolgu ister (Table D.2).'
    },
    'message_type': {
        'name': 'messageType',
        'label': 'İleti türü',
        'desc_en': 'PTP message type: 0–3 event messages with timestamping; 8–D general messages (0 Sync, 1 Delay_Req, 8 Follow_Up, 9 Delay_Resp, 0xB Announce).',
        'desc_tr': 'İletinin türü. 0–3 olay iletileridir ve gönderim ile alım anları zaman damgasıyla ölçülür; 8–D genel iletilerdir. En anlamlı bit iki sınıfı ayırır.',
        'values_en': [["0x0", "Sync (event)"], ["0x1", "Delay_Req (event)"], ["0x2", "Pdelay_Req (event)"], ["0x3", "Pdelay_Resp (event)"], ["0x4–0x7", "Reserved"], ["0x8", "Follow_Up (general)"], ["0x9", "Delay_Resp (general)"], ["0xA", "Pdelay_Resp_Follow_Up (general)"], ["0xB", "Announce (general)"], ["0xC", "Signaling (general)"], ["0xD", "Management (general)"], ["0xE–0xF", "Reserved"]],
        'values_tr': [["0x0", "Sync (olay)"], ["0x1", "Delay_Req (olay)"], ["0x2", "Pdelay_Req (olay)"], ["0x3", "Pdelay_Resp (olay)"], ["0x4–0x7", "Ayrılmış"], ["0x8", "Follow_Up (genel)"], ["0x9", "Delay_Resp (genel)"], ["0xA", "Pdelay_Resp_Follow_Up (genel)"], ["0xB", "Announce (genel)"], ["0xC", "Signaling (genel)"], ["0xD", "Management (genel)"], ["0xE–0xF", "Ayrılmış"]]
    },
    'reserved_version': {
        'name': 'reserved',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved 4 bits; transmitted as 0 and ignored by receiver (§13.2).',
        'desc_tr': 'Ayrılmış; 0 gönderilir, alıcı yok sayar (§13.2). §13.3.2.2\'deki nota göre messageType\'ın ileride genişletilmesi için ayrılmıştır.'
    },
    'version': {
        'name': 'versionPTP',
        'label': 'PTP sürümü',
        'desc_en': 'PTP version number of transmitting port; 2 for IEEE 1588-2008 (§7.5.5).',
        'desc_tr': 'Gönderen portun portDS.versionNumber değeri. Standardın bu sürümü için 2\'dir (§7.5.5).'
    },
    'message_length': {
        'name': 'messageLength',
        'label': 'İleti uzunluğu',
        'desc_en': 'Total length of the PTP message from header start to end, excluding Annex D padding.',
        'desc_tr': 'İletinin başlığın ilk sekizlisinden son sekizlisine kadar toplam uzunluğu. Annex D\'deki dolgu dahil değildir.'
    },
    'domain': {
        'name': 'domainNumber',
        'label': 'Zaman alanı numarası',
        'desc_en': 'Domain number of the sending clock (defaultDS.domainNumber), segregating independent PTP domains on a network.',
        'desc_tr': 'Sıradan ya da sınır saatlerde, gönderen saatin defaultDS.domainNumber değeri. Aynı ağdaki bağımsız zaman alanları bu numarayla ayrılır.'
    },
    'reserved_domain': {
        'name': 'reserved',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved 8 bits; transmitted as 0 and ignored by receiver.',
        'desc_tr': 'Ayrılmış; 0 gönderilir, alıcı yok sayar.'
    },
    'flags': {
        'name': 'flagField',
        'label': 'Bayraklar',
        'desc_en': 'Two-octet flag array defined in Table 20 (e.g. alternateMasterFlag, twoStepFlag, unicastFlag).',
        'desc_tr': 'İki sekizlilik bayrak dizisi; anlamları Table 20\'dedir. Bir ileti türü için tanımlanmamış bayraklar 0 olur. Onaltılık değer, sekizli 0\'ın bitlerini üst, sekizli 1\'in bitlerini alt baytta gösterir.',
        'values_en': [["0x0100", "alternateMasterFlag"], ["0x0200", "twoStepFlag"], ["0x0400", "unicastFlag"], ["0x2000", "PTP profile Specific 1"], ["0x4000", "PTP profile Specific 2"], ["0x0001", "leap61"], ["0x0002", "leap59"], ["0x0004", "currentUtcOffsetValid"], ["0x0008", "ptpTimescale"], ["0x0010", "timeTraceable"], ["0x0020", "frequencyTraceable"]],
        'values_tr': [["0x0100", "alternateMasterFlag (Announce, Sync, Follow_Up, Delay_Resp)"], ["0x0200", "twoStepFlag (Sync, Pdelay_Resp)"], ["0x0400", "unicastFlag (tümü)"], ["0x2000", "PTP profile Specific 1"], ["0x4000", "PTP profile Specific 2"], ["0x0001", "leap61 (Announce)"], ["0x0002", "leap59 (Announce)"], ["0x0004", "currentUtcOffsetValid (Announce)"], ["0x0008", "ptpTimescale (Announce)"], ["0x0010", "timeTraceable (Announce)"], ["0x0020", "frequencyTraceable (Announce)"]]
    },
    'correction': {
        'name': 'correctionField',
        'label': 'Zaman düzeltmesi',
        'desc_en': 'Correction value in scaled nanoseconds (units of 2^-16 ns); e.g. 2.5 ns is 0x0000000000028000 (Table 21).',
        'desc_tr': 'Düzeltme değeri, nanosaniyenin 2^16 katı biriminde işaretli sayı olarak; örneğin 2,5 ns 0x0000000000028000\'dir. Sync\'te kesirli nanosaniyeleri, saydam saatlerdeki bekleme süresini, eşler arası saatlerde yol gecikmesini ve asimetri düzeltmesini taşır (Table 21).'
    },
    'reserved_body': {
        'name': 'reserved',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved 32 bits; transmitted as 0 and ignored by receiver.',
        'desc_tr': 'Ayrılmış; 0 gönderilir, alıcı yok sayar.'
    },
    'clock_identity': {
        'name': 'sourcePortIdentity.clockIdentity',
        'label': 'Kaynak portun saat kimliği',
        'desc_en': '8-octet EUI-64 clock identity of the transmitting port; when derived from MAC-48, FF FE is inserted (§7.5.2.2.2).',
        'desc_tr': 'İletiyi gönderen portun portDS.portIdentity değerinin saat kısmı: 8 sekizlilik bir EUI-64. EUI-48\'den türetildiğinde OUI\'nin üç sekizlisi başa, 3. ve 4. sekizlilere FF ile FE, kalan üç sekizli sona yazılır (§7.5.2.2.2, NOTE 2).'
    },
    'port_number': {
        'name': 'sourcePortIdentity.portNumber',
        'label': 'Kaynak port numarası',
        'desc_en': 'PTP port number of the transmitting port; ports on an N-port node are numbered 1, 2, ..., N (§7.5.2.3).',
        'desc_tr': 'Saatin iletiyi gönderen PTP portunun numarası. N portlu bir düğümde portlar 1, 2, …, N numaralanır; 0 ve 0xFFFF ayrılmıştır (§7.5.2.3).'
    },
    'sequence_id': {
        'name': 'sequenceId',
        'label': 'Sıra kimliği',
        'desc_en': 'Monotonically increasing sequence number maintained for each message type (§7.3.7; Table 22).',
        'desc_tr': 'Gönderenin her ileti türü için ayrı tuttuğu sıra numarası (§7.3.7). Follow_Up, Delay_Resp gibi yanıtlar ait oldukları iletinin değerini taşır (Table 22).'
    },
    'control': {
        'name': 'controlField',
        'label': 'Denetim alanı',
        'desc_en': 'Legacy control field retained for version 1 hardware compatibility; Table 23 values (0x00 Sync, 0x01 Delay_Req, etc.).',
        'desc_tr': 'Sürüm 1 donanımıyla uyumluluk için korunan alan; alıcının kullanması önerilmez. Değeri ileti türüne göre Table 23\'te verilir.',
        'values_en': [["0x00", "Sync"], ["0x01", "Delay_Req"], ["0x02", "Follow_Up"], ["0x03", "Delay_Resp"], ["0x04", "Management"], ["0x05", "Other"]],
        'values_tr': [["0x00", "Sync"], ["0x01", "Delay_Req"], ["0x02", "Follow_Up"], ["0x03", "Delay_Resp"], ["0x04", "Management"], ["0x05", "Diğerleri"]]
    },
    'log_interval': {
        'name': 'logMessageInterval',
        'label': 'İleti aralığının üssü',
        'desc_en': 'Log2 transmission interval in seconds (Table 24); 0 represents 1 message per second (2^0).',
        'desc_tr': 'İletilerin gönderim aralığının 2 tabanında logaritması, işaretli sayı olarak. Çok noktaya yayınlanan Sync\'te portDS.logSyncInterval değeridir, tek noktaya gönderilende 0x7F (Table 24). 0 saniyede bir ileti demektir.'
    }
}

TRANSLATIONS['ptp'] = dict(PTP_COMMON_FIELDS)
TRANSLATIONS['ptp'].update({
    'origin_seconds': {
        'name': 'originTimestamp.secondsField',
        'label': 'Gönderim zamanı, saniye',
        'desc_en': 'Seconds portion of transmission time of Sync message since PTP epoch (§5.3.3, §7.2.2).',
        'desc_tr': 'Sync\'in çıkış anının saniye kısmı, PTP çağından bu yana (§5.3.3, §7.2.2).'
    },
    'origin_ns': {
        'name': 'originTimestamp.nanosecondsField',
        'label': 'Gönderim zamanı, nanosaniye',
        'desc_en': 'Nanoseconds portion of transmission time (< 10^9; §5.3.3).',
        'desc_tr': 'Aynı anın nanosaniye kısmı; her zaman 10^9\'dan küçüktür (§5.3.3).'
    }
})

TRANSLATIONS['ptp-announce'] = dict(PTP_COMMON_FIELDS)
TRANSLATIONS['ptp-announce'].update({
    'origin_seconds': {
        'name': 'originTimestamp.secondsField',
        'label': 'Gönderim zamanı, saniye',
        'desc_en': 'Seconds portion of transmission time since PTP epoch.',
        'desc_tr': 'PTP çağından bu yana geçen saniye.'
    },
    'origin_ns': {
        'name': 'originTimestamp.nanosecondsField',
        'label': 'Gönderim zamanı, nanosaniye',
        'desc_en': 'Nanoseconds portion of transmission time.',
        'desc_tr': 'Aynı anın nanosaniye kısmı.'
    },
    'utc_offset': {
        'name': 'currentUtcOffset',
        'label': 'UTC farkı',
        'desc_en': 'Current difference in seconds between TAI and UTC (TAI - UTC); valid if currentUtcOffsetValid flag is set.',
        'desc_tr': 'TAI ile UTC arasındaki güncel fark, saniye olarak. currentUtcOffsetValid bayrağı 1 ise geçerlidir.'
    },
    'reserved_announce': {
        'name': 'reserved',
        'label': 'Ayrılmış',
        'desc_en': 'Reserved 8 bits; transmitted as 0 and ignored by receiver.',
        'desc_tr': 'Ayrılmış; 0 gönderilir.'
    },
    'priority1': {
        'name': 'grandmasterPriority1',
        'label': 'Ana saatin 1. önceliği',
        'desc_en': 'First priority attribute of the grandmaster clock used by the Best Master Clock algorithm (0–255).',
        'desc_tr': 'En İyi Ana Saat (BMCA) algoritmasında ilk karşılaştırılan öncelik değeri; 0–255.'
    },
    'clock_class': {
        'name': 'grandmasterClockQuality.clockClass',
        'label': 'Saat sınıfı',
        'desc_en': 'Clock class indicating traceability and operational state of the grandmaster clock.',
        'desc_tr': 'Ana saatin izlenebilirliğini ve çalışma kipini belirten sınıf.',
        'values_en': [["6", "Synchronized to primary ref, PTP timescale"], ["7", "Holdover mode after loss of primary ref"], ["13", "App-specific timescale (ARB)"]],
        'values_tr': [["6", "Birincil zaman kaynağına eşitli, PTP zaman ölçeği"], ["7", "Eskiden 6; kaynağını kaybetmiş, tutma (holdover) kipinde"], ["13", "Uygulamaya özgü kaynağa eşitli, ARB zaman ölçeği"]]
    },
    'clock_accuracy': {
        'name': 'grandmasterClockQuality.clockAccuracy',
        'label': 'Saat doğruluğu',
        'desc_en': 'Expected accuracy of the grandmaster clock with respect to the PTP timescale.',
        'desc_tr': 'Ana saatin PTP zaman ölçeğine göre beklenen doğruluğu.',
        'values_en': [["0x20", "within 25 ns"], ["0x21", "within 100 ns"], ["0x23", "within 1 µs"]],
        'values_tr': [["0x20", "25 ns içinde"], ["0x21", "100 ns içinde"], ["0x23", "1 µs içinde"]]
    },
    'variance': {
        'name': 'grandmasterClockQuality.offsetScaledLogVariance',
        'label': 'Varyans ölçeği',
        'desc_en': 'Estimate of grandmaster clock stability characterizing frequency stability.',
        'desc_tr': 'Ana saatin kararlılık tahmini; saatin frekans kararlılığını niteler.'
    },
    'priority2': {
        'name': 'grandmasterPriority2',
        'label': 'Ana saatin 2. önceliği',
        'desc_en': 'Second priority attribute of the grandmaster clock used to break ties in BMCA (0–255).',
        'desc_tr': 'BMCA\'da eşitlikleri bozmak için kullanılan ikinci öncelik değeri.'
    },
    'grandmaster_identity': {
        'name': 'grandmasterIdentity',
        'label': 'Ana saatin kimliği',
        'desc_en': 'Clock identity (8-octet EUI-64) of the grandmaster clock.',
        'desc_tr': 'Ana saatin 8 sekizlilik saat kimliği.'
    },
    'steps_removed': {
        'name': 'stepsRemoved',
        'label': 'Atlama sayısı',
        'desc_en': 'Number of boundary clock hops between this port and the grandmaster clock.',
        'desc_tr': 'Bu iletiyi gönderen saat ile ana saat arasındaki sınır saat (boundary clock) sayısı.'
    },
    'time_source': {
        'name': 'timeSource',
        'label': 'Zaman kaynağı',
        'desc_en': 'Source of time used by the grandmaster clock (e.g. GPS, ATOMIC_CLOCK, NTP).',
        'desc_tr': 'Ana saatin kullandığı zaman kaynağı türü.',
        'values_en': [["0x10", "ATOMIC_CLOCK"], ["0x20", "GPS"], ["0x30", "TERRESTRIAL_RADIO"], ["0x40", "PTP"], ["0x50", "NTP"], ["0x90", "OTHER"], ["0xA0", "INTERNAL_OSCILLATOR"]],
        'values_tr': [["0x10", "ATOMIC_CLOCK"], ["0x20", "GPS (uydu sistemleri)"], ["0x30", "TERRESTRIAL_RADIO"], ["0x40", "PTP"], ["0x50", "NTP"], ["0x90", "DİĞER"], ["0xA0", "DAHİLİ_OSİLATÖR"]]
    }
})

TRANSLATIONS['ptp-delay-req'] = dict(PTP_COMMON_FIELDS)
TRANSLATIONS['ptp-delay-req'].update({
    'origin_seconds': {
        'name': 'originTimestamp.secondsField',
        'label': 'Gönderim zamanı, saniye',
        'desc_en': 'Seconds portion of estimated departure time for Delay_Req message.',
        'desc_tr': 'Delay_Req\'in tahmini çıkış anının saniye kısmı.'
    },
    'origin_ns': {
        'name': 'originTimestamp.nanosecondsField',
        'label': 'Gönderim zamanı, nanosaniye',
        'desc_en': 'Nanoseconds portion of estimated departure time.',
        'desc_tr': 'Aynı anın nanosaniye kısmı.'
    }
})

TRANSLATIONS['ptp-delay-resp'] = dict(PTP_COMMON_FIELDS)
TRANSLATIONS['ptp-delay-resp'].update({
    'receive_seconds': {
        'name': 'receiveTimestamp.secondsField',
        'label': 'Alım zamanı, saniye',
        'desc_en': 'Seconds portion of the arrival time of the corresponding Delay_Req message at the master.',
        'desc_tr': 'Yanıtlanan Delay_Req iletisinin ana saate ulaştığı anın saniye kısmı (§5.3.3).'
    },
    'receive_ns': {
        'name': 'receiveTimestamp.nanosecondsField',
        'label': 'Alım zamanı, nanosaniye',
        'desc_en': 'Nanoseconds portion of the arrival time.',
        'desc_tr': 'Aynı anın nanosaniye kısmı (§5.3.3).'
    },
    'requesting_clock': {
        'name': 'requestingPortIdentity.clockIdentity',
        'label': 'İstekte bulunan portun saat kimliği',
        'desc_en': 'Clock identity of the port that sent the Delay_Req being answered.',
        'desc_tr': 'Yanıtlanan Delay_Req iletisini gönderen portun saat kimliği.'
    },
    'requesting_port': {
        'name': 'requestingPortIdentity.portNumber',
        'label': 'İstekte bulunan portun numarası',
        'desc_en': 'Port number of the port that sent the Delay_Req being answered.',
        'desc_tr': 'Aynı portun numarası.'
    }
})

TRANSLATIONS['ptp-follow-up'] = dict(PTP_COMMON_FIELDS)
TRANSLATIONS['ptp-follow-up'].update({
    'precise_seconds': {
        'name': 'preciseOriginTimestamp.secondsField',
        'label': 'Kesin gönderim zamanı, saniye',
        'desc_en': 'Seconds portion of the precise departure time of the associated Sync message in two-step clocks.',
        'desc_tr': 'İlgili Sync iletisinin kesin çıkış anının saniye kısmı, PTP çağından bu yana (§5.3.3).'
    },
    'precise_ns': {
        'name': 'preciseOriginTimestamp.nanosecondsField',
        'label': 'Kesin gönderim zamanı, nanosaniye',
        'desc_en': 'Nanoseconds portion of the precise departure time (< 10^9).',
        'desc_tr': 'Aynı anın nanosaniye kısmı; 10^9\'dan küçüktür.'
    }
})

# ---------------------------------------------------------------------------
# APPLICATION & SESSION: rtp, rtcp, srtp, bfd, stun, tls, websocket, http2, http3, ssh, snmp, smb2, bgp
# ---------------------------------------------------------------------------
TRANSLATIONS['rtp'] = {
    'v': {'name': 'V', 'label': 'Sürüm', 'desc_en': 'RTP version; 2 as defined in RFC 3550.', 'desc_tr': 'Version: RTP sürümü. Bu belgede tanımlanan sürüm 2\'dir.'},
    'p': {'name': 'P', 'label': 'Dolgu', 'desc_en': 'Padding bit; 1 indicates the packet contains one or more padding octets at the end (last octet gives padding count).', 'desc_tr': 'Padding: 1 ise paketin sonunda yükün parçası olmayan dolgu sekizlileri vardır; son sekizli, kendisi dahil dolgu sekizlilerinin sayısını verir.'},
    'x': {'name': 'X', 'label': 'Başlık uzantısı', 'desc_en': 'Extension bit; 1 indicates the fixed header is followed by exactly one header extension (§5.3.1).', 'desc_tr': 'Extension: 1 ise sabit başlığı tam olarak bir başlık uzantısı izler (§5.3.1).'},
    'cc': {'name': 'CC', 'label': 'CSRC sayısı', 'desc_en': 'CSRC count: number of Contributing Source identifiers following the fixed header.', 'desc_tr': 'CSRC count: sabit başlığı izleyen CSRC tanımlayıcılarının sayısı. Paketler bir karıştırıcıdan (mixer) geçmediyse 0\'dır.'},
    'm': {'name': 'M', 'label': 'İşaretçi', 'desc_en': 'Marker bit: interpretation defined by profile; marks significant events like frame boundaries or talkspurt starts.', 'desc_tr': 'Marker: anlamı profile bağlıdır; çerçeve sınırları gibi önemli olayları işaretlemeye yarar. Ses profilinde bir konuşma diliminin ilk paketini gösterir.'},
    'pt': {
        'name': 'Payload Type (PT)',
        'label': 'Yük türü',
        'desc_en': 'Payload format identifier: static profiles in RFC 3551 (0 PCMU, 8 PCMA, 9 G722), or dynamic 96–127.',
        'desc_tr': 'Yükün biçimi. RFC 3551 statik türler tanımlar: 0 PCMU (G.711 µ-law, 8000 Hz), 8 PCMA (G.711 A-law), 9 G722; 96–127 dinamik olarak (ör. SDP ile) atanır.',
        'values_en': [["0", "PCMU (G.711 µ-law)"], ["8", "PCMA (G.711 A-law)"], ["9", "G722"], ["18", "G729"], ["96–127", "Dynamic"]],
        'values_tr': [["0", "PCMU (G.711 µ-law)"], ["8", "PCMA (G.711 A-law)"], ["9", "G722"], ["18", "G729"], ["96–127", "Dinamik"]]
    },
    'seq': {'name': 'Sequence Number', 'label': 'Sıra numarası', 'desc_en': '16-bit sequence number incremented by 1 for each RTP data packet sent, used to detect packet loss and restore order.', 'desc_tr': 'Gönderilen her RTP veri paketinde bir artar; alıcı kaybı saptamak ve sırayı düzeltmek için kullanır.'},
    'ts': {'name': 'Timestamp', 'label': 'Zaman damgası', 'desc_en': 'Sampling instant of the first octet in the RTP data packet, in units of the media sampling clock.', 'desc_tr': 'Yükteki ilk sekizlinin örnekleme anı, örnekleme saatinin birimleriyle. 8000 Hz\'lik seste 20 ms\'lik her paket 160 artırır.'},
    'ssrc': {'name': 'SSRC', 'label': 'Eşzamanlama kaynağı kimliği', 'desc_en': 'Synchronization source: randomly chosen 32-bit identifier identifying the source of the stream.', 'desc_tr': 'Synchronization source: akışın kaynağını tanımlayan rastgele 32 bitlik kimlik. Aynı oturumdaki iki kaynağın SSRC\'si aynı olmamalıdır.'},
    'csrc': {'name': 'CSRC List', 'label': 'CSRC listesi', 'desc_en': 'Contributing source identifiers (0–15 32-bit IDs) contributing to the payload, as specified by CC.', 'desc_tr': 'Contributing sources: bir karıştırıcının birleştirdiği kaynakların 32 bitlik kimlikleri; 0–15 tane, sayısını CC verir.'},
    'payload': {'name': 'Payload', 'label': 'Yük', 'desc_en': 'Audio or video media data in the format designated by Payload Type.', 'desc_tr': 'Yük türünün belirlediği biçimde ses veya görüntü verisi.'}
}

TRANSLATIONS['rtcp'] = {
    'v': {'name': 'Version (V)', 'label': 'Sürüm', 'desc_en': 'RTP version; matches RTP header version (2).', 'desc_tr': 'RTP sürümü; RTP başlığındakiyle aynı olarak 2.'},
    'p': {'name': 'Padding (P)', 'label': 'Dolgu', 'desc_en': 'Padding bit; 1 indicates the packet ends with padding octets whose count is in the last octet.', 'desc_tr': '1 ise paketin sonunda, son sekizlisi dolgu uzunluğunu veren dolgu baytları vardır.'},
    'rc': {'name': 'Reception Report Count (RC)', 'label': 'Alım raporu sayısı', 'desc_en': 'Number of reception report blocks contained in this packet (0–31).', 'desc_tr': 'Bu pakette bulunan alım raporu bloklarının sayısı (0–31).'},
    'pt': {
        'name': 'Packet Type (PT)',
        'label': 'Paket türü',
        'desc_en': 'RTCP packet type; 200 for Sender Report (SR).',
        'desc_tr': 'RTCP paket türü; gönderici raporu için 200.',
        'values_en': [["200", "SR: Sender Report"], ["201", "RR: Receiver Report"], ["202", "SDES: Source Description"], ["203", "BYE: Goodbye"], ["204", "APP: Application-Defined"]],
        'values_tr': [["200", "SR: gönderici raporu"], ["201", "RR: alıcı raporu"], ["202", "SDES: kaynak tanımı"], ["203", "BYE: ayrılma"], ["204", "APP: uygulamaya özgü"]]
    },
    'length': {'name': 'Length', 'label': 'Uzunluk', 'desc_en': 'Length of RTCP packet in 32-bit words minus one, including header and padding.', 'desc_tr': 'Paketin uzunluğu, 32 bitlik sözcük olarak, eksi bir. Ortak başlık ve dolgu dahildir.'},
    'ssrc': {'name': 'SSRC of sender', 'label': 'Gönderenin SSRC değeri', 'desc_en': 'Synchronization source identifier of the sender of this report.', 'desc_tr': 'Bu raporu gönderen kaynağın senkronizasyon kaynağı kimliği; aynı kaynağın RTP paketlerindeki SSRC ile aynıdır.'},
    'ntp_msw': {'name': 'NTP timestamp, most significant word', 'label': 'NTP zaman damgasının üst sözcüğü', 'desc_en': 'Integer part of NTP timestamp when this report was sent (seconds since 1900).', 'desc_tr': 'Raporun gönderildiği an, NTP biçiminde: 1900\'den bu yana geçen saniyelerin tam sayı kısmı.'},
    'ntp_lsw': {'name': 'NTP timestamp, least significant word', 'label': 'NTP zaman damgasının alt sözcüğü', 'desc_en': 'Fractional part of NTP timestamp (units of 2^-32 seconds).', 'desc_tr': 'Aynı anın saniye kesri; 2^32 bir saniyeye karşılık gelir.'},
    'rtp_ts': {'name': 'RTP timestamp', 'label': 'RTP zaman damgası', 'desc_en': 'RTP timestamp corresponding to the same instant as the NTP timestamp, in media clock rate.', 'desc_tr': 'NTP zaman damgasıyla aynı ana karşılık gelen RTP zaman damgası, akışın örnekleme saati biriminde.'},
    'packet_count': {'name': 'Sender\'s packet count', 'label': 'Gönderilen paket sayısı', 'desc_en': 'Total number of RTP data packets transmitted by the sender since transmission started.', 'desc_tr': 'Akışın başından bu rapora kadar gönderilen RTP paketlerinin sayısı.'},
    'octet_count': {'name': 'Sender\'s octet count', 'label': 'Gönderilen sekizli sayısı', 'desc_en': 'Total number of payload octets transmitted in RTP data packets by the sender.', 'desc_tr': 'Aynı süre içinde gönderilen RTP yükü sekizlilerinin sayısı; başlıklar ve dolgu dahil değildir.'},
    'ssrc_1': {'name': 'SSRC_1 (SSRC of first source)', 'label': 'İlk kaynağın SSRC değeri', 'desc_en': 'SSRC identifier of the source to which this reception report block pertains.', 'desc_tr': 'Bu alım raporu bloğunun hangi kaynağın akışı hakkında olduğu.'},
    'fraction_lost': {'name': 'Fraction lost', 'label': 'Paket kayıp oranı', 'desc_en': 'Fraction of RTP packets lost since the previous SR or RR, expressed as an 8-bit fixed point fraction (divided by 256).', 'desc_tr': 'Son rapordan bu yana kaybolan paketlerin oranı, 256 ile çarpılmış sabit noktalı sayı olarak.'},
    'cumulative_lost': {'name': 'Cumulative number of packets lost', 'label': 'Toplam kayıp paket sayısı', 'desc_en': 'Cumulative number of packets lost since the beginning of reception.', 'desc_tr': 'Alım başladığından beri beklenip gelmeyen paketlerin toplam sayısı.'},
    'ext_highest_seq': {'name': 'Extended highest sequence number received', 'label': 'Alınan en büyük genişletilmiş sıra numarası', 'desc_en': 'Low 16 bits highest sequence number received; high 16 bits corresponding sequence number cycle count.', 'desc_tr': 'Alt 16 biti alınan en yüksek sıra numarası, üst 16 biti sıra numarasının kaç kez başa döndüğü.'},
    'jitter': {'name': 'Interarrival jitter', 'label': 'Paket geliş aralığı değişkenliği', 'desc_en': 'Statistical estimate of variance in packet arrival intervals, in timestamp units.', 'desc_tr': 'Paketlerin varış aralıklarındaki değişimin istatistiksel tahmini, zaman damgası biriminde.'},
    'lsr': {'name': 'Last SR timestamp (LSR)', 'label': 'Son gönderici raporunun zaman damgası', 'desc_en': 'Middle 32 bits of the 64-bit NTP timestamp received in the most recent SR from this source; 0 if none.', 'desc_tr': 'Bu kaynaktan alınan son SR\'nin NTP zaman damgasının ortadaki 32 biti; henüz SR alınmadıysa 0.'},
    'dlsr': {'name': 'Delay since last SR (DLSR)', 'label': 'Son gönderici raporundan beri geçen süre', 'desc_en': 'Delay between receiving last SR from this source and sending this reception report block, in 1/65536 seconds.', 'desc_tr': 'O SR\'nin alınmasıyla bu raporun gönderilmesi arasındaki süre, 1/65536 saniye biriminde; SR alınmadıysa 0.'}
}

TRANSLATIONS['srtp'] = {
    'v': {'name': 'V', 'label': 'Sürüm', 'desc_en': 'RTP version; 2 as defined in RFC 3550.', 'desc_tr': 'Version: RTP sürümü. Bu belgede tanımlanan sürüm 2\'dir.'},
    'p': {'name': 'P', 'label': 'Dolgu', 'desc_en': 'Padding bit; indicates padding octets at end of packet before authentication tag.', 'desc_tr': 'Padding: 1 ise paketin sonunda dolgu sekizlileri vardır.'},
    'x': {'name': 'X', 'label': 'Başlık uzantısı', 'desc_en': 'Extension bit; 1 indicates header extension is present.', 'desc_tr': 'Extension: 1 ise sabit başlığı bir uzantı izler.'},
    'cc': {'name': 'CC', 'label': 'CSRC sayısı', 'desc_en': 'CSRC count: number of Contributing Source identifiers.', 'desc_tr': 'CSRC count: sabit başlığı izleyen CSRC tanımlayıcılarının sayısı.'},
    'm': {'name': 'M', 'label': 'İşaretçi', 'desc_en': 'Marker bit: profile-defined marker.', 'desc_tr': 'Marker: profile bağlı işaretçi.'},
    'pt': {
        'name': 'Payload Type (PT)',
        'label': 'Yük türü',
        'desc_en': 'Payload format identifier: static profiles in RFC 3551 (0 PCMU, 8 PCMA, 9 G722), or dynamic 96–127.',
        'desc_tr': 'Yükün biçimi; RTP\'dekiyle aynı statik veya dinamik değerler kullanılır.',
        'values_en': [["0", "PCMU (G.711 µ-law)"], ["8", "PCMA (G.711 A-law)"], ["9", "G722"], ["18", "G729"], ["96–127", "Dynamic"]],
        'values_tr': [["0", "PCMU (G.711 µ-law)"], ["8", "PCMA (G.711 A-law)"], ["9", "G722"], ["18", "G729"], ["96–127", "Dinamik"]]
    },
    'seq': {'name': 'Sequence Number', 'label': 'Sıra numarası', 'desc_en': '16-bit sequence number incremented for each SRTP packet, unencrypted in header.', 'desc_tr': 'Gönderilen her SRTP paketinde bir artar; başlıkta şifresiz kalır.'},
    'ts': {'name': 'Timestamp', 'label': 'Zaman damgası', 'desc_en': 'Sampling instant of payload data, unencrypted in header.', 'desc_tr': 'Yükün örnekleme anı; başlıkta şifresiz kalır.'},
    'ssrc': {'name': 'SSRC', 'label': 'Eşzamanlama kaynağı kimliği', 'desc_en': 'Synchronization source identifier, unencrypted in header.', 'desc_tr': 'Akışın kaynağını tanımlayan rastgele 32 bitlik kimlik; başlıkta şifresiz kalır.'},
    'encrypted_payload': {'name': 'Encrypted Payload', 'label': 'Şifrelenmiş yük', 'desc_en': 'Media data encrypted using keystream cipher (e.g. AES-CTR).', 'desc_tr': 'Yük türünün belirlediği biçimde, anahtar akışı şifreleyicisi (ör. AES-CTR) ile şifrelenmiş ses veya görüntü verisi.'},
    'auth_tag': {'name': 'Authentication Tag', 'label': 'Kimlik doğrulama etiketi', 'desc_en': 'Message authentication tag (e.g. 80-bit HMAC-SHA1) computed over entire packet and rollover counter.', 'desc_tr': 'Bütünlük denetimi ve kaynak doğrulaması sağlayan kimlik doğrulama etiketi (ör. 80 bitlik HMAC-SHA1); başlık, şifreli yük ve ROC üzerinden hesaplanır.'}
}

TRANSLATIONS['bfd'] = {
    'vers': {'name': 'Vers', 'label': 'Sürüm', 'desc_en': 'Protocol version; current version is 1.', 'desc_tr': 'Protokol sürüm numarası. Mevcut sürüm 1\'dir.'},
    'diag': {
        'name': 'Diag',
        'label': 'Tanı kodu',
        'desc_en': 'Diagnostic code specifying the reason for the last local session state change.',
        'desc_tr': 'Oturum durumundaki son değişikliğin nedenini belirten tanı kodu.',
        'values_en': [["0", "No Diagnostic"], ["1", "Control Detection Time Expired"], ["2", "Echo Function Failed"], ["3", "Neighbor Signaled Session Down"], ["4", "Forwarding Plane Reset"], ["5", "Path Down"], ["6", "Concatenated Path Down"], ["7", "AdminDown"], ["8", "Reverse Concatenated Path Down"]],
        'values_tr': [["0", "Tanı yok"], ["1", "Denetim algılama süresi doldu"], ["2", "Echo işlevi başarısız"], ["3", "Komşu oturumun kapandığını bildirdi"], ["4", "İletim düzlemi sıfırlandı"], ["5", "Yol kapalı"], ["6", "Zincirleme yol kapalı"], ["7", "Yönetici tarafından kapatılmış (AdminDown)"], ["8", "Ters zincirleme yol kapalı"]]
    },
    'sta': {
        'name': 'Sta',
        'label': 'Durum',
        'desc_en': 'Current BFD session state: 0 AdminDown, 1 Down, 2 Init, 3 Up.',
        'desc_tr': 'Mevcut BFD oturum durumu.',
        'values_en': [["0", "AdminDown"], ["1", "Down"], ["2", "Init"], ["3", "Up"]],
        'values_tr': [["0", "Yönetici tarafından kapatılmış (AdminDown)"], ["1", "Kapalı (Down)"], ["2", "Başlatılıyor (Init)"], ["3", "Açık (Up)"]]
    },
    'p': {'name': 'P', 'label': 'Sorgu bayrağı', 'desc_en': 'Poll bit; requests a control packet with Final bit set.', 'desc_tr': 'Yoklama biti; Final biti ayarlanmış bir denetim paketi talep eder.'},
    'f': {'name': 'F', 'label': 'Sonuç bayrağı', 'desc_en': 'Final bit; response to a control packet that had Poll bit set.', 'desc_tr': 'Sonuç biti; Poll biti ayarlanmış bir denetim paketine yanıt verir.'},
    'c': {'name': 'C', 'label': 'Denetim/iletim ayrık', 'desc_en': 'Control/Forwarding Plane Independent bit; 1 if BFD survives forwarding plane reboot.', 'desc_tr': 'Denetim düzlemi iletim düzleminden bağımsız ise 1.'},
    'a': {'name': 'A', 'label': 'Kimlik doğrulama var', 'desc_en': 'Authentication Present bit; 1 indicates authentication section is present.', 'desc_tr': 'Kimlik doğrulama bölümü varsa 1.'},
    'd': {'name': 'D', 'label': 'Talep kipi', 'desc_en': 'Demand mode bit; 1 indicates local system operates in Demand mode.', 'desc_tr': 'Talep kipi etkin ise 1.'},
    'm': {'name': 'M', 'label': 'Çok noktalı', 'desc_en': 'Multipoint bit; reserved for point-to-multipoint BFD (must be 0).', 'desc_tr': 'Ayrılmış çok noktalı bit; 0 olmalıdır.'},
    'detect_mult': {'name': 'Detect Mult', 'label': 'Algılama katsayısı', 'desc_en': 'Detection time multiplier used to compute session timeout.', 'desc_tr': 'Algılama zaman aşımını hesaplamak için kullanılan algılama çarpanı.'},
    'length': {'name': 'Length', 'label': 'Uzunluk', 'desc_en': 'Length of BFD control packet in octets (24 for unauthenticated packets).', 'desc_tr': 'BFD denetim paketinin sekizli cinsinden uzunluğu.'},
    'my_disc': {'name': 'My Discriminator', 'label': 'Kendi ayırt edicisi', 'desc_en': 'Unique, non-zero discriminator value generated by the transmitting system.', 'desc_tr': 'Gönderen sistemin oturumu ayırt etmek için atadığı sıfır olmayan benzersiz değer.'},
    'your_disc': {'name': 'Your Discriminator', 'label': 'Karşı tarafın ayırt edicisi', 'desc_en': 'Discriminator received from remote system; 0 if unknown.', 'desc_tr': 'Karşı sistemden alınan ayırt edici değer; bilinmiyorsa 0.'},
    'min_tx': {'name': 'Desired Min TX Interval', 'label': 'İstenen en kısa iletim aralığı', 'desc_en': 'Minimum interval (in microseconds) at which the local system wishes to transmit BFD control packets.', 'desc_tr': 'Sistemin BFD kontrol paketlerini göndermek istediği mikrosaniye cinsinden en kısa aralık.'},
    'min_rx': {'name': 'Required Min RX Interval', 'label': 'Gerekli en kısa alım aralığı', 'desc_en': 'Minimum interval (in microseconds) at which the local system can support receiving BFD control packets.', 'desc_tr': 'Sistemin BFD kontrol paketlerini alabileceği mikrosaniye cinsinden en kısa aralık.'},
    'min_echo_rx': {'name': 'Required Min Echo RX Interval', 'label': 'Gerekli en kısa echo alım aralığı', 'desc_en': 'Minimum interval (in microseconds) at which the local system can support receiving BFD echo packets (0 if unsupported).', 'desc_tr': 'Sistemin BFD Echo paketlerini alabileceği en kısa aralık; echo desteklenmiyorsa 0.'},
    'auth': {'name': 'Auth Section', 'label': 'Kimlik doğrulama bölümü', 'desc_en': 'Optional authentication section present when Auth bit (A) is set.', 'desc_tr': 'A biti ayarlanmışsa eklenen kimlik doğrulama bölümü.'}
}

TRANSLATIONS['stun'] = {
    'zero': {'name': '0 0', 'label': 'İki sıfır bit', 'desc_en': 'Most significant 2 bits of every STUN message must be 00 to distinguish STUN from multiplexed protocols.', 'desc_tr': 'Her STUN iletisinin en anlamlı iki biti 0 olmalıdır.'},
    'type': {
        'name': 'Message Type',
        'label': 'İleti türü',
        'desc_en': 'STUN message type: top 2 bits must be 0; combines message class (Request, Indication, Success/Error Response) and method.',
        'desc_tr': 'STUN ileti türü; üst 2 biti 0 olmalıdır. İleti sınıfı (Request, Indication, Success/Error Response) ile yöntemi birleştirir.',
        'values_en': [["0x0001", "Binding Request"], ["0x0011", "Binding Indication"], ["0x0101", "Binding Success Response"], ["0x0111", "Binding Error Response"]],
        'values_tr': [["0x0001", "Binding isteği"], ["0x0011", "Binding göstergesi"], ["0x0101", "Binding başarılı yanıtı"], ["0x0111", "Binding hata yanıtı"]]
    },
    'length': {'name': 'Message Length', 'label': 'İleti uzunluğu', 'desc_en': 'Length in octets of the message following the 20-octet STUN header; must be a multiple of 4.', 'desc_tr': 'STUN başlığından sonra gelen özniteliklerin sekizli cinsinden toplam uzunluğu; 4\'ün katı olmalıdır.'},
    'cookie': {'name': 'Magic Cookie', 'label': 'Sihirli çerez', 'desc_en': 'Fixed magic cookie value 0x2112A442 in network byte order; allows server to distinguish STUN from other protocols.', 'desc_tr': 'Sabit değer: 0x2112A442. Sunucunun STUN trafiğini diğer protokollerden ayırt etmesini sağlar.'},
    'transaction_id': {'name': 'Transaction ID', 'label': 'İşlem kimliği', 'desc_en': '96-bit random transaction identifier used to match requests with responses.', 'desc_tr': 'İsteği yanıtla eşleştiren, istemcinin rastgele seçtiği 96 bitlik kimlik; yanıt aynı değeri taşır.'},
    'attributes': {'name': 'Attributes', 'label': 'Öznitelikler', 'desc_en': 'Sequence of TLV attributes (Type, Length, Value) carrying NAT mappings, credentials, XOR-MAPPED-ADDRESS, etc.', 'desc_tr': 'STUN iletisinin taşıdığı öznitelikler (ör. XOR-MAPPED-ADDRESS, MESSAGE-INTEGRITY, FINGERPRINT).' }
}

TRANSLATIONS['tls'] = {
    'opaque_type': {
        'name': 'Opaque Content Type',
        'label': 'Görünür içerik türü',
        'desc_en': 'Outer record content type; always 23 (application_data) in TLS 1.3 encrypted records to hide real content type.',
        'desc_tr': 'TLS 1.3 şifreli kayıtlarında gerçek içerik türünü gizlemek için her zaman 23 (application_data) gönderilir.',
        'values_en': [["20", "change_cipher_spec"], ["21", "alert"], ["22", "handshake"], ["23", "application_data"]],
        'values_tr': [["20", "Şifreleme ayarı değişikliği (change_cipher_spec)"], ["21", "Uyarı (alert)"], ["22", "Bağlantı kurulumu (handshake)"], ["23", "Uygulama verisi (application_data)"]]
    },
    'legacy_record_version': {'name': 'Legacy Record Version', 'label': 'Eski sürüm alanı', 'desc_en': 'Legacy version field; fixed at 0x0303 (TLS 1.2) for middlebox compatibility.', 'desc_tr': 'Ara cihaz uyumluluğu için sabit 0x0303 (TLS 1.2).' },
    'length': {'name': 'Length', 'label': 'Kayıt uzunluğu', 'desc_en': 'Length in octets of the encrypted payload following this 5-octet header (ciphertext plus 1-octet inner content type and AEAD auth tag).', 'desc_tr': 'Başlıktan sonra gelen şifreli yükün bayt cinsinden uzunluğu; şifreli metin, iç içerik türü ve doğrulama etiketini kapsar.'},
    'encrypted_record': {'name': 'Encrypted Record Payload', 'label': 'Şifrelenmiş kayıt yükü', 'desc_en': 'Encrypted payload; decrypts to inner plaintext, padding, 1-octet inner ContentType, and 16-octet AEAD auth tag.', 'desc_tr': 'AEAD algoritmasıyla şifrelenmiş yük; çözüldüğünde gerçek içerik türü (ör. Handshake için 22), dolgu ve veriyi açığa çıkarır.'}
}

TRANSLATIONS['websocket'] = {
    'fin': {'name': 'FIN', 'label': 'Son çerçeve bayrağı', 'desc_en': '1 indicates this is the final fragment in a message; 0 for intermediate fragments.', 'desc_tr': '1 ise bu çerçevenin iletinin son parçası olduğunu gösterir; parçalanmamış iletilerde 1\'dir.'},
    'rsv1': {'name': 'RSV1', 'label': 'Ayrılmış bit 1', 'desc_en': 'Reserved bit; must be 0 unless an extension negotiating RSV1 usage is defined.', 'desc_tr': 'Uzantılar için ayrılmış bit; uzantı uzlaşılmadıkça 0 olmalıdır.'},
    'rsv2': {'name': 'RSV2', 'label': 'Ayrılmış bit 2', 'desc_en': 'Reserved bit; must be 0 unless an extension is negotiated.', 'desc_tr': 'Uzantılar için ayrılmış bit; uzantı uzlaşılmadıkça 0 olmalıdır.'},
    'rsv3': {'name': 'RSV3', 'label': 'Ayrılmış bit 3', 'desc_en': 'Reserved bit; must be 0 unless an extension is negotiated.', 'desc_tr': 'Uzantılar için ayrılmış bit; uzantı uzlaşılmadıkça 0 olmalıdır.'},
    'opcode': {
        'name': 'Opcode',
        'label': 'İşlem kodu',
        'desc_en': 'Frame opcode: 0 Continuation, 1 Text (UTF-8), 2 Binary, 8 Close, 9 Ping, 10 Pong.',
        'desc_tr': 'Çerçevenin işlevini tanımlayan 4 bitlik kod.',
        'values_en': [["0x0", "Continuation frame"], ["0x1", "Text frame (UTF-8)"], ["0x2", "Binary frame"], ["0x8", "Connection Close"], ["0x9", "Ping"], ["0xa", "Pong"]],
        'values_tr': [["0x0", "Devam çerçevesi"], ["0x1", "Metin (UTF-8)"], ["0x2", "İkili veri"], ["0x8", "Bağlantıyı kapatma"], ["0x9", "Ping"], ["0xa", "Pong"]]
    },
    'mask': {'name': 'MASK', 'label': 'Maskeleme bayrağı', 'desc_en': '1 indicates payload is masked with a 4-octet Masking-Key (mandatory for client-to-server frames).', 'desc_tr': '1 ise yükün 4 baytlık Maskeleme Anahtarı ile maskelendiğini belirtir; istemciden sunucuya giden çerçevelerde zorunludur.'},
    'payload_len': {'name': 'Payload length', 'label': 'Yük uzunluğu göstergesi', 'desc_en': '7-bit length indicator: 0–125 is literal length; 126 means next 2 octets are length; 127 means next 8 octets are length.', 'desc_tr': '0–125 ise doğrudan yükün bayt cinsinden uzunluğudur; 126 ise sonraki 2 sekizli, 127 ise sonraki 8 sekizli uzunluğu verir.'},
    'masking_key': {'name': 'Masking-key', 'label': 'Maskeleme anahtarı', 'desc_en': '4-octet masking key present when Mask bit is 1; used to unmask payload octets.', 'desc_tr': 'Mask biti 1 olduğunda bulunan 4 sekizlilik rastgele anahtar; yük verisi bu anahtarla XOR\'lanarak maskelenir.'},
    'payload': {'name': 'Payload Data', 'label': 'Yük verisi', 'desc_en': 'Application data (text, binary, or control payload).', 'desc_tr': 'Taşınan uygulama verisi; istemciden giden iletilerde Maskeleme Anahtarı ile maskelenmiştir.'},
    'ext_len': {'name': 'Extended payload length', 'label': 'Genişletilmiş yük uzunluğu', 'desc_en': 'Extended 16-bit or 64-bit payload length field when 7-bit length indicator is 126 or 127.', 'desc_tr': 'Yük uzunluğu 126 veya 127 olduğunda eklenen 16 bitlik veya 64 bitlik genişletilmiş uzunluk alanı.'}
}

TRANSLATIONS['http2'] = {
    'length': {'name': 'Length', 'label': 'Çerçeve yükü uzunluğu', 'desc_en': '24-bit unsigned integer length of the frame payload in octets; 9-octet header is not included.', 'desc_tr': 'Başlık hariç çerçeve yükünün sekizli cinsinden uzunluğu; 24 bitlik işaretsiz tamsayı.'},
    'type': {
        'name': 'Type',
        'label': 'Çerçeve türü',
        'desc_en': '8-bit frame type: 0x00 DATA, 0x01 HEADERS, 0x02 PRIORITY, 0x03 RST_STREAM, 0x04 SETTINGS, etc.',
        'desc_tr': 'Çerçevenin türü.',
        'values_en': [["0x00", "DATA"], ["0x01", "HEADERS"], ["0x02", "PRIORITY"], ["0x03", "RST_STREAM"], ["0x04", "SETTINGS"], ["0x05", "PUSH_PROMISE"], ["0x06", "PING"], ["0x07", "GOAWAY"], ["0x08", "WINDOW_UPDATE"], ["0x09", "CONTINUATION"]],
        'values_tr': [["0x00", "Veri (DATA)"], ["0x01", "Başlıklar (HEADERS)"], ["0x02", "Öncelik (PRIORITY)"], ["0x03", "Akışı sıfırlama (RST_STREAM)"], ["0x04", "Ayarlar (SETTINGS)"], ["0x05", "Sunucu vaadi (PUSH_PROMISE)"], ["0x06", "Ping (PING)"], ["0x07", "Oturumu kapatma (GOAWAY)"], ["0x08", "Pencere güncelleme (WINDOW_UPDATE)"], ["0x09", "Devam (CONTINUATION)"]]
    },
    'flags': {'name': 'Flags', 'label': 'Bayraklar', 'desc_en': '8-bit flags specific to frame type (e.g. END_STREAM 0x01, END_HEADERS 0x04 for HEADERS).', 'desc_tr': 'Çerçeve türüne özgü 8 bitlik bayrak dizisi; örneğin HEADERS için 0x01 END_STREAM, 0x04 END_HEADERS.'},
    'reserved': {'name': 'R', 'label': 'Ayrılmış bit', 'desc_en': 'Reserved 1-bit field; must remain unset (0x0) when sending and ignored on receipt.', 'desc_tr': 'Ayrılmış 1 bit; gönderimde 0 olmalı, alımda yok sayılmalıdır.'},
    'stream_id': {'name': 'Stream Identifier', 'label': 'Akış kimliği', 'desc_en': '31-bit stream identifier; 0x0 identifies control frames for the connection as a whole.', 'desc_tr': '31 bitlik akış kimliği; 0x0, tüm bağlantıyı ilgilendiren denetim çerçevelerini belirtir.'},
    'payload': {'name': 'Frame Payload', 'label': 'Çerçeve yükü', 'desc_en': 'Frame payload whose format and meaning depend entirely on the frame type.', 'desc_tr': 'Çerçeve türüne bağlı veri yükü (ör. HPACK ile sıkıştırılmış HTTP başlık blokları).' }
}

TRANSLATIONS['http3'] = {
    'type': {
        'name': 'Type',
        'label': 'Çerçeve türü',
        'desc_en': 'Variable-length integer identifying the frame type: 0x00 DATA, 0x01 HEADERS, 0x03 CANCEL_PUSH, 0x04 SETTINGS, etc.',
        'desc_tr': 'Çerçevenin türü, QUIC değişken uzunluklu tamsayı biçiminde.',
        'values_en': [["0x00", "DATA"], ["0x01", "HEADERS"], ["0x03", "CANCEL_PUSH"], ["0x04", "SETTINGS"], ["0x05", "PUSH_PROMISE"], ["0x07", "GOAWAY"], ["0x0d", "MAX_PUSH_ID"]],
        'values_tr': [["0x00", "Veri (DATA)"], ["0x01", "Başlıklar (HEADERS)"], ["0x03", "Sunucu gönderimini iptal etme (CANCEL_PUSH)"], ["0x04", "Ayarlar (SETTINGS)"], ["0x05", "Sunucu vaadi (PUSH_PROMISE)"], ["0x07", "Oturumu kapatma (GOAWAY)"], ["0x0d", "Azami vaat kimliği (MAX_PUSH_ID)"]]
    },
    'length': {'name': 'Length', 'label': 'Yük uzunluğu', 'desc_en': 'Variable-length integer specifying the payload length in octets.', 'desc_tr': 'Çerçeve yükünün sekizli cinsinden uzunluğu, değişken uzunluklu tamsayı olarak.'},
    'payload': {'name': 'Frame Payload', 'label': 'Çerçeve yükü', 'desc_en': 'Frame payload; for HEADERS frames, contains QPACK-encoded HTTP field sections.', 'desc_tr': 'Çerçeve türüne bağlı yük verisi; HEADERS çerçevesinde QPACK ile kodlanmış başlık alanlarını taşır.'}
}

TRANSLATIONS['ssh'] = {
    'packet_length': {'name': 'packet_length', 'label': 'Paket uzunluğu', 'desc_en': 'Length in octets of the packet, not including \'packet_length\' itself or the MAC field.', 'desc_tr': 'Kendisi ve MAC alanı hariç paketin sekizli cinsinden uzunluğu; 32 bitlik işaretsiz tamsayı.'},
    'padding_length': {'name': 'padding_length', 'label': 'Dolgu uzunluğu', 'desc_en': 'Length in octets of \'random padding\' (at least 4 octets).', 'desc_tr': 'random padding alanının bayt cinsinden uzunluğu; en az 4 sekizli olmalıdır.'},
    'payload': {'name': 'payload', 'label': 'Yük verisi', 'desc_en': 'Useful contents of the packet; uncompressed length is packet_length minus padding_length minus 1.', 'desc_tr': 'Paketin taşıdığı asıl veri; uzunluğu packet_length - padding_length - 1 sekizlidir.'},
    'padding': {'name': 'random padding', 'label': 'Rastgele dolgu', 'desc_en': 'Random padding octets to make total packet size a multiple of cipher block size (or 8).', 'desc_tr': 'Paketin şifreleme blok boyutunun katı olmasını sağlayan rastgele dolgu baytları.'},
    'mac': {'name': 'mac', 'label': 'İleti doğrulama kodu (MAC)', 'desc_en': 'Message Authentication Code computed over packet sequence number and unencrypted packet (if MAC negotiated).', 'desc_tr': 'İleti doğrulama kodu; MAC anlaşıldıysa paketin tamamı ve sıra numarası üzerinden hesaplanır. Uzunluğu seçilen algoritmaya bağlıdır; bu örnekte 32 sekizli.'}
}

TRANSLATIONS['snmp'] = {
    'pdu_tag': {'name': 'GetBulkRequest-PDU Tag', 'label': 'GetBulkRequest-PDU etiketi', 'desc_en': 'PDU tag: [5] IMPLICIT SEQUENCE (context-specific constructed type 5).', 'desc_tr': 'PDU\'nun etiketi: [5] IMPLICIT SEQUENCE, yani bağlama özgü, yapılı 5 numaralı tür.'},
    'length_form': {'name': 'Length Form', 'label': 'Uzunluk biçimi', 'desc_en': 'ASN.1 BER length encoding indicator; 0x82 indicates long form with 2 subsequent length octets.', 'desc_tr': '0x82: uzunluk uzun biçimde, ardından gelen iki sekizlide.'},
    'length': {'name': 'Length', 'label': 'Uzunluk', 'desc_en': 'Length of PDU contents in octets.', 'desc_tr': 'PDU içeriğinin uzunluğu, sekizli olarak.'},
    'rid_tag': {'name': 'INTEGER Tag (request-id)', 'label': 'INTEGER etiketi', 'desc_en': 'ASN.1 tag for request-id: INTEGER (0x02).', 'desc_tr': 'request-id\'nin türü: INTEGER.'},
    'rid_len': {'name': 'Length (request-id)', 'label': 'Uzunluk', 'desc_en': 'Length in octets of the request-id integer.', 'desc_tr': 'request-id değerinin uzunluğu.'},
    'request_id': {'name': 'request-id', 'label': 'İstek kimliği', 'desc_en': '32-bit integer correlating requests with responses.', 'desc_tr': 'İsteği yanıtla eşleştiren tamsayı.'},
    'nr_tag': {'name': 'INTEGER Tag (non-repeaters)', 'label': 'INTEGER etiketi', 'desc_en': 'ASN.1 tag for non-repeaters: INTEGER (0x02).', 'desc_tr': 'non-repeaters\'ın türü.'},
    'nr_len': {'name': 'Length (non-repeaters)', 'label': 'Uzunluk', 'desc_en': 'Length in octets of non-repeaters integer.', 'desc_tr': 'non-repeaters değerinin uzunluğu.'},
    'non_repeaters': {'name': 'non-repeaters', 'label': 'Tekrarlanmayacak değişken sayısı', 'desc_en': 'Number of variables at the start of the list that should be retrieved once (single successor).', 'desc_tr': 'Listenin başından, yalnızca bir kez sıradaki nesneyle yanıtlanacak değişken sayısı.'},
    'mr_tag': {'name': 'INTEGER Tag (max-repetitions)', 'label': 'INTEGER etiketi', 'desc_en': 'ASN.1 tag for max-repetitions: INTEGER (0x02).', 'desc_tr': 'max-repetitions\'ın türü.'},
    'mr_len': {'name': 'Length (max-repetitions)', 'label': 'Uzunluk', 'desc_en': 'Length in octets of max-repetitions integer.', 'desc_tr': 'max-repetitions değerinin uzunluğu.'},
    'max_repetitions': {'name': 'max-repetitions', 'label': 'Azami tekrar sayısı', 'desc_en': 'Maximum number of successors to be returned for each remaining variable in the list.', 'desc_tr': 'Kalan değişkenlerin her biri için en çok kaç sıradaki nesnenin döndürüleceği.'},
    'vbl_tag': {'name': 'SEQUENCE OF Tag (variable-bindings)', 'label': 'SEQUENCE OF etiketi', 'desc_en': 'ASN.1 tag for variable-bindings list: SEQUENCE OF (0x30).', 'desc_tr': 'variable-bindings listesinin türü.'},
    'vbl_len': {'name': 'Length (variable-bindings)', 'label': 'Uzunluk', 'desc_en': 'Length in octets of the variable-bindings sequence.', 'desc_tr': 'Listenin uzunluğu.'},
    'bindings': {'name': 'variable-bindings', 'label': 'Değişken bağlamaları', 'desc_en': 'List of variable bindings, each consisting of an OID and a value (NULL in requests).', 'desc_tr': 'Her biri bir OID ve bir değerden oluşan SEQUENCE\'lar; istekte değerler NULL\'dır.'}
}

TRANSLATIONS['smb2'] = {
    'zero': {'name': 'Zero', 'label': 'Sıfır', 'desc_en': 'First octet of Direct TCP transport header; must be 0x00.', 'desc_tr': 'Direct TCP taşıma başlığının ilk sekizlisi; 0 olmalıdır.'},
    'stream_length': {'name': 'StreamProtocolLength', 'label': 'TCP yük uzunluğu', 'desc_en': 'Length in octets of subsequent SMB2 message in network byte order (excludes 4-octet transport header).', 'desc_tr': 'Ardından gelen SMB2 iletisinin uzunluğu, sekizli olarak, ağ sırasında. 4 sekizlilik taşıma başlığını kapsamaz.'},
    'protocol_id': {'name': 'ProtocolId', 'label': 'Protokol kimliği', 'desc_en': 'Protocol identifier: 0xFE, \'S\', \'M\', \'B\'.', 'desc_tr': 'Protokol tanımlayıcısı: 0xFE, \'S\', \'M\', \'B\'.' },
    'structure_size': {'name': 'StructureSize', 'label': 'Yapı boyutu', 'desc_en': 'Structure size of SMB2 header; must be 64 (0x0040), little-endian.', 'desc_tr': 'Başlığın boyutu; her zaman 64.'},
    'credit_charge': {'name': 'CreditCharge', 'label': 'Kullanılan kredi sayısı', 'desc_en': 'Number of credits consumed by this request; 0 in SMB 2.0.2.', 'desc_tr': 'İsteğin tükettiği kredi sayısı; SMB 2.0.2 lehçesinde kullanılmaz ve 0\'dır.'},
    'status': {'name': '(ChannelSequence,Reserved)/Status', 'label': 'Kanal sıra numarası ve ayrılmış alan / durum', 'desc_en': 'ChannelSequence/Reserved in requests; NTSTATUS code in responses (0x00000000 SUCCESS).', 'desc_tr': 'İstekte, SMB 3.x\'te ChannelSequence ve Reserved alanları; yanıtta durum kodu. Bu örnekte 0.'},
    'command': {
        'name': 'Command',
        'label': 'Komut',
        'desc_en': 'Command code of the message (e.g. 0 NEGOTIATE, 1 SESSION_SETUP, 3 TREE_CONNECT, 13 ECHO).',
        'desc_tr': 'İletinin komut kodu.',
        'values_en': [["0", "NEGOTIATE"], ["1", "SESSION_SETUP"], ["3", "TREE_CONNECT"], ["5", "CREATE"], ["8", "READ"], ["9", "WRITE"], ["13", "ECHO"]],
        'values_tr': [["0", "NEGOTIATE"], ["1", "SESSION_SETUP"], ["3", "TREE_CONNECT"], ["5", "CREATE"], ["8", "READ"], ["9", "WRITE"], ["13", "ECHO"]]
    },
    'credit_request': {'name': 'CreditRequest/CreditResponse', 'label': 'İstenen veya verilen kredi sayısı', 'desc_en': 'Number of credits requested by client or granted by server.', 'desc_tr': 'İstekte istemcinin istediği, yanıtta sunucunun verdiği kredi sayısı.'},
    'flags': {'name': 'Flags', 'label': 'Bayraklar', 'desc_en': 'Flags indicating message attributes (e.g. Response, Async, Signed).', 'desc_tr': 'İletinin nasıl işleneceğini gösteren bayraklar (yanıt, asenkron, imzalı vb.); bu örnekte 0.'},
    'next_command': {'name': 'NextCommand', 'label': 'Sonraki komutun konumu', 'desc_en': 'Offset in octets to next compound command relative to header start; 0 if uncompounded.', 'desc_tr': 'Bileşik isteklerde sıradaki başlığın bu başlığa göre konumu; tek iletide 0.'},
    'message_id': {'name': 'MessageId', 'label': 'İleti kimliği', 'desc_en': 'Unique 64-bit value correlating requests with responses on a connection.', 'desc_tr': 'Aynı bağlantıdaki istek ile yanıtı eşleştiren benzersiz değer.'},
    'reserved': {'name': 'Reserved', 'label': 'Ayrılmış', 'desc_en': 'Reserved 4 octets in synchronous header.', 'desc_tr': 'SYNC başlığında ayrılmış alan.'},
    'tree_id': {'name': 'TreeId', 'label': 'Paylaşım bağlantısı kimliği', 'desc_en': 'Identifier of the tree connect share (0 for messages not associated with a tree connect like ECHO).', 'desc_tr': 'İsteğin ait olduğu paylaşım bağlantısı; ECHO bir paylaşıma bağlı değildir.'},
    'session_id': {'name': 'SessionId', 'label': 'Oturum kimliği', 'desc_en': '64-bit session identifier; 0 in NEGOTIATE messages.', 'desc_tr': 'Kurulmuş oturumun kimliği; NEGOTIATE iletilerinde 0 olmalıdır.'},
    'signature': {'name': 'Signature', 'label': 'İmza', 'desc_en': '16-octet cryptographic signature if packet is signed; zero if unsigned.', 'desc_tr': 'İleti imzalıysa 16 sekizlilik imza; imzasızsa 0.'},
    'echo_structure_size': {'name': 'StructureSize', 'label': 'Yapı boyutu', 'desc_en': 'Structure size of ECHO request payload; must be 4.', 'desc_tr': 'ECHO isteğinin, başlık hariç boyutu; her zaman 4.'},
    'echo_reserved': {'name': 'Reserved', 'label': 'Ayrılmış', 'desc_en': 'Reserved 2 octets in ECHO body; must be zero.', 'desc_tr': 'Kullanılmaz; 0 gönderilir.'}
}

TRANSLATIONS['bgp'] = {
    'marker': {'name': 'Marker', 'label': 'İşaretçi', 'desc_en': '16-octet synchronization marker retained for compatibility; all bits must be 1.', 'desc_tr': 'Uyumluluk için korunan 16 sekizlilik alan; bütün bitleri 1 olmalıdır.'},
    'length': {'name': 'Length', 'label': 'Uzunluk', 'desc_en': 'Total length of BGP message in octets, including 19-octet header (range 19–4096).', 'desc_tr': 'Başlık dahil mesajın toplam uzunluğu, sekizli olarak; 19 ile 4096 arasında.'},
    'type': {
        'name': 'Type',
        'label': 'Tür',
        'desc_en': 'BGP message type: 1 OPEN, 2 UPDATE, 3 NOTIFICATION, 4 KEEPALIVE.',
        'desc_tr': 'Mesaj türü.',
        'values_en': [["1", "OPEN"], ["2", "UPDATE"], ["3", "NOTIFICATION"], ["4", "KEEPALIVE"]],
        'values_tr': [["1", "Oturum açma (OPEN)"], ["2", "Güncelleme (UPDATE)"], ["3", "Bildirim (NOTIFICATION)"], ["4", "Oturumu canlı tutma (KEEPALIVE)"]]
    },
    'version': {'name': 'Version', 'label': 'Sürüm', 'desc_en': 'BGP version; 4 for BGP-4.', 'desc_tr': 'BGP sürümü; güncel sürüm 4\'tür.'},
    'my_as': {'name': 'My Autonomous System', 'label': 'Gönderenin özerk sistem numarası', 'desc_en': 'Autonomous System number of the sender.', 'desc_tr': 'Gönderenin özerk sistem (AS) numarası.'},
    'hold_time': {'name': 'Hold Time', 'label': 'Bekleme süresi', 'desc_en': 'Proposed hold time in seconds; smaller value of both peers is used (must be 0 or >= 3).', 'desc_tr': 'Önerilen tutma süresi, saniye olarak. İki tarafın önerisinden küçük olanı kullanılır; 0 ya da en az 3 olmalıdır.'},
    'bgp_id': {'name': 'BGP Identifier', 'label': 'BGP kimliği', 'desc_en': 'BGP Identifier of the sender; matches an IP address of the router, identical across all sessions.', 'desc_tr': 'Gönderenin BGP kimliği; yönlendiricinin IP adreslerinden birine eşittir ve bütün oturumlarında aynıdır.'},
    'opt_len': {'name': 'Opt Parm Len', 'label': 'İsteğe bağlı parametre uzunluğu', 'desc_en': 'Total length of optional parameters in octets; 0 if none.', 'desc_tr': 'İsteğe bağlı parametrelerin toplam uzunluğu, sekizli olarak; parametre yoksa 0.'},
    'opt_params': {'name': 'Optional Parameters', 'label': 'İsteğe bağlı parametreler', 'desc_en': 'List of optional parameters, each consisting of Parameter Type, Length, and Value.', 'desc_tr': 'Parametre türü, uzunluğu ve değerinden oluşan isteğe bağlı parametreler.'}
}


def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    protocols_dir = os.path.join(repo_dir, 'data', 'protocols')

    json_files = sorted([f for f in os.listdir(protocols_dir) if f.endswith('.json')])
    print(f"Total protocol JSON files found: {len(json_files)}")

    missing_fields = []
    updated_files = 0

    for filename in json_files:
        proto_id = filename[:-5]
        filepath = os.path.join(protocols_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        proto_trans = TRANSLATIONS.get(proto_id, {})
        if not proto_trans:
            print(f"ERROR: No translations defined for protocol {proto_id}!")
            sys.exit(1)

        fields = data.get('fields', [])
        for field in fields:
            key = field.get('key')
            trans = proto_trans.get(key)
            if not trans:
                missing_fields.append((proto_id, key, field.get('name'), field.get('desc')))
                continue

            # Populate name and label
            if 'name' in trans:
                field['name'] = trans['name']
            if 'label' in trans:
                field['label'] = trans['label']

            # Populate desc_en and desc_tr
            if 'desc_en' in trans:
                field['desc_en'] = trans['desc_en']
            if 'desc_tr' in trans:
                field['desc_tr'] = trans['desc_tr']
            elif 'desc' in field and not field.get('desc_tr'):
                field['desc_tr'] = field['desc']

            # Populate values_en and values_tr if applicable
            if 'values_en' in trans:
                field['values_en'] = trans['values_en']
            if 'values_tr' in trans:
                field['values_tr'] = trans['values_tr']

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')

        updated_files += 1

    if missing_fields:
        print(f"ERROR: {len(missing_fields)} fields missing from translations dictionary:")
        for proto, key, name, desc in missing_fields:
            print(f"  {proto}.{key} (name: {name}): {desc}")
        sys.exit(1)

    print(f"Successfully updated all {updated_files} protocol files with 100% field coverage!")


if __name__ == '__main__':
    main()
