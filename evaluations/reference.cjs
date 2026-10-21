'use strict';

// Separate calculation method, not a second complete QuoteLens implementation.
// It imports no production module. Contract eligibility is hand-annotated in the
// corpus; this file independently enumerates small pack counts and accumulates
// decimal rationals. A fixed handwritten table also checks these results.
function rational(text) {
  if (typeof text !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return { n: BigInt(whole + fraction), d: 10n ** BigInt(fraction.length) };
}
const zero = () => ({ n: 0n, d: 1n });
const add = (a, b) => ({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
const compare = (a, b) => a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0;
function decimal(value) {
  if (!value) return null;
  if ((value.n * 100n) % value.d !== 0n) throw Error('Reference result is not an exact two-decimal amount.');
  const scaled = value.n * 100n / value.d;
  return `${scaled / 100n}.${String(scaled % 100n).padStart(2, '0')}`;
}
function line(item, offer) {
  if (![item.quantity, offer.packSize, offer.minPacks].every(Number.isSafeInteger) || item.quantity < 1 || offer.packSize < 1 || offer.minPacks < 1) return { packs: null, units: null, total: null };
  // Bounded enumeration is intentionally practical only for this fixed corpus.
  // It does not use production's ceiling-division expression or its price parser.
  let packs;
  for (let candidate = 1; candidate <= 10000; candidate++) {
    if (candidate >= offer.minPacks && candidate * offer.packSize >= item.quantity) { packs = candidate; break; }
  }
  if (!packs) throw Error('Reference corpus exceeded 10,000 enumerated pack counts.');
  const price = rational(offer.packPrice), fee = rational(offer.deliveryFee);
  let goods = zero();
  if (price) for (let pack = 0; pack < packs; pack++) goods = add(goods, price);
  return { packs, units: packs * offer.packSize, total: price && fee ? decimal(add(goods, fee)) : null };
}
function workspace(input, annotations) {
  const lines = input.offers.map(offer => {
    const expected = annotations.find(row => row.id === offer.id).expect;
    return { id: offer.id, itemId: offer.itemId, ...line(input.request.find(item => item.id === offer.itemId), offer), eligible: expected.eligible, blocked: expected.blocked || [], warnings: expected.warnings || [] };
  });
  const cheapest = {}, selected = {};
  let subtotal = zero(), complete = input.request.length > 0;
  for (const item of input.request) {
    const eligible = lines.filter(row => row.itemId === item.id && row.eligible);
    let best = null;
    for (const row of eligible) if (!best || compare(rational(row.total), rational(best.total)) < 0) best = row;
    cheapest[item.id] = best?.id || null;
    const chosen = lines.find(row => row.id === input.selections[item.id]);
    selected[item.id] = chosen?.id || null;
    if (chosen?.eligible) subtotal = add(subtotal, rational(chosen.total));
    else complete = false;
  }
  return { lines, subtotal: decimal(subtotal), complete, cheapest, selected };
}
function naiveUnitPrice(input, itemId) {
  // Exact fraction comparison: pack price / units per pack, ignoring packs/MOQ/fees.
  let best;
  for (const offer of input.offers.filter(row => row.itemId === itemId)) {
    const value = rational(offer.packPrice);
    const perUnit = { n: value.n, d: value.d * BigInt(offer.packSize) };
    if (!best || compare(perUnit, best.value) < 0) best = { id: offer.id, value: perUnit };
  }
  return best?.id || null;
}
module.exports = { line, workspace, naiveUnitPrice };
