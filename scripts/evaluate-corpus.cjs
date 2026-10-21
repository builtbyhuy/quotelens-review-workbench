#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const QL = require('../dist/core.js');
const corpus = require('../evaluations/corpus.cjs');
const reference = require('../evaluations/reference.cjs');
const root = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
const hashes = {};
for (const file of ['dist/core.js', 'dist/app.js', 'evaluations/corpus.cjs', 'evaluations/reference.cjs', 'scripts/evaluate-corpus.cjs']) hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

// Semantic tags keep the report readable while failing on unclassified messages.
const blockerTags = [
  ['stock-insufficient', /Insufficient stock:/], ['expired', /Quote expired/],
  ['lead-required', /Lead time is required/], ['lead-exceeded', /Lead time exceeds/],
  ['currency', /Offer currency does not match/], ['duplicate-exact', /^Exact duplicate/],
  ['duplicate-conflicting', /^Conflicting duplicate/], ['invalid-price', /packPrice/],
  ['invalid-pack', /packSize/], ['invalid-validity', /validUntil/], ['invalid-delivery', /deliveryFee/]
];
const warningTags = [['stock-unknown', /^Stock was not supplied/], ['lead-unknown', /^Lead time was not supplied/], ['validity-unknown', /^Quote expiry was not supplied/]];
function tags(messages, dictionary) { return messages.map(text => dictionary.find(([, rule]) => rule.test(text))?.[0] || `UNCLASSIFIED: ${text}`).sort(); }
function expand(entry) {
  const currency = entry.currency || corpus.defaults.currency;
  return {
    schemaVersion: 2, id: `evaluation-${entry.id}`, title: `Synthetic evaluation: ${entry.id}`,
    date: entry.reviewDate || corpus.defaults.reviewDate, currency, revision: 1,
    request: entry.items.map(item => ({ ...corpus.defaults.item, ...item })),
    offers: entry.offers.map((row, index) => {
      const { expect, ...offer } = row;
      return { ...corpus.defaults.offer, quoteId: `quote-${row.id}`, currency, ...offer,
        source: { filename: `${entry.id}.synthetic.csv`, line: index + 2, raw: { synthetic: true, input: row.id } } };
    }),
    selections: clone(entry.selections), notes: {}, history: [], importErrors: []
  };
}
function actualSummary(input) {
  const analysis = QL.analyze(input), cheapest = {}, selected = {};
  for (const item of analysis.items) { cheapest[item.request.id] = item.cheapest?.offer.id || null; selected[item.request.id] = item.selected?.offer.id || null; }
  return {
    lines: analysis.items.flatMap(item => item.offers.map(row => ({ id: row.offer.id, itemId: row.offer.itemId, packs: row.packs, units: row.units, total: row.total, eligible: row.eligible, blocked: tags(row.reasons, blockerTags), warnings: tags(row.warnings, warningTags) }))),
    subtotal: analysis.total, complete: analysis.complete, cheapest, selected
  };
}
function normalise(summary) { const copy = clone(summary); for (const row of copy.lines) { row.blocked.sort(); row.warnings.sort(); } return copy; }
function compareResult(label, expected, actual, failures) { if (!isDeepStrictEqual(expected, actual)) failures.push({ label, expected, actual }); }

