#!/usr/bin/env python3
"""Extract the text of licensed IEEE standards for the layout checks.

IEEE texts may not be committed or redistributed. Put your own licensed copy at the
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
    sys.exit('Install the PDF reader first: python3 -m pip install pdfplumber')

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
        print(f"{entry['short']}: no copy at {copy['file']}; skipped")
        continue
    data = pdf_path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    with pdfplumber.open(pdf_path) as pdf:
        pages = [WATERMARK.sub('', page.extract_text() or '') for page in pdf.pages]
    # IEEE stamps every download with its own watermark, so another licensed copy of the
    # same edition has a different digest. The edition is identified by its content instead.
    if len(pages) != copy['pages']:
        sys.exit(f"{entry['short']}: {len(pages)} pages, expected {copy['pages']}; is this the cited edition?")
    isbn = '-'.join([entry['isbn'][:3], entry['isbn'][3], entry['isbn'][4:8], entry['isbn'][8:12], entry['isbn'][12]])
    if not any(f'ISBN {isbn}' in page for page in pages[:10]):
        sys.exit(f"{entry['short']}: ISBN {isbn} not found in the front matter; is this the cited edition?")
    if any('Authorized licensed use' in page for page in pages):
        sys.exit(f"{entry['short']}: watermark left in the extracted text")
    out = ROOT / '.cache/ieee' / f"{entry['id']}.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(''.join(f'\f[pdf {i}]\n{text}\n' for i, text in enumerate(pages, 1)))
    note = '' if digest == copy['sha256'] else f" (a different copy than the recorded check, sha256 {digest[:12]}…)"
    print(f"{entry['short']}: {len(pages)} pages → {out.relative_to(ROOT)}{note}")
    found += 1

if not found:
    print('No licensed IEEE copies found; pages keep their recorded checks.')
