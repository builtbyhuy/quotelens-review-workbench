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
  const document = { getElementById(id) { return id === 'app' ? app : id === 'dialog' ? dialog : id === 'toast' ? toast : rows.get(id); },
    querySelector(selector) { return selector === '.save-state' ? indicator : null; }, addEventListener(type, handler) { handlers[type] = handler; } };
  const context = vm.createContext({ document, QL, structuredClone, crypto, setTimeout() { return 0; }, clearTimeout() {},
    QuoteStore: { all: async () => [sample()], put(w) { snapshots.push(structuredClone(w)); return new Promise((resolve, reject) => pending.push({ resolve, reject })); } } });
  vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'), 'utf8'), context);
  await tick(); vm.runInContext("view='decision';render()", context);
  return { app, dialog, indicator, snapshots, rows, pending,
    get(expression) { return vm.runInContext(expression, context); },
    click(action, id) { const button = { disabled: false, dataset: { action, id } }; return handlers.click({ target: { closest() { return button; } } }); },
    changeNote(value) { rows.get('reason-switch').value = value; return handlers.change({ target: { dataset: { note: 'switch' }, value } }); },
    async finishOne() { await tick(); assert.ok(pending.length, 'a queued storage write should have started'); pending.shift().resolve(); await tick(); }
  };
}

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