// Exercise the current app's actual receipt-matching predicate, not a copied
// revision assertion. No document rendering or persistence is invoked here.
function currentApprovalLookup() {
  const app = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
  const found = app.match(/^const approved=(.+);$/m);
  if (!found) throw Error('Current app approval predicate moved; review and adapt the evaluator.');
  return Function('QL', `"use strict"; return (${found[1]});`)(QL);
}
const approvalLookup = currentApprovalLookup();
const results = corpus.cases.map(entry => {
  const input = expand(entry), failures = [], expected = normalise(reference.workspace(input, entry.offers));
  const actual = actualSummary(input);
  // Cross-check the separate reference against the corpus's handwritten ledger.
  for (const row of expected.lines) {
    const hand = entry.offers.find(offer => offer.id === row.id).expect;
    for (const field of ['packs', 'units', 'total', 'eligible']) compareResult(`hand-ledger:${row.id}:${field}`, hand[field], row[field], failures);
  }
  for (const field of ['subtotal', 'complete', 'cheapest']) compareResult(`hand-ledger:${field}`, entry.expect[field], expected[field], failures);
  compareResult('reference-versus-production', expected, actual, failures);
  const result = { id: entry.id, intent: entry.intent, input, expected, actual, failures, passed: false };
  if (entry.naiveUnitPrice) {
    const naive = reference.naiveUnitPrice(input, entry.naiveUnitPrice.itemId);
    const countercase = { itemId: entry.naiveUnitPrice.itemId, chosen: naive, wholePurchase: expected.lines.find(row => row.id === naive).total, correctChoice: expected.cheapest[entry.naiveUnitPrice.itemId], correctWholePurchase: expected.lines.find(row => row.id === expected.cheapest[entry.naiveUnitPrice.itemId]).total };
    compareResult('naive-unit-price-countercase', entry.naiveUnitPrice, countercase, failures);
    result.naiveUnitPrice = countercase;
  }
  if (entry.revisionSequence) {
    const state = clone(input), receipt = QL.createReceipt(state, '2026-10-21T12:00:00.000Z');
    state.history.push(receipt);
    result.revisions = entry.revisionSequence.map((step, index) => {
      state.revision = step.revision; state.request[0].quantity = step.quantity;
      const actualStep = { revision: state.revision, quantity: state.request[0].quantity, subtotal: QL.analyze(state).total, currentApproval: Boolean(approvalLookup(state)) };
      compareResult(`revision-step:${index + 1}:revision-${step.revision}`, step, actualStep, failures);
      const revisionOnlyApproval = Boolean(state.history.findLast(saved => saved.revision === state.revision));
      return { expected: step, actual: actualStep, contentMatchesOriginal: QL.fingerprint(state) === receipt.fingerprint, historicalReceiptTotal: receipt.total, revisionOnlyMutant: { actualApproval: revisionOnlyApproval, disagreesWithExpected: revisionOnlyApproval !== step.currentApproval } };
    });
    compareResult('receipt-original-quantity-unchanged', 23, receipt.snapshot.request[0].quantity, failures);
    compareResult('same-revision-changed-content-different-fingerprint', false, result.revisions[1].contentMatchesOriginal, failures);
    compareResult('reverted-content-same-fingerprint', true, result.revisions.at(-1).contentMatchesOriginal, failures);
    const counterexamples = result.revisions.filter(step => step.revisionOnlyMutant.disagreesWithExpected);
    result.revisionMutationControl = { name: 'revision-only-approval-lookup', expectedRejected: true, rejected: counterexamples.length > 0, counterexamples: counterexamples.map(step => ({ revision: step.actual.revision, quantity: step.actual.quantity, expectedApproval: step.expected.currentApproval, mutantApproval: step.revisionOnlyMutant.actualApproval })) };
    compareResult('revision-only-mutant-rejected', true, result.revisionMutationControl.rejected, failures);
  }
  result.passed = failures.length === 0;
  return result;
});
let commit = 'unavailable';
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(); } catch {}
const report = {
  format: 'QuoteLensSyntheticEngineeringEvaluation', version: 1,
  generatedAt: new Date().toISOString(), command: 'node scripts/evaluate-corpus.cjs --write',
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  provenance: { baseCommitAtRun: commit, sha256: hashes },
  method: {
    arithmetic: 'Separate pack-count enumeration and repeated rational addition; imports no production module.',
    contract: 'Eligibility and warning expectations are hand-annotated from documented rules, not independently discovered user facts.',
    crossCheck: 'Fixed handwritten packs/units/totals/subtotals/choices check the reference as well as production.',
    revision: 'Invokes the actual current app approval-lookup predicate with synthetic states, including same-revision changed content; a revision-only mutant must be rejected. No browser/storage/DOM is exercised.',
    authorship: 'AI-assisted engineering evaluation; separate implementation does not mean independent human validation.'
  },
  summary: { cases: results.length, offers: results.reduce((sum, result) => sum + result.input.offers.length, 0), passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length },
  limits: [
    'Fixed synthetic corpus, not random coverage, exhaustive input validation or a procurement acceptance benchmark.',
    'Reference intentionally supports only these small pack counts and bounded two-decimal terms; production boundary rejection is annotated, not reimplemented.',
    'Does not exercise browser rendering, CSV parsing, IndexedDB, concurrent tabs, real suppliers, taxes, FX, shared freight, accessibility or user acceptance.',
    'No time saving, customer saving, demand, adoption, production readiness or unaided personal coding ability is established.',
    'Revision lookup is application logic evidence, not a fresh browser acceptance run. Existing browser evidence remains separate.'
  ], results
};
function markdown() {
  const rows = results.map(result => `| ${result.id} | ${result.input.currency} ${result.expected.subtotal} / ${result.actual.subtotal} | ${result.expected.complete} / ${result.actual.complete} | ${result.passed ? 'Match' : 'FAIL — inspect JSON'} |`).join('\n');
  return `# Synthetic engineering evaluation\n\nObserved ${report.generatedAt}. Command: \`${report.command}\`. Environment: Node ${report.environment.node}, ${report.environment.platform}/${report.environment.arch}. Base commit at run: \`${commit}\`; the JSON records exact input/script/core hashes, including uncommitted evaluation files at this run.\n\n${report.summary.passed}/${report.summary.cases} fixed cases matched; ${report.summary.offers} offers were inspected. These are corpus counts, not a quality score or business-impact metric.\n\n## Method\n\nA separate [reference calculator](../../evaluations/reference.cjs) enumerates pack counts, then adds each pack price as an exact decimal rational. It imports no production code and uses a different arithmetic path from the production ceiling division and minor-unit totals. A fixed handwritten ledger in the [corpus](../../evaluations/corpus.cjs) checks its packs, units, totals and choices. Eligibility and warning annotations come from the documented domain contract; they are not an independently proven full validation implementation. All evaluation code was AI-assisted.\n\nThe [machine-readable report](engineering-evaluation.json) contains expanded synthetic inputs, every expected/actual offer result, warning/blocker tags, environment and source hashes. Any mismatch produces a nonzero exit code. Run without \`--write\` for verification without replacing these records.\n\n| Case | Expected / actual selected subtotal | Expected / actual complete | Outcome |\n| --- | --- | --- | --- |\n${rows}\n\n## Countercase to nominal unit price\n\nFor 51 fictional screws, 100-unit packs at 9.00 have a lower nominal unit price (0.09) than 10-unit packs at 1.30 (0.13). The first purchase nevertheless costs **10.00** including its 1.00 line fee; six small packs plus a 0.20 fee cost **8.00**. The naive ranking chooses the wrong line for this stated cost contract. The 2.00 difference is arithmetic on synthetic inputs, not customer savings.\n\n## Same total, different reviewed input\n\nThe pad case buys three 10-unit packs at 5.75 plus 1.25 delivery: **18.50** for either 23 or 24 requested units. The evaluator invokes the current app's actual approval-lookup predicate. The original receipt approves revision 1 / quantity 23. A defensive control changes quantity to 24 **while retaining revision 1**; current approval must become false even though the subtotal and revision number match. This simulates an incorrectly versioned or stale state: ordinary app edits increment the revision. A deliberately broken revision-only lookup accepts this control, so the evaluator records and rejects that mutant.\n\nRevision 2 with quantity 24 also needs review. Revision 3 after reverting to 23 remains unapproved even though the canonical content string matches revision 1. The original receipt snapshot remains at quantity 23. The four explicit expected/actual steps and the mutant counterexample are in the JSON report. This checks local revision/content identity; the fingerprint is not a cryptographic hash or authenticated signature.\n\n## Limits\n\n${report.limits.map(line => `- ${line}`).join('\n')}\n`;
}
if (process.argv.includes('--write')) {
  const target = path.join(root, 'docs/evidence'); fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'engineering-evaluation.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(target, 'ENGINEERING-EVALUATION.md'), markdown());
}
for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.id}: expected ${result.input.currency} ${result.expected.subtotal}, actual ${result.actual.subtotal}; complete ${result.actual.complete}`);
console.log(`${report.summary.passed}/${report.summary.cases} synthetic cases matched (${report.summary.offers} offer rows).`);
if (report.summary.failed) { console.error(JSON.stringify(results.filter(result => !result.passed).map(({ id, failures }) => ({ id, failures })), null, 2)); process.exitCode = 1; }
