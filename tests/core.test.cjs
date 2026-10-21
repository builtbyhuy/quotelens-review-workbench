'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const QL = require('../dist/core.js');

function workspace() { return QL.newWorkspace({ title: 'Community telescope repair', date: '2026-10-21', currency: 'EUR' }); }
function item(overrides = {}) { return { id: 'lens-ring', label: 'Anodized retaining rings', quantity: 37, unit: 'rings', maxLeadDays: null, ...overrides }; }
function offer(overrides = {}) {
  return { id: 'offer-tidal', itemId: 'lens-ring', supplier: 'Tidal Mechanics', quoteId: 'TM-73', packSize: 8, packPrice: '12.37', minPacks: 1,
    stockPacks: 50, leadDays: 4, validUntil: '2026-10-21', currency: 'EUR', deliveryFee: '3.19',
    source: { filename: 'october-rings.csv', line: 2, raw: ['lens-ring', 'Tidal Mechanics', '8', '12.37'] }, ...overrides };
}
function ready() { const w = workspace(); w.request.push(item()); w.offers.push(offer()); w.selections['lens-ring'] = 'offer-tidal'; return w; }
function copy(value) { return JSON.parse(JSON.stringify(value)); }

test('UMD module exposes the same API in a browser without dependencies', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../dist/core.js'), 'utf8'), context);
  assert.equal(typeof context.QL.analyze, 'function');
  assert.equal(context.QL.newWorkspace({ title: 'Fresh browser review', date: '2026-01-01', currency: 'USD' }).request.length, 0);
});
test('new workspace starts empty, IDs differ and invalid options reject', () => {
  const a = workspace(), b = workspace();
  assert.notEqual(a.id, b.id); assert.equal(a.revision, 1);
  assert.deepEqual(a.request, []); assert.equal(QL.analyze(a).complete, false);
  assert.throws(() => QL.newWorkspace({ title: '', date: '2026-02-30', currency: 'BTC' }));
});
test('novel arbitrary input rounds whole packs with exact decimal costs', () => {
  const w = ready(), before = JSON.stringify(w), a = QL.analyze(w), e = a.items[0].selected;
  assert.equal(a.complete, true); assert.equal(e.packs, 5); assert.equal(e.units, 40); assert.equal(e.overage, 3);
  assert.equal(e.goodsCost, '61.85'); assert.equal(e.deliveryCost, '3.19'); assert.equal(a.total, '65.04');
  assert.equal(JSON.stringify(w), before);
});
test('MOQ may increase purchase; stock counts total available packs', () => {
  const w = ready(); w.offers[0].minPacks = 9; w.offers[0].stockPacks = 8;
  let e = QL.analyze(w).items[0].selected;
  assert.equal(e.packs, 9); assert.equal(e.units, 72); assert.equal(e.total, '114.52'); assert.equal(e.eligible, false);
  assert.match(e.reasons.join(' '), /Insufficient stock/);
  w.offers[0].stockPacks = 9;
  assert.equal(QL.analyze(w).complete, true);
});
test('delivery fee per offer line changes the lowest actual purchase total', () => {
  const w = ready();
  w.offers.push(offer({ id: 'offer-alt', supplier: 'Orbit Supply', quoteId: 'OS-19', packSize: 10, packPrice: '13.00', deliveryFee: '20.00' }));
  assert.equal(QL.analyze(w).items[0].cheapest.offer.id, 'offer-tidal');
  w.offers[1].deliveryFee = '1.00';
  assert.equal(QL.analyze(w).items[0].cheapest.offer.id, 'offer-alt');
  assert.equal(QL.analyze(w).items[0].cheapest.total, '53.00');
});
test('money remains exact beyond safe numeric cents and across multiple items', () => {
  const w = ready(); w.request[0].quantity = 3; w.offers[0].packSize = 1; w.offers[0].packPrice = '999999999999999.99'; w.offers[0].deliveryFee = '0.01';
  w.request.push(item({ id: 'seal', label: 'Vacuum seals', quantity: 7 }));
  w.offers.push(offer({ id: 'offer-seal', itemId: 'seal', packSize: 1, packPrice: '0.10', deliveryFee: '0.00' }));
  w.selections.seal = 'offer-seal';
  assert.equal(QL.analyze(w).total, '3000000000000000.68');
});
test('expiry is inclusive and review date is an explicit decision input', () => {
  const w = ready(); assert.equal(QL.analyze(w).complete, true);
  w.date = '2026-10-22'; assert.equal(QL.analyze(w).complete, false);
  assert.match(QL.analyze(w).items[0].selected.reasons.join(' '), /expired/);
});
test('unknown stock, lead and expiry produce explicit warnings', () => {
  const w = ready(); Object.assign(w.offers[0], { stockPacks: null, leadDays: null, validUntil: '' });
  const a = QL.analyze(w); assert.equal(a.complete, true); assert.equal(a.items[0].selected.warnings.length, 3);
  assert.match(a.warnings.join(' '), /availability is unverified/);
  w.request[0].maxLeadDays = 6;
  assert.equal(QL.analyze(w).complete, false); assert.match(QL.analyze(w).items[0].selected.reasons.join(' '), /required to check/);
});
test('lead limit is inclusive, zero lead allowed and zero stock unavailable', () => {
  const w = ready(); w.request[0].maxLeadDays = 4; assert.equal(QL.analyze(w).complete, true);
  w.request[0].maxLeadDays = 3; assert.equal(QL.analyze(w).complete, false);
  w.request[0].maxLeadDays = 0; w.offers[0].leadDays = 0; assert.equal(QL.analyze(w).complete, true);
  w.offers[0].stockPacks = 0; assert.equal(QL.analyze(w).complete, false);
});
test('currencies and identity are checked without implicit FX or substitution', () => {
  const w = ready(); w.offers[0].currency = 'USD'; assert.equal(QL.analyze(w).complete, false);
  const e = QL.evaluateOffer(item(), offer({ itemId: 'unrelated' }), workspace());
  assert.equal(e.eligible, false); assert.match(e.reasons.join(' '), /identity/);
});
test('conflicting and exact duplicate identities both block every duplicate row', () => {
  const w = ready(); w.offers.push(offer({ id: 'offer-conflict', packPrice: '12.38' }));
  let a = QL.analyze(w); assert.equal(a.complete, false); assert.equal(a.items[0].offers.every(x => !x.eligible), true);
  assert.match(a.issues.join(' '), /Conflicting duplicate/);
  w.offers[1].packPrice = '12.370'; assert.equal(QL.validateWorkspace(w).valid, false);
  w.offers[1].packPrice = '12.37'; a = QL.analyze(w); assert.match(a.issues.join(' '), /Exact duplicate/);
  w.offers[1].quoteId = 'TM-74'; assert.equal(QL.analyze(w).complete, true);
});
test('ineligible selections never inflate the eligible subtotal', () => {
  const w = ready(); w.request.push(item({ id: 'seal', label: 'Seals', quantity: 10 }));
  w.offers.push(offer({ id: 'offer-seal', itemId: 'seal', stockPacks: 0 })); w.selections.seal = 'offer-seal';
  const a = QL.analyze(w); assert.equal(a.total, '65.04'); assert.equal(a.complete, false);
});
test('malformed and unsafe money/count values are blocked rather than rounded/coerced', () => {
  for (const bad of [0.1, '-1', 'NaN', 'Infinity', '1e3', '0.001', '01.20', '1000000000000000.00', '', null]) {
    const e = QL.evaluateOffer(item(), offer({ packPrice: bad }), workspace());
    assert.equal(e.eligible, false, String(bad)); assert.equal(e.goodsCost, null);
  }
  for (const bad of [0, -1, 1.5, '8', NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.equal(QL.evaluateOffer(item(), offer({ packSize: bad }), workspace()).eligible, false, String(bad));
  }
  assert.equal(QL.evaluateOffer(item(), offer({ packSize: 1000000000, minPacks: 1000000000 }), workspace()).eligible, false);
});
test('CSV parser supports BOM, CRLF, quoted delimiters, escaped quotes and original physical lines', () => {
  const p = QL.parseCsv('\uFEFFsku,vendor,note\r\nX,"North\r\nQuay","He said ""yes"", today"\r\n\r\nY,South,ok\r\n');
  assert.deepEqual(p.errors, []); assert.deepEqual(p.headers, ['sku', 'vendor', 'note']);
  assert.equal(p.rows[0].line, 2); assert.equal(p.rows[1].line, 5);
  assert.equal(p.rows[0].values.vendor, 'North\r\nQuay'); assert.equal(p.rows[0].raw[2], 'He said "yes", today');
});
test('CSV mapping preserves arbitrary fields and uses explicit workspace currency default', () => {
  const csv = 'Part,Company,Box,Price,Unused\nretainer-983,Juniper Metal,6,9.91,original unmodeled data\nseal-blue,"=2+3",3,2.5,keep me';
  const mapping = { itemId: 'Part', supplier: 'Company', packSize: 'Box', packPrice: 'Price', _currency: 'GBP' };
  const r = QL.importCsv(csv, mapping, 'arbitrary-supplier.csv');
  assert.deepEqual(r.errors, []); assert.equal(r.offers.length, 2); assert.equal(r.offers[1].packPrice, '2.50');
  assert.equal(r.offers[0].currency, 'GBP'); assert.equal(r.offers[0].stockPacks, null); assert.equal(r.offers[0].leadDays, null);
  assert.equal(r.offers[0].minPacks, 1); assert.equal(r.offers[0].deliveryFee, '0.00');
  assert.equal(r.offers[0].source.raw[4], 'original unmodeled data'); assert.equal(r.offers[1].source.line, 3);
  delete mapping._currency; assert.equal(QL.importCsv(csv, mapping, 'x.csv').offers.length, 0);
});
test('CSV imports are atomic on invalid row values, blank supplied currency or malformed structure', () => {
  const mapping = { itemId: 'sku', supplier: 'supplier', packSize: 'pack', packPrice: 'price', currency: 'currency', _currency: 'EUR' };
  for (const csv of ['sku,supplier,pack,price,currency\na,A,2,1.00,EUR\nb,B,2,1.001,EUR', 'sku,supplier,pack,price,currency\na,A,2,1.00,', 'sku,supplier,pack,price,currency\na,A,2,1.00,EUR\nb,B,2', 'sku,supplier,pack,price,currency\na,"A,2,1.00,EUR']) {
    const r = QL.importCsv(csv, mapping, 'bad.csv'); assert.equal(r.offers.length, 0); assert.ok(r.errors.length);
  }
});
test('CSV rejects duplicate/empty/prototype headers, quote errors, NUL and practical bounds', () => {
  for (const csv of ['a,a\n1,2', 'a, \n1,2', '__proto__,b\nx,y', 'a,b\nfoo"bar,baz', 'a,b\n"x"oops,y', 'a,b\nx,\u0000', 'a\n' + 'x'.repeat(QL.LIMITS.fieldChars + 1), 'a'.repeat(QL.LIMITS.csvChars + 1), Array(QL.LIMITS.csvRows + 3).fill('a').join('\n'), Array(QL.LIMITS.csvColumns + 1).fill('x').join(',')]) {
    const p = QL.parseCsv(csv); assert.ok(p.errors.length, csv.slice(0, 40)); assert.equal(p.rows.length, 0);
  }
});
test('fingerprint is deterministic by object key order, content-sensitive and revision-independent', () => {
  const w = ready(), fp = QL.fingerprint(w), reordered = Object.fromEntries(Object.entries(w).reverse());
  assert.equal(QL.fingerprint(reordered), fp); w.revision += 1; w.importErrors.push('Past import rejected'); assert.equal(QL.fingerprint(w), fp);
  for (const mutate of [x => x.title += ' revised', x => x.date = '2026-10-20', x => x.request[0].label += ' large', x => x.offers[0].source.raw.push('evidence'), x => x.notes['lens-ring'] = 'Keep matching alloy', x => x.selections = {}]) {
    const changed = copy(w); mutate(changed); assert.notEqual(QL.fingerprint(changed), fp);
  }
});
test('receipt is a portable immutable decision snapshot with reviewer reason and verified totals', () => {
  const w = ready(); w.notes['lens-ring'] = 'Fits existing housing'; const before = JSON.stringify(w);
  const receipt = QL.createReceipt(w, '2026-10-21T09:15:00.000Z');
  assert.equal(JSON.stringify(w), before); assert.equal(receipt.total, '65.04'); assert.equal(receipt.lines[0].reason, 'Fits existing housing');
  assert.equal(receipt.snapshot.history.length, 0); w.history.push(receipt);
  assert.deepEqual(QL.validateWorkspace(w), { valid: true, errors: [] });
  w.offers[0].packPrice = '99.00'; assert.equal(receipt.lines[0].offer.packPrice, '12.37');
  assert.notEqual(QL.fingerprint(w), receipt.fingerprint); assert.equal(QL.validateWorkspace(w).valid, true);
  const forged = copy(w); forged.history[0].lines[0].total = '1.00'; assert.equal(QL.validateWorkspace(forged).valid, false);
});
test('approval requires completion and a real ISO timestamp; invalid dates cannot be hidden', () => {
  assert.throws(() => QL.createReceipt(workspace(), '2026-10-21T00:00:00Z'), /Complete/);
  for (const now of ['yesterday', '2026-02-30T01:00:00Z', '2026-10-21T25:00:00Z', undefined]) assert.throws(() => QL.createReceipt(ready(), now), /timestamp/);
});
test('safe decision CSV escapes formula-leading text including hidden leading whitespace and quotes', () => {
  const w = ready(); w.request[0].label = '=HYPERLINK("evil")'; w.offers[0].supplier = '\t@SUM(1,2)'; w.offers[0].source.filename = '+payload.csv'; w.notes['lens-ring'] = '-1+1';
  const csv = QL.exportDecisionCsv(w), parsed = QL.parseCsv(csv);
  assert.equal(parsed.errors.length, 0); const row = parsed.rows[0].values;
  assert.equal(row.item, '\'=HYPERLINK("evil")'); assert.equal(row.supplier, "'\t@SUM(1,2)"); assert.equal(row.source_file, "'+payload.csv"); assert.equal(row.reason, "'-1+1"); assert.equal(row.total, '65.04');
  assert.throws(() => QL.exportDecisionCsv(workspace()));
});
test('portable backups strictly reject unknown schema, types, references, duplicate IDs and caps', () => {
  for (const mutate of [x => x.schemaVersion = 1, x => x.request[0].quantity = '37', x => x.offers[0].stockPacks = -1, x => x.request.push(copy(x.request[0])), x => x.offers.push(copy(x.offers[0])), x => x.extra = 'hidden', x => x.selections['lens-ring'] = 'missing', x => x.offers[0].itemId = 'unknown', x => x.notes.message = 'x'.repeat(QL.LIMITS.noteChars + 1), x => x.request = Array(QL.LIMITS.items + 1).fill(item())]) {
    const w = ready(); mutate(w); assert.equal(QL.validateWorkspace(w).valid, false);
  }
  const html = ready(); html.request[0].label = '<img src=x onerror=alert(1)>'; assert.equal(QL.validateWorkspace(html).valid, true);
});
test('unsafe backups reject dangerous keys, accessors, exotic objects, cycles, nonfinite and sparse arrays', () => {
  const malicious = JSON.parse(JSON.stringify(ready()).replace('"notes":{}', '"notes":{"__proto__":{"polluted":true}}'));
  assert.equal(QL.validateWorkspace(malicious).valid, false); assert.equal({}.polluted, undefined);
  const getter = ready(); let executed = false; Object.defineProperty(getter, 'title', { enumerable: true, get() { executed = true; return 'bad'; } });
  assert.equal(QL.validateWorkspace(getter).valid, false); assert.equal(executed, false);
  assert.equal(QL.analyze(getter).complete, false); assert.equal(executed, false);
  const cyclic = ready(); cyclic.notes.loop = cyclic; assert.equal(QL.validateWorkspace(cyclic).valid, false);
  const exotic = ready(); exotic.notes = new Date(); assert.equal(QL.validateWorkspace(exotic).valid, false);
  const sparse = ready(); sparse.request = Array(2); assert.equal(QL.validateWorkspace(sparse).valid, false);
  const nonfinite = ready(); nonfinite.offers[0].source.raw = { bad: Infinity }; assert.equal(QL.validateWorkspace(nonfinite).valid, false);
  const deep = ready(); deep.notes.a = {}; let node = deep.notes.a; for (let i = 0; i < 30; i++) node = node.a = {}; assert.equal(QL.validateWorkspace(deep).valid, false);
});
