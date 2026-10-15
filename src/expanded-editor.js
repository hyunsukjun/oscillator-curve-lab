// Presentation only. Existing canvas observers retain drawing/input coordinates.
const curve = document.querySelector('#curveCanvas');
const footer = document.querySelector('.playbackDock') || document.querySelector('.playbackBar');
let queued = false;
function fitAvailableHeight() {
  queued = false;
  if (!curve || !footer) return;
  const height = curve.getBoundingClientRect().height;
  const footerBottom = footer.getBoundingClientRect().bottom + window.scrollY;
  // The minimum keeps editing usable when controls exceed the viewport.
  const target = Math.max(220, Math.floor(height + window.innerHeight - footerBottom));
  if (Math.abs(target - height) > 1) curve.style.setProperty('--available-curve-height', `${target}px`);
}
function scheduleFit() {
  if (!queued) { queued = true; requestAnimationFrame(fitAvailableHeight); }
}
window.addEventListener('resize', scheduleFit);
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(scheduleFit);
  [document.querySelector('.app'), document.querySelector('.editor'), footer].forEach(el => el && observer.observe(el));
}
scheduleFit();
