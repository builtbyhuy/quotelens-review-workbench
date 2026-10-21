"""QuoteLens: local supplier-quote review, source evidence and versioned approval.

Independent, AI-assisted portfolio project. Only the Python standard library.
"""
import argparse
import csv
import hashlib
import io
import json
import math
import re
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
REVIEW_DATE = date(2026, 10, 21)
FIELDS = ['supplier', 'quote_ref', 'sku', 'pack_size', 'unit_price', 'currency',
          'available_packs', 'lead_days', 'valid_until']
ITEMS = [
    {'sku': 'BOLT-M8', 'name': 'M8 hex bolts', 'quantity': 120},
    {'sku': 'GLOVE-M', 'name': 'Workshop gloves · medium', 'quantity': 75},
    {'sku': 'FILTER-A', 'name': 'Air filter cartridges', 'quantity': 8},
    {'sku': 'BELT-B', 'name': 'Drive belts · type B', 'quantity': 6},
]
ITEM_MAP = {item['sku']: item for item in ITEMS}


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def money(value):
    return str(value.quantize(Decimal('.01'), rounding=ROUND_HALF_UP))


class ReviewError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def parse_quotes(text, filename='quotes.csv'):
    if not isinstance(text, str) or len(text.encode('utf-8')) > 1_000_000:
        raise ReviewError('Upload a UTF-8 CSV smaller than 1 MB.')
    source_hash = digest(text)
    physical_lines = text.lstrip('\ufeff').splitlines()
    stream = io.StringIO(text.lstrip('\ufeff'), newline='')
    reader = csv.DictReader(stream, strict=True)
    try:
        if reader.fieldnames != FIELDS:
            raise ReviewError('CSV columns must match the downloadable sample, in the same order.')
        rows = []
        previous_line = reader.line_num
        for record in reader:
            line = previous_line + 1
            while line < reader.line_num and not physical_lines[line - 1].strip():
                line += 1
            previous_line = reader.line_num
            if len(rows) >= 500:
                raise ReviewError('Keep each review to 500 quote rows or fewer.')
            if None in record or any(value is None for value in record.values()):
                raise ReviewError(f'CSV row {line} has the wrong number of fields.')
            raw = dict(record)
            record = {key: value.strip() for key, value in record.items()}
            if any(len(value) > 160 for value in record.values()):
                raise ReviewError(f'CSV row {line} contains a field longer than 160 characters.')
            issues = []
            row = {'id': f'{source_hash[:10]}-{line}', 'source_line': line,
                   'source_end_line': reader.line_num, 'source': raw,
                   'supplier': record['supplier'], 'quote_ref': record['quote_ref'],
                   'sku': record['sku'], 'currency': record['currency'],
                   'issues': issues, 'cost': None, 'packs_needed': None,
                   'units_purchased': None, 'lead_days': None}
            if not record['supplier'] or not record['quote_ref']:
                issues.append('Supplier and quote reference are required.')
            if record['sku'] not in ITEM_MAP:
                issues.append('Item is not in this purchase request.')
            if record['currency'] not in {'USD', 'EUR', 'GBP', 'VND'}:
                issues.append('Currency must be USD, EUR, GBP or VND; no exchange rate is assumed.')
            parsed = {}
            for key, minimum in [('pack_size', 1), ('available_packs', 1), ('lead_days', 0)]:
                if not re.fullmatch(r'\d{1,6}', record[key]) or int(record[key]) < minimum:
                    issues.append(f'{key.replace("_", " ").capitalize()} must be a whole number from {minimum} to 999999.')
                else:
                    parsed[key] = int(record[key])
            try:
                if not re.fullmatch(r'\d{1,9}(\.\d{1,4})?', record['unit_price']):
                    raise InvalidOperation
                price = Decimal(record['unit_price'])
                if not price.is_finite() or price <= 0:
                    raise InvalidOperation
            except InvalidOperation:
                price = None
                issues.append('Pack price must be a positive decimal with at most four decimal places.')
            try:
                expiry = date.fromisoformat(record['valid_until'])
                if expiry < REVIEW_DATE:
                    issues.append(f'Quote expired before {REVIEW_DATE.isoformat()}.')
            except ValueError:
                issues.append('Valid until must be a date in YYYY-MM-DD format.')
            if 'lead_days' in parsed:
                row['lead_days'] = parsed['lead_days']
            if record['sku'] in ITEM_MAP and 'pack_size' in parsed and price is not None:
                demand = ITEM_MAP[record['sku']]['quantity']
                packs = math.ceil(demand / parsed['pack_size'])
                row.update(packs_needed=packs, units_purchased=packs * parsed['pack_size'],
                           cost=money(packs * price))
                if parsed.get('available_packs', packs) < packs:
                    issues.append('Available packs do not cover the requested quantity.')
            rows.append(row)
    except csv.Error as exc:
        raise ReviewError(f'CSV could not be read: {exc}') from exc
    if not rows:
        raise ReviewError('The CSV has no quote rows. Use a sample or add supplier offers.')
    identities = {}
    for row in rows:
        key = (row['supplier'].casefold(), row['quote_ref'].casefold(), row['sku'])
        identities.setdefault(key, []).append(row)
    for group in identities.values():
        if len(group) > 1:
            lines = ', '.join(str(row['source_line']) for row in group)
            for row in group:
                row['issues'].append(f'Duplicate supplier / quote / item identity on source lines {lines}.')
    return {'filename': Path(filename.replace('\\', '/')).name[:120] or 'quotes.csv',
            'source_hash': source_hash, 'rows': rows}


