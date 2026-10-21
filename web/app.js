'use strict';
let review = null;
let busy = false;
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const amount = value => Number(value).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
const notice = (text, error = false) => { $('notice').textContent = text; $('notice').className = error ? 'error' : ''; };

async function request(path, data) {
  const response = await fetch(path, data === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The local workspace could not complete this action.');
  return result;
}
async function act(path, data, message, focus) {
  if (busy) return;
  busy = true;
  $('approve').disabled = true;
  try {
    review = await request(path, data);
    render();
    notice(message);
    if (focus) document.querySelector(focus)?.focus();
  } catch (error) {
    notice(error.message, true);
    if (/review changed/i.test(error.message)) { review = await request('/api/review'); render(); }
  } finally {
    busy = false;
    if (review) $('approve').disabled = !review.summary.ready || !!review.approval;
  }
}
function render() {
  if (!review) { $('items').innerHTML = '<p class="empty">Import a supplier CSV to begin a review.</p>'; return; }
  const summary = review.summary;
  const invalid = review.rows.filter(row => row.issues.length);
  $('source-meta').textContent = `${review.filename} · ${review.rows.length} offers · Revision ${review.revision} · Source ${review.source_hash.slice(0,10)}`;
  $('review-status').textContent = review.approval ? 'Approved' : summary.ready ? 'Ready for review' : 'Review required';
  $('review-status').className = 'badge' + (summary.ready ? ' good' : '');
  $('items').innerHTML = review.items.map(item => `<article class="item"><div class="item-top"><h3>${escape(item.name)}<span class="sku">${escape(item.sku)}</span></h3><span class="demand">${item.quantity} units requested</span></div><div class="offers">${review.rows.filter(row => row.sku === item.sku).map(row => {
    const selected = review.selection[item.sku] === row.id;
    return `<div class="offer-wrap"><button class="offer ${selected ? 'selected' : ''} ${row.issues.length ? 'invalid' : ''}" data-select="${escape(row.id)}" data-sku="${escape(item.sku)}" aria-pressed="${selected}" aria-label="Select ${escape(row.supplier)} for ${escape(item.name)}, ${row.cost === null ? 'price unavailable' : escape(row.currency + ' ' + row.cost)}" ${row.issues.length ? 'disabled' : ''}><div class="offer-supplier">${escape(row.supplier)}</div>${selected ? '<span class="offer-state" aria-hidden="true">●</span>' : ''}<div class="offer-price">${row.cost === null ? '—' : amount(row.cost)} <small>${escape(row.currency)}</small></div><div class="offer-meta">${row.packs_needed ?? '—'} packs · ${row.units_purchased ?? '—'} units · ${row.lead_days ?? '—'} days</div>${row.issues.length ? '<span class="invalid-label">Source needs correction</span>' : ''}</button><button class="source-button" data-source="${escape(row.id)}">Source line ${row.source_line}</button></div>`;
  }).join('')}</div></article>`).join('');
  $('selection-summary').innerHTML = `<div class="total-label">Selected purchase cost</div><div class="total">${summary.total === null ? '—' : amount(summary.total)} <small>${escape(summary.currency || '')}</small></div><p class="summary-meta">${summary.complete} of ${review.items.length} items covered${summary.ready ? ' · Ready for approval' : ' · Incomplete selection'}</p>${summary.selected.map(row => `<div class="decision-line"><span>${escape(row.name)}</span><span>${amount(row.cost)}</span></div>`).join('')}${summary.errors.length ? `<div class="blockers"><strong>Approval is blocked</strong><ul>${summary.errors.map(error => `<li>${escape(error)}</li>`).join('')}</ul></div>` : ''}${review.approval ? `<div class="receipt"><strong>${escape(review.approval.id)}</strong>Selection approved. This receipt is tied to source ${review.source_hash.slice(0,10)} and revision ${review.revision}.</div>` : ''}`;
  $('approve').textContent = review.approval ? 'Selection approved' : 'Approve selection';
  $('approve').disabled = busy || !summary.ready || !!review.approval;
  $('exports').innerHTML = review.approval ? '<div class="export-links"><a href="/api/export" download>Export decision CSV</a><a href="/api/receipt" download>Approval receipt</a></div>' : '';
  $('issue-count').textContent = invalid.length ? `${invalid.length} offers excluded` : 'All source rows valid';
  $('issues').innerHTML = invalid.length ? invalid.map(row => `<div class="issue"><span class="issue-icon" aria-hidden="true">!</span><div class="issue-text"><strong>${escape(row.supplier)} · ${escape(row.sku)}</strong><p>${row.issues.map(escape).join(' ')}</p></div><button class="source-button" data-source="${escape(row.id)}">Inspect line ${row.source_line}</button></div>`).join('') : '<div class="empty">No source issues. Check the selected offers before approving.</div>';
  $('audit').innerHTML = `<div class="history-table"><table><caption class="visually-hidden">Recorded review events, newest first</caption><thead><tr><th scope="col">Event</th><th scope="col">Decision evidence</th><th scope="col">Recorded at (UTC)</th></tr></thead><tbody>${review.audit.map(event => `<tr><td>${escape(event.event)}</td><td>${escape(event.detail)}</td><td>${escape(event.created.replace('T',' ').slice(0,19))}</td></tr>`).join('')}</tbody></table></div>`;
}
function showSource(id) {
  const row = review.rows.find(candidate => candidate.id === id);
  if (!row) return;
  $('source-title').textContent = `${review.filename} · line ${row.source_line}${row.source_end_line !== row.source_line ? '–' + row.source_end_line : ''}`;
  $('source-content').innerHTML = `<p>Original field values, before trimming and validation.</p><dl class="source-data">${Object.entries(row.source).map(([key,value])=>`<dt>${escape(key.replaceAll('_',' '))}</dt><dd>${escape(value)}</dd>`).join('')}</dl>${row.issues.length ? `<div class="blockers">${row.issues.map(escape).join('<br>')}</div>` : ''}<p class="source-foot">Source SHA-256: ${review.source_hash}<br>Required units: ${review.items.find(item=>item.sku === row.sku)?.quantity ?? 'Not in request'} · Whole packs: ${row.packs_needed ?? 'Unavailable'} · Extended cost: ${escape(row.currency)} ${row.cost === null ? 'Unavailable' : amount(row.cost)}</p>`;
  $('source-dialog').showModal();
}
document.addEventListener('click', event => {
  const source = event.target.closest('[data-source]');
  if (source) return showSource(source.dataset.source);
  const offer = event.target.closest('[data-select]');
  if (offer && !offer.disabled) act('/api/select', {review_id:review.id,revision:review.revision,sku:offer.dataset.sku,row_id:offer.dataset.select}, 'Selection updated. Any earlier approval no longer applies.', `[data-select="${offer.dataset.select}"]`);
});
$('demo-clean').addEventListener('click', ()=>act('/api/demo',{scenario:'clean'},'Clean sample loaded. Compare the offers, then approve your selection.'));
$('demo-conflict').addEventListener('click', ()=>act('/api/demo',{scenario:'conflict'},'Conflicting sample loaded. Inspect the source issues, then import a corrected CSV.'));
$('approve').addEventListener('click', ()=>act('/api/approve',{review_id:review.id,revision:review.revision},'Selection approved. Download the decision and its source-bound receipt.', '#exports a'));
$('refresh').addEventListener('click', async ()=>{try {review = await request('/api/review');render();notice('Workspace refreshed.');}catch(error){notice(error.message,true);}});
$('csv-upload').addEventListener('change',async event=>{
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1_000_000) {notice('Choose a CSV smaller than 1 MB.',true);event.target.value='';return;}
  await act('/api/import',{csv:await file.text(),filename:file.name},`${file.name} imported. Previous approvals do not carry over to a replacement source.`);
  event.target.value='';
});
$('close-source').addEventListener('click',()=>$('source-dialog').close());
$('audit-nav').addEventListener('click',()=>{$('history').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('history').focus({preventScroll:true});});
request('/api/review').then(value=>{review=value;render();}).catch(error=>{notice('The local workspace is unavailable. Start the Python server and refresh this page. '+error.message,true);$('source-meta').textContent='Connection unavailable';$('review-status').textContent='Offline';});
