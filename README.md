# wire

**English** · [Türkçe](README.tr.md) · [Comprehensive Guide (KILAVUZ.md)](KILAVUZ.md)

A bit-level reference for the header fields of network protocols, written in Turkish and
sourced from the RFCs. Each protocol page shows the header's bit diagram, a field table and
the hex dump of an example packet; every field links to the RFC section it is based on, and
all field widths are machine-verified against ASCII diagrams in RFC texts.

[Read the site](https://zaryob.github.io/wire/)

---

## Protocols and Layers Covered

This release covers 24 on-the-wire protocols:

1. **Link Layer**: Ethernet (RFC 826, RFC 894, RFC 9542), ARP (RFC 826), RARP (RFC 903), PPPoE (RFC 2516).
2. **Network Layer**: IPv4 (RFC 791, RFC 2474, RFC 3168, RFC 5737), IPv6 (RFC 8200, RFC 2474, RFC 3168, RFC 3849), IPv6 Fragment (RFC 8200 §4.5), ICMPv4 (RFC 792), ICMPv6 (RFC 4443, RFC 8200), IGMPv2 (RFC 2236), GRE (RFC 2784), IPsec AH (RFC 4302).
3. **Transport Layer**: UDP (RFC 768), TCP (RFC 9293, RFC 3168), SCTP (RFC 9260), DCCP (RFC 4340), VXLAN (RFC 7348).
4. **Application Layer**: DNS (RFC 1035, RFC 2606), CoAP (RFC 7252), DHCPv4 (RFC 2131, RFC 2132), DHCPv6 (RFC 8415), NTPv4 (RFC 5905), RTP (RFC 3550, RFC 3551), BFD (RFC 5880, RFC 5881).

Additionally, the comprehensive reference guide [KILAVUZ.md](KILAVUZ.md) provides detailed explanations of **IEEE 802.3, 802.1Q (VLAN), DHCPv4 (RFC 2131), DHCPv6 (RFC 8415), NDP (RFC 4861), and ACD (RFC 5227)** along with byte-by-byte worked example breakdowns.

---

## Complete RFC Reference List

Every piece of information is anchored in IETF RFC specifications (`sources/rfcs.json`):

| RFC | Title and Scope | Usage in wire |
|---|---|---|
| **RFC 768** | User Datagram Protocol | UDP header and pseudo-header layout. |
| **RFC 791** | Internet Protocol | IPv4 header fields, fragmentation, and routing parameters. |
| **RFC 792** | Internet Control Message Protocol | ICMP messages, types, codes, and checksums. |
| **RFC 826** | An Ethernet Address Resolution Protocol | ARP packet format and Ethernet transmission fields. |
| **RFC 894** | Transmission of IP Datagrams over Ethernet | IP packet encapsulation in Ethernet II frames (EtherType 0x0800). |
| **RFC 903** | A Reverse Address Resolution Protocol | RARP packet format and reverse address resolution mechanism. |
| **RFC 1035** | Domain Names - Implementation and Specification | DNS header format, flags, question/answer records. |
| **RFC 1071** | Computing the Internet Checksum | 16-bit ones' complement checksum algorithm. |
| **RFC 2131** | Dynamic Host Configuration Protocol | DHCPv4 message format and the fixed fields shared with BOOTP. |
| **RFC 2132** | DHCP Options and BOOTP Vendor Extensions | DHCP Message Type, Parameter Request List and End options. |
| **RFC 2236** | Internet Group Management Protocol, Version 2 | IGMPv2 multicast group membership reports and queries. |
| **RFC 2474** | Definition of the Differentiated Services Field | DS field (DSCP) definition in IPv4 and IPv6 headers. |
| **RFC 2516** | A Method for Transmitting PPP Over Ethernet (PPPoE) | PPPoE packet header, discovery and session stages. |
| **RFC 2606** | Reserved Top Level DNS Names | Documentation domains (`.example`, `.test`, `example.com`). |
| **RFC 2784** | Generic Routing Encapsulation (GRE) | GRE packet header and tunnel checksum verification. |
| **RFC 3168** | The Addition of Explicit Congestion Notification to IP | ECN 2-bit field in IP and control flags in TCP. |
| **RFC 3849** | IPv6 Address Prefix Reserved for Documentation | IPv6 documentation prefix (`2001:db8::/32`). |
| **RFC 3550** | RTP: A Transport Protocol for Real-Time Applications | RTP fixed header. |
| **RFC 3551** | RTP Profile for Audio and Video Conferences with Minimal Control | Static payload types (e.g. PT 0 = PCMU). |
| **RFC 4302** | IP Authentication Header | IPsec AH header, data integrity and authentication. |
| **RFC 4340** | Datagram Congestion Control Protocol (DCCP) | DCCP packet header and congestion-controlled datagram flows. |
| **RFC 4443** | ICMPv6 for the IPv6 Specification | ICMPv6 error and informational messages. |
| **RFC 5737** | IPv4 Address Blocks Reserved for Documentation | IPv4 documentation blocks (`192.0.2.0/24`, etc.). |
| **RFC 5880** | Bidirectional Forwarding Detection (BFD) | BFD Control packet mandatory section. |
| **RFC 5881** | BFD for IPv4 and IPv6 (Single Hop) | BFD over UDP port 3784 and the TTL 255 rule. |
| **RFC 5905** | Network Time Protocol Version 4 | NTPv4 packet header and timestamp formats. |
| **RFC 7252** | The Constrained Application Protocol (CoAP) | CoAP IoT message header and binary RESTful transmission. |
| **RFC 7348** | Virtual eXtensible Local Area Network (VXLAN) | VXLAN L2-over-L4 tunneling header and Virtual Network Identifier (VNI). |
| **RFC 8200** | Internet Protocol, Version 6 (IPv6) Specification | Fixed 40-octet IPv6 header, extension headers, and pseudo-header. |
| **RFC 8415** | Dynamic Host Configuration Protocol for IPv6 (DHCPv6) | DHCPv6 client/server message and options. |
| **RFC 9260** | Stream Control Transmission Protocol | SCTP common header, multi-streaming, and 32-bit CRC-32c checksum. |
| **RFC 9293** | Transmission Control Protocol (TCP) | Consolidates RFC 793 and modern TCP specifications. |
| **RFC 9542** | IANA Considerations for IEEE 802 Parameters | Documentation MAC addresses (`00:00:5e:00:53:xx`). |

---

## Running and Testing

Node.js 22 or newer is enough; there are no npm dependencies.

```sh
npm start        # builds and serves at http://127.0.0.1:4174/wire/
npm run build    # builds into _site/
npm test         # tests data, RFC comparison, checksums, and links
npm run check    # syntax check, build, and test in sequence
```

---

## License

Code and Turkish text are GPL-3.0-or-later. See `NOTICE.md` and `LICENSE` for details.
