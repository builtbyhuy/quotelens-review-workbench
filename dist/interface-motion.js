// Visual feedback is independent of calculation, persistence and focus handling.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let keyboard = false, pendingView = null, emphasizeDecision = false;
document.addEventListener('keydown', () => { keyboard = true; }, { capture: true });
document.addEventListener('pointerdown', () => { keyboard = false; }, { capture: true, passive: true });
const reveal = (node, distance = 8, duration = 220) => {
  if (!node || reduced.matches || keyboard || !node.animate) return;
  node.animate([{ opacity: .35, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'none' }], { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
};
document.addEventListener('click', event => {
  const tab = event.target.closest('[data-action="view"]');
  if (tab && !tab.classList.contains('active')) pendingView = tab.dataset.view;
  if (event.target.closest('[data-action="lowest"]')) emphasizeDecision = true;
}, true);
const app = document.getElementById('app');
const seen = new WeakSet();
const observed = new Set();
const observer = new IntersectionObserver(entries => entries.forEach(({ target, isIntersecting }) => {
  if (isIntersecting) { reveal(target, 12, 360); observer.unobserve(target); observed.delete(target); }
}), { threshold: .25 });
function discover() {
  observed.forEach(node => { if (!node.isConnected) { observer.unobserve(node); observed.delete(node); } });
  if (pendingView) {
    reveal(app.querySelector('.workspace-view'));
    pendingView = null;
  }
  if (emphasizeDecision) {
    reveal(app.querySelector('.decision-summary .amount'), 5, 300);
    emphasizeDecision = false;
  }
  app.querySelectorAll('.workflow-panel').forEach(node => {
    if (!seen.has(node)) { seen.add(node); observed.add(node); observer.observe(node); }
  });
}
if (app) { new MutationObserver(discover).observe(app, { childList: true }); discover(); }
const dialog = document.getElementById('dialog');
if (dialog) new MutationObserver(() => { if (dialog.open) reveal(dialog, 6, 200); }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
reduced.addEventListener('change', () => { if (reduced.matches) document.getAnimations().forEach(animation => animation.cancel()); });
addEventListener('pagehide', () => { observer.disconnect(); observed.clear(); });
addEventListener('pageshow', () => { app?.querySelectorAll('.workflow-panel').forEach(node => { observed.add(node); observer.observe(node); }); });