def selection_summary(parsed, selection):
    by_id = {row['id']: row for row in parsed['rows']}
    errors, selected = [], []
    for item in ITEMS:
        row = by_id.get(selection.get(item['sku']))
        if row is None or row['sku'] != item['sku']:
            errors.append(f'Choose an eligible offer for {item["name"]}.')
        elif row['issues']:
            errors.append(f'{item["name"]}: selected offer needs correction.')
        else:
            selected.append({**item, **row})
    currencies = {row['currency'] for row in selected}
    if len(currencies) > 1:
        errors.append('Selected offers use different currencies. An approved FX policy is required before comparison.')
    total = money(sum((Decimal(row['cost']) for row in selected), Decimal(0))) if len(currencies) == 1 else None
    return {'errors': errors, 'selected': selected, 'total': total,
            'currency': next(iter(currencies)) if len(currencies) == 1 else None,
            'ready': not errors, 'complete': len(selected)}


class Store:
    def __init__(self, path):
        self.path = str(path)
        self.lock = threading.RLock()
        with self.connect() as con:
            con.executescript('''
                CREATE TABLE IF NOT EXISTS reviews (
                    id TEXT PRIMARY KEY, filename TEXT NOT NULL, source TEXT NOT NULL,
                    source_hash TEXT NOT NULL, revision INTEGER NOT NULL, selection TEXT NOT NULL,
                    created TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS approvals (
                    id TEXT PRIMARY KEY, review_id TEXT NOT NULL, revision INTEGER NOT NULL,
                    fingerprint TEXT NOT NULL, receipt TEXT NOT NULL, created TEXT NOT NULL,
                    UNIQUE(review_id, revision));
                CREATE TABLE IF NOT EXISTS audit (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, review_id TEXT NOT NULL,
                    event TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL);
            ''')

    @contextmanager
    def connect(self):
        con = sqlite3.connect(self.path, timeout=10)
        con.row_factory = sqlite3.Row
        try:
            with con:
                yield con
        finally:
            con.close()

    @staticmethod
    def stamp():
        return datetime.now(timezone.utc).isoformat(timespec='seconds')

    def log(self, con, review_id, event, detail):
        con.execute('INSERT INTO audit(review_id,event,detail,created) VALUES(?,?,?,?)',
                    (review_id, event, detail, self.stamp()))

    def current_row(self, con):
        return con.execute('SELECT * FROM reviews ORDER BY rowid DESC LIMIT 1').fetchone()

    def present(self, con, row):
        if row is None:
            return None
        parsed = parse_quotes(row['source'], row['filename'])
        selection = json.loads(row['selection'])
        approval = con.execute('SELECT receipt FROM approvals WHERE review_id=? AND revision=?',
                               (row['id'], row['revision'])).fetchone()
        audit = [dict(event) for event in con.execute('SELECT * FROM audit ORDER BY seq DESC LIMIT 30')]
        return {**parsed, 'id': row['id'], 'revision': row['revision'], 'selection': selection,
                'summary': selection_summary(parsed, selection), 'items': ITEMS,
                'review_date': REVIEW_DATE.isoformat(), 'created': row['created'],
                'approval': json.loads(approval['receipt']) if approval else None,
                'audit': audit}

    def current(self):
        with self.lock, self.connect() as con:
            return self.present(con, self.current_row(con))

    def import_csv(self, text, filename):
        parsed = parse_quotes(text, filename)
        review_id = uuid.uuid4().hex[:12]
        # Preselect the cheapest eligible offer only within the request's base currency.
        selection = {}
        for item in ITEMS:
            eligible = [row for row in parsed['rows'] if row['sku'] == item['sku']
                        and not row['issues'] and row['currency'] == 'USD']
            if eligible:
                selection[item['sku']] = min(eligible, key=lambda row: (Decimal(row['cost']), row['lead_days'], row['id']))['id']
        with self.lock, self.connect() as con:
            con.execute('BEGIN IMMEDIATE')
            previous = self.current_row(con)
            if previous:
                self.log(con, previous['id'], 'Superseded', 'A replacement CSV requires a new review and approval.')
            con.execute('INSERT INTO reviews VALUES(?,?,?,?,?,?,?)',
                        (review_id, parsed['filename'], text, parsed['source_hash'], 1,
                         json.dumps(selection), self.stamp()))
            self.log(con, review_id, 'Imported', f'{parsed["filename"]}: {len(parsed["rows"])} rows; source {parsed["source_hash"][:12]}.')
            return self.present(con, self.current_row(con))

    def check_revision(self, con, review_id, revision):
        current = self.current_row(con)
        if not current or current['id'] != review_id or current['revision'] != revision:
            raise ReviewError('This review changed. Refresh before choosing or approving offers.', 409)
        return current

    def select(self, review_id, revision, sku, row_id):
        if not isinstance(sku, str) or not isinstance(row_id, str):
            raise ReviewError('Item and offer IDs must be text.')
        with self.lock, self.connect() as con:
            con.execute('BEGIN IMMEDIATE')
            row = self.check_revision(con, review_id, revision)
            parsed = parse_quotes(row['source'], row['filename'])
            candidate = next((offer for offer in parsed['rows'] if offer['id'] == row_id), None)
            if sku not in ITEM_MAP or not candidate or candidate['sku'] != sku:
                raise ReviewError('Choose an offer belonging to this purchase-request item.')
            if candidate['issues']:
                raise ReviewError('This offer contains unresolved source issues; correct and reimport the CSV.')
            selection = json.loads(row['selection'])
            if selection.get(sku) == row_id:
                return self.present(con, row)
            selection[sku] = row_id
            con.execute('UPDATE reviews SET selection=?, revision=revision+1 WHERE id=?',
                        (json.dumps(selection), review_id))
            self.log(con, review_id, 'Selection changed', f'{sku}: {candidate["supplier"]}, source line {candidate["source_line"]}. Previous approval no longer applies.')
            return self.present(con, self.current_row(con))

    def approve(self, review_id, revision):
        with self.lock, self.connect() as con:
            con.execute('BEGIN IMMEDIATE')
            row = self.check_revision(con, review_id, revision)
            existing = con.execute('SELECT receipt FROM approvals WHERE review_id=? AND revision=?',
                                   (review_id, revision)).fetchone()
            if existing:
                return self.present(con, row)
            parsed = parse_quotes(row['source'], row['filename'])
            summary = selection_summary(parsed, json.loads(row['selection']))
            if summary['errors']:
                raise ReviewError('Approval blocked: ' + ' '.join(summary['errors']), 422)
            snapshot = {'review_id': review_id, 'revision': revision,
                        'source_hash': parsed['source_hash'], 'selection': summary['selected'],
                        'total': summary['total'], 'currency': summary['currency']}
            fingerprint = digest(json.dumps(snapshot, sort_keys=True))
            receipt = {**snapshot, 'id': 'QL-' + uuid.uuid4().hex[:8].upper(),
                       'fingerprint': fingerprint, 'approved_at': self.stamp(),
                       'scope': 'Local demonstration approval; no purchase order or supplier message is sent.'}
            con.execute('INSERT INTO approvals VALUES(?,?,?,?,?,?)',
                        (receipt['id'], review_id, revision, fingerprint, json.dumps(receipt), self.stamp()))
            self.log(con, review_id, 'Approved', f'{receipt["id"]}: {summary["currency"]} {summary["total"]}; snapshot {fingerprint[:12]}.')
            return self.present(con, row)

    def export_csv(self):
        current = self.current()
        if not current or not current['approval']:
            raise ReviewError('Approve the current selection before exporting the decision.', 409)
        out = io.StringIO(newline='')
        writer = csv.writer(out)
        writer.writerow(['approval_id', 'sku', 'supplier', 'quote_ref', 'required_units',
                         'packs_purchased', 'units_purchased', 'total', 'currency',
                         'source_filename', 'source_line', 'source_sha256', 'snapshot_sha256'])
        def cell(value):
            value = str(value)
            return "'" + value if value.lstrip().startswith(('=', '+', '-', '@')) else value
        for row in current['summary']['selected']:
            writer.writerow([cell(value) for value in [current['approval']['id'], row['sku'],
                             row['supplier'], row['quote_ref'], row['quantity'], row['packs_needed'],
                             row['units_purchased'], row['cost'], row['currency'], current['filename'],
                             row['source_line'], current['source_hash'], current['approval']['fingerprint']]])
        return out.getvalue()


