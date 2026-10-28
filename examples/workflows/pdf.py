"""Build/check a deterministic one-page demo; replay identifiers extracted from its PDF."""
import argparse
from io import BytesIO
import json
from pathlib import Path
import subprocess
import tempfile

from pypdf import PdfReader
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.colors import HexColor

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def generate(data):
    stream = BytesIO()
    c = Canvas(stream, pagesize=(595.28, 841.89), invariant=1)
    c.setTitle('RefMint - synthetic PDF lookup example')
    c.setAuthor('RefMint')
    c.setFillColor(HexColor('#17323d'))
    c.rect(0, 675, 596, 168, fill=1, stroke=0)
    c.setFillColor(HexColor('#8bdbbf'))
    c.setFont('Helvetica-Bold', 10)
    c.drawString(42, 793, 'REFMINT / WORKFLOW LAB')
    c.setFillColor(HexColor('#ffffff'))
    c.setFont('Helvetica-Bold', 29)
    c.drawString(42, 745, 'From PDF to the right record')
    c.setFont('Helvetica', 11)
    c.drawString(42, 712, 'Three lookup routes. One unchanged invoice number.')
    c.setFillColor(HexColor('#a9680e'))
    c.setFont('Helvetica-Bold', 10)
    c.drawString(42, 642, data['warning'])
    fields = [('01 / EXISTING NUMBER', 'Invoice number', data['invoice_number']),
              ('02 / SIMPLE LOCAL ALIAS', 'Local alias', data['alias']),
              ('03 / CHECKSUMMED REFERENCE', 'RefMint reference', data['reference'])]
    for y, (heading, label, value) in zip([600, 487, 374], fields):
        c.setFillColor(HexColor('#edf4f2'))
        c.roundRect(32, y - 68, 531, 92, 8, fill=1, stroke=0)
        c.setFillColor(HexColor('#086b59'))
        c.setFont('Helvetica-Bold', 10)
        c.drawString(46, y, heading)
        c.setFillColor(HexColor('#17323d'))
        c.setFont('Helvetica', 12)
        c.drawString(46, y - 32, f'{label}: {value}')
    c.setFillColor(HexColor('#17323d'))
    c.setFont('Helvetica-Bold', 13)
    c.drawString(42, 269, 'Try all three in the local form')
    c.setFont('Helvetica', 11)
    for y, line in [(245, 'Start the repository demo with pnpm demo, then open:'),
                    (220, data['lookup_url']),
                    (192, 'Copy an identifier above into its matching field. Try a one-symbol change.'),
                    (170, 'Compare found, invalid, ambiguous and inaccessible results.')]:
        c.drawString(42, y, line)
    c.linkURL(data['lookup_url'], (42, 216, 360, 233), relative=0)
    c.setStrokeColor(HexColor('#c5d5ce'))
    c.line(42, 133, 553, 133)
    c.setFont('Helvetica', 10)
    for y, line in [(112, 'Original number and regulated identifiers stay unchanged.'),
                    (96, 'A checksum is public. It does not authorize access or prove authenticity.'),
                    (80, 'Alpha API; frozen existing-ID v1 wire format. No human-entry study.')]:
        c.drawString(42, y, line)
    c.showPage()
    c.save()
    return stream.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = json.loads((HERE / 'invoice-data.json').read_text(encoding='utf-8'))
    pdf = HERE / 'sample-invoice.pdf'
    content = generate(data)
    if args.check:
        assert pdf.read_bytes() == content, 'PDF fixture is stale; regenerate with pinned dependencies'
    else:
        pdf.write_bytes(content)
    reader = PdfReader(pdf)
    assert len(reader.pages) == 1
    text = reader.pages[0].extract_text()
    extracted = {}
    for route, label, expected in [('existing', 'Invoice number', data['invoice_number']),
                                    ('alias', 'Local alias', data['alias']),
                                    ('refmint', 'RefMint reference', data['reference'])]:
        lines = [line.removeprefix(label + ': ') for line in text.splitlines() if line.startswith(label + ': ')]
        assert lines == [expected], (route, lines)
        extracted[route] = lines[0]
    assert data['warning'] in text
    assert any(str(a.get_object().get('/A', {}).get('/URI', '')) == data['lookup_url']
               for a in reader.pages[0].get('/Annots', []))
    # Exercise lookup using actual extracted PDF text, not just its source JSON.
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'extracted.json'
        path.write_text(json.dumps(extracted), encoding='utf-8')
        subprocess.run(['node', str(HERE / 'verify-extracted.mjs'), str(path)], cwd=ROOT, check=True)
    print('One-page PDF: three extracted identifiers, unchanged invoice number, link and lookups verified.')


if __name__ == '__main__':
    main()
