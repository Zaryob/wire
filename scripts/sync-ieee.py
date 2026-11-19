#!/usr/bin/env python3
"""Extract the text of licensed standards (IEEE, Microsoft Open Specifications) for the layout checks.

These texts may not be committed or redistributed. Put your own licensed copy at the
path named by `copy.file` in sources/standards.json (under .cache/, which git ignores);
this script checks that it is the cited edition and writes its text, page by page, to
.cache/ieee/<id>.txt. Every page is preceded by a "\\f[pdf N]" line. The licence
watermark line IEEE stamps on each downloaded page is removed.

Requires pdfplumber (python3 -m pip install pdfplumber).
"""
import hashlib
import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit('PDF okuyucusunu yükleyin: python3 -m pip install pdfplumber')

ROOT = Path(__file__).resolve().parents[1]
STANDARDS = json.loads((ROOT / 'sources/standards.json').read_text())
WATERMARK = re.compile(r'^Authorized licensed use limited to:.*$', re.M)

found = 0
for entry in STANDARDS['entries']:
    copy = entry.get('copy')
    if not copy:
        continue
    pdf_path = ROOT / copy['file']
    if not pdf_path.exists():
        print(f"{entry['short']}: {copy['file']} konumunda kopya bulunamadı. Bu standart atlandı.")
        continue
    data = pdf_path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    out = ROOT / '.cache/ieee' / f"{entry['id']}.txt"
    stamp = out.with_suffix('.sha256')
    # A copy whose text was already extracted is skipped; extraction of a large standard takes minutes.
    if out.exists() and stamp.exists() and stamp.read_text().strip() == digest and '--force' not in sys.argv:
        print(f"{entry['short']}: Bu kopyanın metni daha önce çıkarılmış.")
        found += 1
        continue
    with pdfplumber.open(pdf_path) as pdf:
        pages = [WATERMARK.sub('', page.extract_text() or '') for page in pdf.pages]
    # IEEE stamps every download with its own watermark, so another licensed copy of the
    # same edition has a different digest. The edition is identified by its content instead.
    if len(pages) != copy['pages']:
        sys.exit(f"{entry['short']}: {len(pages)} sayfa bulundu, {copy['pages']} sayfa bekleniyordu. Atıf yapılan baskıyı kontrol edin.")
    if entry.get('isbn'):
        isbn = '-'.join([entry['isbn'][:3], entry['isbn'][3], entry['isbn'][4:8], entry['isbn'][8:12], entry['isbn'][12]])
        if not any(f'ISBN {isbn}' in page for page in pages[:10]):
            sys.exit(f"{entry['short']}: ISBN {isbn} ön sayfalarda bulunamadı. Atıf yapılan baskıyı kontrol edin.")
    # Documents without an ISBN (Microsoft Open Specifications) name their version on every page.
    if copy.get('marker') and not all(copy['marker'] in page for page in pages[1:]):
        sys.exit(f"{entry['short']}: Bazı sayfalarda {copy['marker']} ibaresi bulunamadı. Atıf yapılan sürümü kontrol edin.")
    if any('Authorized licensed use' in page for page in pages):
        sys.exit(f"{entry['short']}: Çıkarılan metinde filigran kaldı.")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(''.join(f'\f[pdf {i}]\n{text}\n' for i, text in enumerate(pages, 1)))
    stamp.write_text(digest + '\n')
    note = '' if digest == copy['sha256'] else f" (doğrulama kaydında kullanılandan farklı kopya, SHA-256 {digest[:12]}…)"
    print(f"{entry['short']}: {len(pages)} sayfa → {out.relative_to(ROOT)}{note}")
    found += 1

if not found:
    print('Lisanslı IEEE kopyası bulunamadı. Sayfaların doğrulama kayıtları korundu.')
