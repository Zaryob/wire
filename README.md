# wire

**English** · [Türkçe](README.tr.md)

A bit-level reference for the header fields of network protocols, written in Turkish and
sourced from the RFCs. Each protocol page shows the header's bit diagram, a field table and
the hex dump of an example packet; every field links to the RFC section it is based on.

[Read the site](https://zaryob.github.io/wire/)

This release covers Ethernet, ARP, IPv4, IPv6, ICMP, ICMPv6, UDP, TCP and DNS.

## Running it

Node.js 22 or newer is enough; there are no npm dependencies.

```sh
npm start        # builds and serves at http://127.0.0.1:4174/wire/
npm run build    # builds into _site/
npm test         # data, RFC comparison, example packets and links
```

## Where the data comes from

All information is taken from RFCs. The RFCs in use are listed in `sources/rfcs.json`.

- `npm run sync` downloads the texts and metadata of the listed RFCs from rfc-editor.org.
  The texts are kept under `.cache/rfc/` (not committed); the metadata and the sha256
  digests of the texts are written to `sources/bibliography.json`. The site's Bibliography
  page is generated from that file.
- `data/protocols/*.json` holds the fields of each protocol. During the build and the
  tests, field widths are compared with the header diagram in the cited RFC text
  (`src/rfc.mjs`, `src/sources.mjs`). The build stops on a mismatch.
- The Turkish field descriptions are hand-written summaries of the relevant RFC section;
  the `ref` property of each one names the RFC and section it relies on.
- The example packets are not real captures: they are generated from the example values
  of the fields, and checksums are computed as described in RFC 1071 (`src/encode.mjs`).
  Addresses come from the documentation ranges (RFC 5737, RFC 3849, RFC 9542, RFC 2606).

When there is no cache, the build and the tests download the RFC texts themselves and
compare their digests with the ones in the bibliography.

## Adding a protocol

1. Add the required RFCs to `sources/rfcs.json` and run `npm run sync`.
2. Write `data/protocols/<name>.json`. The `layout` property points at the diagram to
   compare against: for `kind: "diagram"`, a distinctive `anchor` taken from one row of
   the diagram.
3. Run `npm test`.

## Publishing

`.github/workflows/site.yml` runs `npm run check` on every push and pull request. Pushes
to `main` are then deployed to GitHub Pages. In the repository's Pages settings the
publishing source must be **GitHub Actions**.

The default deployment prefix is `/wire`; set `SITE_BASEURL=''` to build for a domain root.

## Shared theme

`public/assets/console/` is copied from the
[console-theme](https://github.com/Zaryob/console-theme) repository. The site has not yet
been added to that repository's `scripts/sync.py` targets or to its
`_data/console_projects.json` registry, so the other sites do not link to it and theme
updates have to be copied by hand.

## License

Code and Turkish text are GPL-3.0-or-later. See `NOTICE.md` for details.