def sample(name):
    if not isinstance(name, str) or name not in {'clean', 'conflict'}:
        raise ReviewError('Choose the clean or conflict sample.')
    return (ROOT / 'samples' / f'{name}.csv').read_text(encoding='utf-8')


def make_server(store, port=8767):
    class Handler(BaseHTTPRequestHandler):
        def send(self, status, body, kind='application/json; charset=utf-8', attachment=None):
            data = body.encode('utf-8') if isinstance(body, str) else body
            self.send_response(status)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            if attachment:
                self.send_header('Content-Disposition', f'attachment; filename="{attachment}"')
            self.end_headers()
            self.wfile.write(data)

        def json(self, data, status=200):
            self.send(status, json.dumps(data, ensure_ascii=False))

        def valid_host(self):
            allowed = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
            if self.headers.get('Host') not in allowed:
                raise ReviewError('Use the local loopback address printed by the server.', 403)

        def do_GET(self):
            try:
                self.valid_host()
                path = urlsplit(self.path).path
                if path == '/api/review':
                    return self.json(store.current())
                if path == '/api/export':
                    return self.send(200, store.export_csv(), 'text/csv; charset=utf-8', 'quotelens-decision.csv')
                if path == '/api/receipt':
                    current = store.current()
                    if not current or not current['approval']:
                        raise ReviewError('There is no approval for the current selection.', 409)
                    return self.send(200, json.dumps(current['approval'], indent=2), attachment='quotelens-receipt.json')
                if path in {'/samples/clean.csv', '/samples/conflict.csv'}:
                    return self.send(200, sample(Path(path).stem), 'text/csv; charset=utf-8', Path(path).name)
                assets = {'/': ('index.html', 'text/html; charset=utf-8'),
                          '/app.js': ('app.js', 'text/javascript; charset=utf-8'),
                          '/style.css': ('style.css', 'text/css; charset=utf-8')}
                if path not in assets:
                    raise ReviewError('This page does not exist.', 404)
                asset, content_type = assets[path]
                return self.send(200, (ROOT / 'web' / asset).read_bytes(), content_type)
            except ReviewError as exc:
                self.json({'error': str(exc)}, exc.status)

        def do_POST(self):
            try:
                self.valid_host()
                origin = self.headers.get('Origin')
                if origin and origin not in {f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'}:
                    raise ReviewError('Cross-origin writes are not allowed.', 403)
                if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                    raise ReviewError('Send application/json.', 415)
                try:
                    length = int(self.headers.get('Content-Length', '0'))
                except ValueError:
                    raise ReviewError('Invalid request size.')
                if not 0 < length <= 1_100_000:
                    raise ReviewError('Request is empty or too large.', 413)
                try:
                    data = json.loads(self.rfile.read(length))
                except (ValueError, UnicodeError):
                    raise ReviewError('Send a valid JSON object.')
                if not isinstance(data, dict):
                    raise ReviewError('Send a JSON object.')
                path = urlsplit(self.path).path
                if path == '/api/demo':
                    name = data.get('scenario', 'conflict')
                    result = store.import_csv(sample(name), f'{name}.csv')
                elif path == '/api/import':
                    name = data.get('filename', 'quotes.csv')
                    if not isinstance(name, str):
                        raise ReviewError('Filename must be text.')
                    result = store.import_csv(data.get('csv'), name)
                elif path in {'/api/select', '/api/approve'}:
                    review_id, revision = data.get('review_id'), data.get('revision')
                    if not isinstance(review_id, str) or type(revision) is not int:
                        raise ReviewError('Include the review ID and numeric revision.')
                    if path == '/api/select':
                        result = store.select(review_id, revision, data.get('sku'), data.get('row_id'))
                    else:
                        result = store.approve(review_id, revision)
                else:
                    raise ReviewError('This action does not exist.', 404)
                return self.json(result)
            except ReviewError as exc:
                self.json({'error': str(exc)}, exc.status)
            except (sqlite3.Error, OSError):
                self.json({'error': 'Local storage is unavailable. Check the server and try again.'}, 500)

        def log_message(self, fmt, *args):
            print('%s %s' % (self.log_date_time_string(), fmt % args), flush=True)

    return ThreadingHTTPServer(('127.0.0.1', port), Handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8767)
    parser.add_argument('--database', default=str(ROOT / 'quotelens.sqlite3'))
    args = parser.parse_args()
    store = Store(args.database)
    if store.current() is None:
        store.import_csv(sample('conflict'), 'conflict.csv')
    server = make_server(store, args.port)
    print(f'QuoteLens is ready at http://127.0.0.1:{server.server_port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
