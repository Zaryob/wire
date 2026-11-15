# wire

**English** · [Türkçe](README.tr.md) · [Comprehensive Guide (KILAVUZ.md)](KILAVUZ.md)

A bit-level reference for the header fields of network protocols, written in Turkish and
sourced from the RFCs. Each protocol page shows the header's bit diagram, a field table and
the hex dump of an example packet; every field links to the RFC section it is based on, and
all field widths are machine-verified against ASCII diagrams in RFC texts.

[Read the site](https://zaryob.github.io/wire/)

---

## Protocols and Layers Covered

This release covers nine fundamental on-the-wire protocols:

1. **Link Layer**: Ethernet (RFC 826, RFC 894, RFC 9542), ARP (RFC 826).
2. **Network Layer**: IPv4 (RFC 791, RFC 2474, RFC 3168, RFC 5737), IPv6 (RFC 8200, RFC 2474, RFC 3168, RFC 3849), ICMPv4 (RFC 792), ICMPv6 (RFC 4443, RFC 8200).
3. **Transport Layer**: UDP (RFC 768), TCP (RFC 9293, RFC 3168).
4. **Application Layer**: DNS (RFC 1035, RFC 2606).

Additionally, the comprehensive reference guide [KILAVUZ.md](KILAVUZ.md) provides detailed explanations of **IEEE 802.3, 802.1Q (VLAN), PPPoE (RFC 2516), RARP (RFC 903), DHCPv4 (RFC 2131), DHCPv6 (RFC 8415), SCTP (RFC 9260), NDP (RFC 4861), and ACD (RFC 5227)** along with byte-by-byte worked example breakdowns.

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
| **RFC 1035** | Domain Names - Implementation and Specification | DNS header format, flags, question/answer records. |
| **RFC 1071** | Computing the Internet Checksum | 16-bit ones' complement checksum algorithm. |
| **RFC 2474** | Definition of the Differentiated Services Field | DS field (DSCP) definition in IPv4 and IPv6 headers. |
| **RFC 2606** | Reserved Top Level DNS Names | Documentation domains (`.example`, `.test`, `example.com`). |
| **RFC 3168** | The Addition of Explicit Congestion Notification to IP | ECN 2-bit field in IP and control flags in TCP. |
| **RFC 3849** | IPv6 Address Prefix Reserved for Documentation | IPv6 documentation prefix (`2001:db8::/32`). |
| **RFC 4443** | ICMPv6 for the IPv6 Specification | ICMPv6 error and informational messages. |
| **RFC 5737** | IPv4 Address Blocks Reserved for Documentation | IPv4 documentation blocks (`192.0.2.0/24`, etc.). |
| **RFC 8200** | Internet Protocol, Version 6 (IPv6) Specification | Fixed 40-octet IPv6 header and pseudo-header. |
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
