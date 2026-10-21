import csv
import io
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from quotelens import FIELDS, ReviewError, Store, make_server, parse_quotes, sample, selection_summary


class QuoteReviewTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / 'test.sqlite3'
        self.store = Store(self.path)

    def tearDown(self):
        self.directory.cleanup()

    def test_whole_pack_purchase_cost_not_misleading_unit_price(self):
        rows = parse_quotes(sample('clean'))['rows']
        bolts = [row for row in rows if row['sku'] == 'BOLT-M8']
        self.assertEqual([row['cost'] for row in bolts], ['36.00', '26.40', '22.80'])
        self.assertEqual(bolts[0]['units_purchased'], 200)
        self.assertEqual(bolts[1]['units_purchased'], 120)

    def test_clean_fixture_reconciles_to_independent_expected_total(self):
        review = self.store.import_csv(sample('clean'), 'supplier.csv')
        self.assertTrue(review['summary']['ready'])
        self.assertEqual(review['summary']['total'], '256.80')
        self.assertEqual(review['summary']['complete'], 4)

    def test_conflicts_expiry_and_insufficient_stock_block_approval(self):
        review = self.store.import_csv(sample('conflict'), 'conflict.csv')
        self.assertEqual(sum(bool(row['issues']) for row in review['rows']), 4)
        self.assertEqual(review['summary']['complete'], 3)
        with self.assertRaises(ReviewError) as context:
            self.store.approve(review['id'], 1)
        self.assertEqual(context.exception.status, 422)

    def test_duplicate_identity_marks_both_source_rows(self):
        rows = parse_quotes(sample('conflict'))['rows']
        duplicates = [row for row in rows if any('Duplicate' in issue for issue in row['issues'])]
        self.assertEqual([row['source_line'] for row in duplicates], [13, 14])

    def test_missing_currency_does_not_become_default(self):
        text = sample('clean').replace('18.00,USD', '18.00,', 1)
        row = parse_quotes(text)['rows'][0]
        self.assertEqual(row['currency'], '')
        self.assertTrue(any('Currency' in issue for issue in row['issues']))

    def test_mixed_selected_currencies_require_fx_policy(self):
        text = sample('clean').replace('0.19,USD', '0.19,EUR')
        parsed = parse_quotes(text)
        selection = {}
        for row in parsed['rows']:
            if row['sku'] not in selection:
                selection[row['sku']] = row['id']
        selection['BOLT-M8'] = next(row['id'] for row in parsed['rows'] if row['currency'] == 'EUR')
        summary = selection_summary(parsed, selection)
        self.assertFalse(summary['ready'])
        self.assertIsNone(summary['total'])
        self.assertTrue(any('currencies' in error for error in summary['errors']))

    def test_malformed_and_nonfinite_numbers_are_invalid(self):
        for bad in ['NaN', 'Infinity', '-1', '1e3', '1.23456']:
            with self.subTest(bad=bad):
                row = parse_quotes(sample('clean').replace('18.00', bad, 1))['rows'][0]
                self.assertIsNone(row['cost'])
                self.assertTrue(row['issues'])

    def test_wrong_headers_and_extra_columns_fail_without_partial_import(self):
        for text in ['', 'supplier,sku\nA,B\n', sample('clean').replace('BOLT-M8,100', 'BOLT-M8,unexpected,100', 1)]:
            with self.subTest(text=text[:25]):
                with self.assertRaises(ReviewError):
                    self.store.import_csv(text, 'bad.csv')
                self.assertIsNone(self.store.current())

    def test_source_line_numbers_survive_quoted_multiline_fields(self):
        rows = list(csv.DictReader(io.StringIO(sample('clean'))))
        rows[0]['supplier'] = 'Northline\nSupply'
        buffer = io.StringIO(newline='')
        writer = csv.DictWriter(buffer, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
        parsed = parse_quotes(buffer.getvalue())
        self.assertEqual(parsed['rows'][0]['source_line'], 2)
        self.assertEqual(parsed['rows'][0]['source_end_line'], 3)
        self.assertEqual(parsed['rows'][1]['source_line'], 4)

    def test_blank_physical_lines_do_not_shift_source_references(self):
        text = sample('clean').replace('Northline Supply,NL-1042,GLOVE-M', '\n\nNorthline Supply,NL-1042,GLOVE-M', 1)
        parsed = parse_quotes(text)
        self.assertEqual(parsed['rows'][1]['source_line'], 5)

    def test_approval_repeated_request_returns_same_receipt(self):
        review = self.store.import_csv(sample('clean'), 'clean.csv')
        first = self.store.approve(review['id'], 1)
        second = self.store.approve(review['id'], 1)
        self.assertEqual(first['approval'], second['approval'])
        self.assertEqual(sum(event['event'] == 'Approved' for event in second['audit']), 1)

    def test_changing_selection_invalidates_previous_approval(self):
        review = self.store.import_csv(sample('clean'), 'clean.csv')
        receipt = self.store.approve(review['id'], 1)['approval']
        alternative = review['rows'][0]
        changed = self.store.select(review['id'], 1, 'BOLT-M8', alternative['id'])
        self.assertIsNone(changed['approval'])
        self.assertEqual(changed['revision'], 2)
        with self.assertRaises(ReviewError):
            self.store.approve(review['id'], 1)
        new_receipt = self.store.approve(review['id'], 2)['approval']
        self.assertNotEqual(receipt['fingerprint'], new_receipt['fingerprint'])

    def test_replacement_import_cannot_reuse_old_approval(self):
        old = self.store.import_csv(sample('clean'), 'v1.csv')
        self.store.approve(old['id'], 1)
        new = self.store.import_csv(sample('clean'), 'v2.csv')
        self.assertIsNone(new['approval'])
        with self.assertRaises(ReviewError) as context:
            self.store.approve(old['id'], 1)
        self.assertEqual(context.exception.status, 409)

    def test_persistence_after_reopening_database(self):
        review = self.store.import_csv(sample('clean'), 'clean.csv')
        approved = self.store.approve(review['id'], 1)
        reopened = Store(self.path).current()
        self.assertEqual(reopened['approval'], approved['approval'])
        self.assertEqual(reopened['source_hash'], approved['source_hash'])

    def test_export_retains_row_sources_and_defuses_formula_cells(self):
        review = self.store.import_csv(sample('clean').replace('Eastworks Trading', '=Eastworks Trading'), 'clean.csv')
        approved = self.store.approve(review['id'], 1)
        exported = list(csv.DictReader(io.StringIO(self.store.export_csv())))
        self.assertEqual(len(exported), 4)
        self.assertTrue(exported[0]['supplier'].startswith("'="))
        self.assertEqual(exported[0]['source_sha256'], review['source_hash'])
        self.assertEqual(exported[0]['snapshot_sha256'], approved['approval']['fingerprint'])
        self.assertEqual(exported[0]['source_line'], '10')

    def test_export_is_unavailable_before_approval(self):
        self.store.import_csv(sample('clean'), 'clean.csv')
        with self.assertRaises(ReviewError):
            self.store.export_csv()

    def test_invalid_offer_and_cross_item_selection_are_rejected(self):
        review = self.store.import_csv(sample('conflict'), 'conflict.csv')
        invalid = next(row for row in review['rows'] if row['issues'])
        with self.assertRaises(ReviewError):
            self.store.select(review['id'], 1, invalid['sku'], invalid['id'])
        with self.assertRaises(ReviewError):
            self.store.select(review['id'], 1, 'FILTER-A', review['rows'][0]['id'])

    def test_parallel_approval_creates_one_receipt(self):
        review = self.store.import_csv(sample('clean'), 'clean.csv')
        receipts = []
        def approve():
            receipts.append(self.store.approve(review['id'], 1)['approval']['id'])
        workers = [threading.Thread(target=approve) for _ in range(3)]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join()
        self.assertEqual(len(receipts), 3)
        self.assertEqual(len(set(receipts)), 1)


class HttpBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        cls.store = Store(Path(cls.directory.name) / 'http.sqlite3')
        cls.store.import_csv(sample('conflict'), 'conflict.csv')
        cls.server = make_server(cls.store, 0)
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join()
        cls.directory.cleanup()

    def call(self, path, data=None, headers=None):
        request = urllib.request.Request(self.base + path,
                 data=None if data is None else json.dumps(data).encode(),
                 headers={'Content-Type':'application/json', **(headers or {})})
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def test_ui_assets_and_source_api_are_served(self):
        with urllib.request.urlopen(self.base + '/') as response:
            self.assertIn(b'Review supplier quotes', response.read())
            self.assertIn("frame-ancestors 'none'", response.headers['Content-Security-Policy'])
        status, review = self.call('/api/review')
        self.assertEqual(status, 200)
        self.assertIn('source_hash', review)

    def test_cross_origin_write_is_rejected(self):
        status, result = self.call('/api/demo', {'scenario':'clean'}, {'Origin':'https://example.com'})
        self.assertEqual(status, 403)
        self.assertIn('Cross-origin', result['error'])

    def test_malformed_action_fields_return_useful_errors(self):
        status, _ = self.call('/api/demo', {'scenario':[]})
        self.assertEqual(status, 400)
        review = self.call('/api/review')[1]
        status, _ = self.call('/api/select', {'review_id':review['id'],'revision':review['revision'],'sku':[],'row_id':[]})
        self.assertEqual(status, 400)

    def test_dns_rebinding_host_is_rejected(self):
        status, _ = self.call('/api/review', headers={'Host':'attacker.example'})
        self.assertEqual(status, 403)

    def test_http_import_approve_and_export_work_end_to_end(self):
        status, review = self.call('/api/demo', {'scenario':'clean'})
        self.assertEqual(status, 200)
        status, approved = self.call('/api/approve', {'review_id':review['id'],'revision':1})
        self.assertEqual(status, 200)
        self.assertEqual(approved['approval']['total'], '256.80')
        with urllib.request.urlopen(self.base + '/api/export') as response:
            self.assertIn(b'approval_id,sku,supplier', response.read())
        with urllib.request.urlopen(self.base + '/api/receipt') as response:
            receipt = json.loads(response.read())
            self.assertEqual(receipt['fingerprint'], approved['approval']['fingerprint'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
