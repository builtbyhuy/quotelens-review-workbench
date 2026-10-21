// Presentation only. Calculation, local persistence and focus remain app.js responsibilities.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const app = document.getElementById('app');
const dialog = document.getElementById('dialog');
let manualOff = false, keyboard = false, pendingView = null, emphasizeDecision = false;
const running = new Set();
const enabled = () => !manualOff && !reduced.matches;
const stop = () => { running.forEach(animation => animation.cancel()); running.clear(); };
function syncControls() {
  const mode = enabled() ? 'on' : 'off';
  if (document.documentElement.dataset.motion !== mode) document.documentElement.dataset.motion = mode;
  document.querySelectorAll('[data-motion-toggle]').forEach(button => {
    const label = reduced.matches ? 'Reduced motion' : manualOff ? 'Motion off' : 'Motion on';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-pressed', String(enabled()));
    button.disabled = reduced.matches;
  });
}
function animate(node, frames, duration = 300) {
  if (!node || !enabled() || keyboard || !node.animate) return;
  const animation = node.animate(frames, { duration, easing: 'cubic-bezier(.18,.75,.2,1)' });
  running.add(animation);
  animation.finished.catch(() => {}).finally(() => running.delete(animation));
}
function reveal(node, distance = 8, duration = 260) {
  animate(node, [{ opacity: .45, translate: `0 ${distance}px` }, { opacity: 1, translate: '0 0' }], duration);
}
let lastStage = null, lastResult = null;
function discover() {
  syncControls();
  const stage = app?.querySelector('.paper-stage');
  if (stage && stage !== lastStage) {
    stage.classList.add('is-spread');
    if (enabled() && !keyboard) stage.querySelectorAll('.quote-paper').forEach((paper, i) => reveal(paper, 18 + i * 5, 480 + i * 90));
    lastStage = stage;
  } else if (!stage) lastStage = null;
  const result = app?.querySelector('#quick-comparison .comparison-answer');
  if (result && result !== lastResult) { reveal(result, 5, 240); lastResult = result; }
  else if (!result) lastResult = null;
  if (pendingView) { reveal(app?.querySelector('.workspace-view')); pendingView = null; }
  if (emphasizeDecision) { reveal(app?.querySelector('.decision-summary .amount'), 5, 300); emphasizeDecision = false; }
}
document.addEventListener('keydown', () => { keyboard = true; }, { capture: true });
document.addEventListener('pointerdown', () => { keyboard = false; }, { capture: true, passive: true });
document.addEventListener('click', event => {
  const control = event.target.closest('[data-motion-toggle]');
  if (control) { manualOff = !manualOff; if (!enabled()) stop(); syncControls(); return; }
  const tab = event.target.closest('[data-action="view"]');
  if (tab && !tab.classList.contains('active')) pendingView = tab.dataset.view;
  if (event.target.closest('[data-action="lowest"]')) emphasizeDecision = true;
}, true);
const appObserver = app ? new MutationObserver(discover) : null;
appObserver?.observe(app, { childList: true, subtree: true });
const dialogObserver = dialog ? new MutationObserver(() => { if (dialog.open) reveal(dialog, 6, 200); }) : null;
dialogObserver?.observe(dialog, { attributes: true, attributeFilter: ['open'] });
reduced.addEventListener('change', () => { if (reduced.matches) stop(); syncControls(); });
addEventListener('pagehide', () => { stop(); appObserver?.disconnect(); dialogObserver?.disconnect(); });
addEventListener('pageshow', () => { appObserver?.observe(app, { childList: true, subtree: true }); dialogObserver?.observe(dialog, { attributes: true, attributeFilter: ['open'] }); discover(); });
discover();
