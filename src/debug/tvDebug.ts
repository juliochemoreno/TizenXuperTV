// TEMPORARY diagnostics for the Samsung TV. tizen-bridge.js forwards console output to the
// development Mac, so these lines show which key, click or element triggers an action.
function describe(el: Element | null): string {
  if (!el) return 'none';
  const cls = String((el as HTMLElement).className || '').split(' ').filter(Boolean).slice(0, 3).join('.');
  return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
}

export function installTvDebug(): void {
  const platform = (window as any).XuperPlatform;
  if (!platform || !platform.isTizen) return;

  console.log('[dbg] app start v' + __APP_VERSION__, navigator.userAgent);
  try {
    const favs = JSON.parse(localStorage.getItem('xuper_live_favs_v1') || '{}');
    const keys = Object.keys(favs).filter(k => favs[k]);
    console.log('[dbg favs] stored live favorites:', keys.length, keys.slice(0, 15).join(','));
  } catch (e) {}

  document.addEventListener('keydown', e => {
    console.log('[dbg key]', e.keyCode, e.key, e.repeat ? 'repeat' : '', 'active=' + describe(document.activeElement));
  }, true);

  document.addEventListener('click', e => {
    const m = e as MouseEvent;
    console.log('[dbg click]', describe(e.target as Element), 'trusted=' + e.isTrusted, 'x=' + m.clientX, 'y=' + m.clientY);
  }, true);
}
