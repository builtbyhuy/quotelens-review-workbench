'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const QL = require('../dist/core.js');
const tick = () => new Promise(resolve => setImmediate(resolve));

function sample() {
  const w = QL.newWorkspace({ title: 'Repair bench parts', date: '2026-10-21', currency: 'USD' });
  w.request = [{ id: 'switch', label: 'Panel switches', quantity: 9, unit: 'pieces', maxLeadDays: null }];
  w.offers = [{ id: 'quoted-a', itemId: 'switch', supplier: 'Known supplier', quoteId: 'A-91', packSize: 5, packPrice: '7.20', minPacks: 1, stockPacks: 8, leadDays: 2, validUntil: '2026-11-01', currency: 'USD', deliveryFee: '1.00', source: { filename: 'own-parts.csv', line: 2, raw: ['switch', 'Known supplier', '7.20'] } }];
  w.offers.push({ ...structuredClone(w.offers[0]), id: 'quoted-b', supplier: 'Unknown alternative', quoteId: 'B-17', packPrice: '10.00', stockPacks: null, leadDays: null, validUntil: '' });
  return w;
}
async function harness() {
  const handlers = {}, pending = [], snapshots = [], rows = new Map();
  const app = { html: '', renders: 0, set innerHTML(value) { this.html = value; this.renders++; }, get innerHTML() { return this.html; } };
  const dialog = { innerHTML: '', addEventListener() {}, showModal() {}, close() {}, querySelector() { return { textContent: '' }; } };
  const indicator = { textContent: '', className: '' }, toast = { textContent: '', hidden: true, className: '' };
  rows.set('reason-switch', { value: '' });
  const attributes = new Map();
  rows.set('preview-quantity', { value: '120', setCustomValidity(value) { this.validationMessage = value; }, setAttribute(name, value) { attributes.set(name, value); }, removeAttribute(name) { attributes.delete(name); } });
  rows.set('preview-error', { hidden: true, textContent: '' });
  rows.set('quick-comparison', { innerHTML: '' });
  const preset = { dataset: { quantity: '100' }, innerHTML: '' };
  const document = { getElementById(id) { return id === 'app' ? app : id === 'dialog' ? dialog : id === 'toast' ? toast : rows.get(id); },
    querySelector(selector) { return selector === '.save-state' ? indicator : selector === '[data-action="preview-quantity"]' ? preset : null; }, addEventListener(type, handler) { handlers[type] = handler; } };
  // A browser runs core and UI in one realm. Keep that boundary here too: the
  // core deliberately rejects exotic/cross-realm objects during backup checks.
  let context;
  const intoRealm = value => vm.runInContext('JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ')', context);
  context = vm.createContext({ document, structuredClone: intoRealm, crypto, window: { scrollTo() {} }, setTimeout() { return 0; }, clearTimeout() {},
    QuoteStore: { all: async () => [intoRealm(sample())], put(w) { snapshots.push(structuredClone(w)); return new Promise((resolve, reject) => pending.push({ resolve, reject })); } } });
  vm.runInContext(fs.readFileSync(require.resolve('../dist/core.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'), 'utf8'), context);
  await tick(); const initialHomeHtml = app.html, initialActiveId = vm.runInContext('activeId', context);
  vm.runInContext("activeId=library[0]?.id||null;view='decision';render()", context);
  return { app, dialog, indicator, snapshots, rows, pending, attributes, initialHomeHtml, initialActiveId,
    get(expression) { return vm.runInContext(expression, context); },
    click(action, id) { const button = { disabled: false, dataset: { action, id } }; return handlers.click({ target: { closest() { return button; } } }); },
    changeNote(value) { rows.get('reason-switch').value = value; return handlers.change({ target: { dataset: { note: 'switch' }, value } }); },
    async finishOne() { await tick(); assert.ok(pending.length, 'a queued storage write should have started'); pending.shift().resolve(); await tick(); }
  };
}

test('a missing calculation script shows a recoverable error without reading or mutating saved work', async () => {
  const app = { innerHTML: '' }, toast = { textContent: '', hidden: true }, dialog = { addEventListener() {} };
  let storageReads = 0, storageWrites = 0;
  const document = { getElementById(id) { return id === 'app' ? app : id === 'dialog' ? dialog : id === 'toast' ? toast : null; },
    querySelector() { return null; }, addEventListener() {} };
  const context = vm.createContext({ document, setTimeout() { return 0; }, clearTimeout() {},
    QuoteStore: { all: async () => { storageReads++; return []; }, put() { storageWrites++; } } });
  vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'), 'utf8'), context);
  await tick();
  assert.match(app.innerHTML, /Quote comparison could not start/);
  assert.match(app.innerHTML, /href="\.\/">Reload QuoteLens/);
  assert.match(app.innerHTML, /href="guide.html">Read the guide/);
  assert.match(toast.textContent, /calculation engine did not load/);
  assert.equal(toast.hidden, false);
  assert.equal(storageReads, 0); assert.equal(storageWrites, 0);
});

test('opening the app explains the comparison before reopening any saved request', async () => {
  const h = await harness();
  assert.equal(h.initialActiveId, null);
  assert.match(h.initialHomeHtml, /Compare supplier quotes/);
  assert.match(h.initialHomeHtml, /Repair bench parts/);
  assert.match(h.initialHomeHtml, /Birch Parts costs less for 120 bolts/);
  assert.equal(h.snapshots.length, 0, 'trying the first-use comparison must not save or overwrite a workspace');
});

