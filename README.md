# wire

**English** · [Türkçe](README.tr.md) · [Comprehensive Guide (KILAVUZ.md)](KILAVUZ.md)

A bit-level reference for the header fields of network protocols, written in Turkish and
sourced from the RFCs. Each protocol page shows the header's bit diagram, a field table and
the hex dump of an example packet; every field links to the RFC section it is based on, and
field widths are machine-verified against the header diagrams in RFC texts. Protocols that
IEEE defines are verified against licensed copies of the standards, which are never committed:
the 802.1Q tag against IEEE 802.1Q-2022, PTP against IEEE 1588-2008, LLDP against IEEE
802.1AB-2016 and the MIB modules it publishes.

[Read the site](https://zaryob.github.io/wire/)

---

## Protocols and Layers Covered

This release covers 51 on-the-wire protocols, and a [Layers page](https://zaryob.github.io/wire/katmanlar/) explains the OSI and TCP/IP layers and summarises common protocols (including text-based ones such as HTTP/1.1, FTP, SMTP, POP3, IMAP and SIP, which have no bit-level header page):

1. **Link Layer**: Ethernet (RFC 826, RFC 894, RFC 9542), ARP (RFC 826), RARP (RFC 903), PPPoE (RFC 2516), 802.1Q VLAN tag (IEEE 802.1Q-2022, verified against a licensed copy), LLDP (IEEE 802.1AB-2016, verified against a licensed copy and its MIB modules), MPLS label stack entry (RFC 3032, RFC 5462).
2. **Network Layer**: IPv4 (RFC 791, RFC 2474, RFC 3168, RFC 5737), IPv6 (RFC 8200, RFC 2474, RFC 3168, RFC 3849), IPv6 Fragment (RFC 8200 §4.5), ICMPv4 (RFC 792), ICMPv6 (RFC 4443, RFC 8200), IPv6 Segment Routing Header (RFC 8754), IGMPv2 (RFC 2236), IGMPv3 Membership Query (RFC 9776), GRE (RFC 2784), IPsec AH (RFC 4302), IPsec ESP (RFC 4303), OSPFv2 Hello (RFC 2328), VRRPv3 (RFC 9568).
3. **Transport Layer**: UDP (RFC 768), TCP (RFC 9293, RFC 3168), SCTP (RFC 9260), DCCP (RFC 4340), QUIC Initial packet and 1-RTT short header (RFC 9000, RFC 9001), VXLAN (RFC 7348), Geneve (RFC 8926).
4. **Application Layer**: DNS (RFC 1035, RFC 2606), CoAP (RFC 7252), DHCPv4 (RFC 2131, RFC 2132), DHCPv6 (RFC 8415), NTPv4 (RFC 5905), RTP (RFC 3550, RFC 3551), PTP Sync, Follow_Up, Delay_Req, Delay_Resp and Announce (IEEE 1588-2008, verified against a licensed copy), RTCP Sender Report (RFC 3550), SRTP (RFC 3711), BFD (RFC 5880, RFC 5881), STUN (RFC 8489), TLS 1.3 record (RFC 9846), WebSocket frame (RFC 6455), HTTP/2 frame (RFC 9113), HTTP/3 frame (RFC 9114), SSH binary packet (RFC 4253, RFC 4251), SNMP GetBulkRequest PDU (RFC 3416, RFC 3417), SMB2 ECHO request (MS-SMB2, verified against the published specification), BGP OPEN message (RFC 4271, RFC 5398).

Additionally, the comprehensive reference guide [KILAVUZ.md](KILAVUZ.md) provides detailed explanations of **IEEE 802.3, 802.1Q (VLAN), DHCPv4 (RFC 2131), DHCPv6 (RFC 8415), NDP (RFC 4861), and ACD (RFC 5227)** along with byte-by-byte worked example breakdowns.

---

## Complete RFC Reference List

Every piece of information is anchored in IETF RFC specifications (`sources/rfcs.json`), or, where no RFC defines a protocol, in an IEEE standard (`sources/standards.json`):

| RFC | Title and Scope | Usage in wire |
|---|---|---|
| **RFC 768** | User Datagram Protocol | UDP header and pseudo-header layout. |
| **RFC 791** | Internet Protocol | IPv4 header fields, fragmentation, and routing parameters. |
| **RFC 792** | Internet Control Message Protocol | ICMP messages, types, codes, and checksums. |
| **RFC 826** | An Ethernet Address Resolution Protocol | ARP packet format and Ethernet transmission fields. |
| **RFC 894** | Transmission of IP Datagrams over Ethernet | IP packet encapsulation in Ethernet II frames (EtherType 0x0800). |
| **RFC 903** | A Reverse Address Resolution Protocol | RARP packet format and reverse address resolution mechanism. |
| **RFC 959** | File Transfer Protocol (FTP) | Summary on the Layers page (text protocol). |
| **RFC 1035** | Domain Names - Implementation and Specification | DNS header format, flags, question/answer records. |
| **RFC 1071** | Computing the Internet Checksum | 16-bit ones' complement checksum algorithm. |
| **RFC 1122** | Requirements for Internet Hosts -- Communication Layers | The four TCP/IP layers on the Layers page. |
| **RFC 1901** | Introduction to Community-based SNMPv2 | SNMPv2c message wrapper. |
| **RFC 1939** | Post Office Protocol - Version 3 | Summary on the Layers page (text protocol). |
| **RFC 2131** | Dynamic Host Configuration Protocol | DHCPv4 message format and the fixed fields shared with BOOTP. |
| **RFC 2132** | DHCP Options and BOOTP Vendor Extensions | DHCP Message Type, Parameter Request List and End options. |
| **RFC 2236** | Internet Group Management Protocol, Version 2 | IGMPv2 multicast group membership reports and queries. |
| **RFC 2328** | OSPF Version 2 | OSPF packet header and Hello packet. |
| **RFC 2474** | Definition of the Differentiated Services Field | DS field (DSCP) definition in IPv4 and IPv6 headers. |
| **RFC 2516** | A Method for Transmitting PPP Over Ethernet (PPPoE) | PPPoE packet header, discovery and session stages. |
| **RFC 2606** | Reserved Top Level DNS Names | Documentation domains (`.example`, `.test`, `example.com`). |
| **RFC 2784** | Generic Routing Encapsulation (GRE) | GRE packet header and tunnel checksum verification. |
| **RFC 3032** | MPLS Label Stack Encoding | MPLS label stack entry: Label, S bit and TTL. |
| **RFC 3168** | The Addition of Explicit Congestion Notification to IP | ECN 2-bit field in IP and control flags in TCP. |
| **RFC 3261** | SIP: Session Initiation Protocol | Summary on the Layers page (text protocol). |
| **RFC 3416** | Version 2 of the Protocol Operations for SNMP | PDU definitions; the order of the GetBulkRequest fields. |
| **RFC 3417** | Transport Mappings for SNMP | BER example that the SNMP page reproduces byte for byte; UDP 161/162. |
| **RFC 3711** | The Secure Real-time Transport Protocol (SRTP) | SRTP packet and its 80-bit authentication tag. |
| **RFC 3849** | IPv6 Address Prefix Reserved for Documentation | IPv6 documentation prefix (`2001:db8::/32`). |
| **RFC 3550** | RTP: A Transport Protocol for Real-Time Applications | RTP fixed header. |
| **RFC 3551** | RTP Profile for Audio and Video Conferences with Minimal Control | Static payload types (e.g. PT 0 = PCMU). |
| **RFC 4251** | The Secure Shell (SSH) Protocol Architecture | SSH data types. |
| **RFC 4253** | The Secure Shell (SSH) Transport Layer Protocol | SSH binary packet. |
| **RFC 4254** | The Secure Shell (SSH) Connection Protocol | Subsystems (SFTP) and port forwarding. |
| **RFC 4271** | A Border Gateway Protocol 4 (BGP-4) | BGP message header and OPEN message. |
| **RFC 4302** | IP Authentication Header | IPsec AH header, data integrity and authentication. |
| **RFC 4303** | IP Encapsulating Security Payload (ESP) | ESP header (SPI, sequence number) and trailer (padding, Pad Length, Next Header, ICV). |
| **RFC 4340** | Datagram Congestion Control Protocol (DCCP) | DCCP packet header and congestion-controlled datagram flows. |
| **RFC 4443** | ICMPv6 for the IPv6 Specification | ICMPv6 error and informational messages. |
| **RFC 4949** | Internet Security Glossary, Version 2 | The seven OSI layers and their approximate alignment with TCP/IP. |
| **RFC 5321** | Simple Mail Transfer Protocol | Summary on the Layers page (text protocol). |
| **RFC 5398** | Autonomous System (AS) Number Reservation for Documentation Use | Documentation AS numbers (64496–64511). |
| **RFC 5462** | MPLS Label Stack Entry: "EXP" Field Renamed to "Traffic Class" Field | The 3-bit TC field of the label stack entry. |
| **RFC 5737** | IPv4 Address Blocks Reserved for Documentation | IPv4 documentation blocks (`192.0.2.0/24`, etc.). |
| **RFC 5880** | Bidirectional Forwarding Detection (BFD) | BFD Control packet mandatory section. |
| **RFC 5881** | BFD for IPv4 and IPv6 (Single Hop) | BFD over UDP port 3784 and the TTL 255 rule. |
| **RFC 5905** | Network Time Protocol Version 4 | NTPv4 packet header and timestamp formats. |
| **RFC 6325** | Routing Bridges (RBridges): Base Protocol Specification | Redraws the 802.1Q VLAN tag's priority, DEI and VLAN ID bits; cited on the VLAN page as a second drawing of the tag. |
| **RFC 6455** | The WebSocket Protocol | WebSocket base framing and client-to-server masking. |
| **RFC 7252** | The Constrained Application Protocol (CoAP) | CoAP IoT message header and binary RESTful transmission. |
| **RFC 7348** | Virtual eXtensible Local Area Network (VXLAN) | VXLAN L2-over-L4 tunneling header and Virtual Network Identifier (VNI); its inner-frame diagram also draws the 802.1Q tag. |
| **RFC 8200** | Internet Protocol, Version 6 (IPv6) Specification | Fixed 40-octet IPv6 header, extension headers, and pseudo-header. |
| **RFC 8415** | Dynamic Host Configuration Protocol for IPv6 (DHCPv6) | DHCPv6 client/server message and options. |
| **RFC 8489** | Session Traversal Utilities for NAT (STUN) | STUN message header and XOR-MAPPED-ADDRESS. |
| **RFC 8754** | IPv6 Segment Routing Header (SRH) | Routing Type 4 header and its segment list. |
| **RFC 8926** | Geneve: Generic Network Virtualization Encapsulation | Geneve tunnel header and options. |
| **RFC 9000** | QUIC: A UDP-Based Multiplexed and Secure Transport | QUIC Initial packet and variable-length integers, checked against the RFC's figure notation. |
| **RFC 9001** | Using TLS to Secure QUIC | Header protection and Initial keys. |
| **RFC 9051** | Internet Message Access Protocol (IMAP) - Version 4rev2 | Summary on the Layers page (text protocol). |
| **RFC 9110** | HTTP Semantics | http and https schemes and ports. |
| **RFC 9112** | HTTP/1.1 | Summary on the Layers page (text protocol). |
| **RFC 9113** | HTTP/2 | HTTP/2 frame header and SETTINGS frame. |
| **RFC 9114** | HTTP/3 | HTTP/3 frame layout and SETTINGS frame, checked against the RFC's figure notation. |
| **RFC 9260** | Stream Control Transmission Protocol | SCTP common header, multi-streaming, and 32-bit CRC-32c checksum. |
| **RFC 9293** | Transmission Control Protocol (TCP) | Consolidates RFC 793 and modern TCP specifications. |
| **RFC 9542** | IANA Considerations for IEEE 802 Parameters | Documentation MAC addresses (`00:00:5e:00:53:xx`). |
| **RFC 9568** | Virtual Router Redundancy Protocol (VRRP) Version 3 for IPv4 and IPv6 | VRRPv3 advertisement and its IPv4 checksum. |
| **RFC 9776** | Internet Group Management Protocol, Version 3 | IGMPv3 Membership Query. |
| **RFC 9846** | The Transport Layer Security (TLS) Protocol Version 1.3 | TLS record layer (obsoletes RFC 8446). |

### IEEE standards

IEEE texts are licensed: they are never committed or redistributed. With a licensed copy at the
path named in `sources/standards.json` (under the git-ignored `.cache/`), `npm run sync:ieee`
extracts its text, compares the page's field names and widths with the standard's message
tables, and records the result in the protocol's `layout.checked`. Builds without the copy,
such as CI, check the data against that record; the cited clause and page numbers are checked
whenever the text is present. Where an RFC redraws the same fields, the page is verified
against that RFC instead.

| Standard | Title | Usage in wire |
|---|---|---|
| **IEEE 802.1Q-2022** | Bridges and Bridged Networks | VLAN tag: TPID (9.4, Table 9-1), TCI (9.6, Table 9-2), PCP and DEI (6.9.3) and the traffic types of priority values (I.4, Table I-2), verified against a licensed copy. |
| **IEEE 802.1AB-2016** | Station and Media Access Control Connectivity Discovery | LLDPDU format (8.2), basic TLV format and type values (8.4, Table 8-1), mandatory TLVs (8.5.1–8.5.4), subtype tables (Tables 8-2, 8-3) and txTTL (9.2.5.22), verified against a licensed copy. Its TLV figures are images in the PDF, so the layout is read from the clauses that state it in words and tables. The MIB modules of clause 11.5.1 are checked as well; like the PDFs, they stay outside the repository. |
| **MS-SMB2 v20260928** | Server Message Block (SMB) Protocol Versions 2 and 3 (Microsoft Open Specifications) | Direct TCP header, SMB2 SYNC header and ECHO request, verified against the published PDF; little-endian fields. |
| **IEEE 1588-2008** | Precision Clock Synchronization Protocol | PTP common header (Table 18) and the Announce, Sync, Delay_Req, Follow_Up and Delay_Resp messages (Tables 25 to 28), verified against a licensed copy. |

---

## Running and Testing

Node.js 22 or newer is enough; there are no npm dependencies.

```sh
npm start        # builds and serves at http://127.0.0.1:4174/wire/
npm run build    # builds into _site/
npm test         # tests data, RFC comparison, checksums, and links
npm run check    # syntax check, build, and test in sequence
npm run sync:ieee # with licensed IEEE PDFs in .cache/ieee/: extract text, re-check, record (needs pdfplumber)
```

---

## License

Code and Turkish text are GPL-3.0-or-later. See `NOTICE.md` and `LICENSE` for details.