test('first-use quantity changes select the real lowest order cost at the pack boundary', async () => {
  const h = await harness();
  for (const [quantity, supplier, total, packs] of [[120, 'Birch Parts', '27.40', 12], [100, 'Oak Supply', '22.00', 1], [101, 'Birch Parts', '25.20', 11]]) {
    const result = h.get(`(()=>{const w=previewWorkspace(${quantity});const a=QL.analyze(w);return {valid:QL.validateWorkspace(w).valid,supplier:a.items[0].selected.offer.supplier,total:a.total,packs:a.items[0].selected.packs};})()`);
    assert.equal(result.valid, true); assert.equal(result.supplier, supplier); assert.equal(result.total, total); assert.equal(result.packs, packs);
  }
});

test('invalid preview input keeps the last valid result and blocks opening a misleading comparison', async () => {
  const h = await harness();
  for (const value of ['', '0', '1.5', '301']) {
    h.rows.get('preview-quantity').value = value;
    await h.click('preview-open');
    assert.equal(h.get('previewQuantity'), 120);
    assert.equal(h.rows.get('preview-error').hidden, false);
    assert.equal(h.attributes.get('aria-invalid'), 'true');
    assert.equal(h.snapshots.length, 0);
  }
  assert.equal(h.get('updatePreview(100)'), true);
  assert.equal(h.rows.get('preview-error').hidden, true);
  assert.equal(h.attributes.has('aria-invalid'), false);
});

test('opening the preview saves its exact chosen quantity and offers as a separate editable workspace', async () => {
  const h = await harness(); h.rows.get('preview-quantity').value = '101';
  const opening = h.click('preview-open'); await h.finishOne(); await opening;
  const saved = h.snapshots[0];
  assert.equal(saved.request.length, 1); assert.equal(saved.request[0].quantity, 101);
  assert.equal(saved.offers.length, 2); assert.equal(saved.offers[0].packPrice, '18.00'); assert.equal(saved.offers[0].deliveryFee, '4.00');
  assert.equal(QL.analyze(saved).total, '25.20');
  assert.equal(h.get('view'), 'decision');
  assert.equal(h.get('library.length'), 2); assert.notEqual(saved.id, h.get('library[0].id'));
  assert.equal(h.get('library[0].request[0].quantity'), 9);
});

test('delayed selection persistence cannot replace a textarea while its next note is being entered', async () => {
  const h = await harness(), selecting = h.click('lowest');
  const renderedBeforeStorage = h.app.renders;
  h.rows.get('reason-switch').value = 'Use the matching panel footprint';
  await h.finishOne(); await selecting;
  assert.equal(h.app.renders, renderedBeforeStorage, 'storage acknowledgement must not replace app DOM');
  assert.equal(h.rows.get('reason-switch').value, 'Use the matching panel footprint');
  const noteWrite = h.changeNote(h.rows.get('reason-switch').value);
  assert.equal(h.app.renders, renderedBeforeStorage, 'note blur must preserve the clicked review control');
  await h.click('approve');
  assert.equal(h.get('current().revision'), 3);
  assert.equal(h.get("current().notes.switch"), 'Use the matching panel footprint');
  assert.match(h.dialog.innerHTML, /Review revision 3/);
  assert.equal(h.get('modal.fingerprint'), h.get('QL.fingerprint(current())'));
  await h.finishOne(); await noteWrite;
});
test('explicit Save note captures typed values even if no native change event was emitted', async () => {
  const h = await harness(), selecting = h.click('lowest'); await h.finishOne(); await selecting;
  h.rows.get('reason-switch').value = 'Same mounting and no rewiring';
  const saving = h.click('save-note', 'switch');
  assert.equal(h.get('current().notes.switch'), 'Same mounting and no rewiring');
  assert.equal(h.get('current().revision'), 3);
  assert.match(h.app.html, /Same mounting and no rewiring/);
  const renders = h.app.renders; await h.finishOne(); await saving;
  assert.equal(h.app.renders, renders, 'save completion cannot erase a new draft');
  assert.equal(h.snapshots.at(-1).notes.switch, 'Same mounting and no rewiring');
});
test('concurrent changes persist snapshots in revision order and keep Saving until the latest succeeds', async () => {
  const h = await harness(), first = h.click('lowest'); await tick();
  const second = h.changeNote('A deliberate reviewer reason');
  assert.equal(h.snapshots.length, 1); assert.equal(h.get('saved'), false);
  assert.equal(h.indicator.textContent, 'Saving on this device…');
  await h.finishOne(); assert.equal(h.snapshots.length, 2); assert.equal(h.get('saved'), false);
  assert.equal(h.snapshots[0].revision, 2); assert.equal(h.snapshots[1].revision, 3);
  await h.finishOne(); await Promise.all([first, second]);
  assert.equal(h.get('saved'), true); assert.equal(h.indicator.textContent, 'Saved on this device');
});
test('approval lists unverified facts from selected offers only', async () => {
  const h = await harness(), selecting = h.click('lowest'); await h.finishOne(); await selecting;
  assert.equal(h.get('QL.analyze(current()).warnings.length'), 3);
  await h.click('approve'); assert.doesNotMatch(h.dialog.innerHTML, /Unknown alternative|Unverified facts/);
});
