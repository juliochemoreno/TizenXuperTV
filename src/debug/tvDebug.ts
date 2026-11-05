// TV diagnostics. tizen-bridge.js forwards console output to the development Mac.
// Detailed key/click logs only when localStorage xuper_debug = '1'; by default only a light
// performance summary (key -> next frame latency and long tasks), aggregated to keep it cheap.
function describe(el: Element | null): string {
  if (!el) return 'none';
  const cls = String((el as HTMLElement).className || '').split(' ').filter(Boolean).slice(0, 3).join('.');
  return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
}

function installPerfMonitor(): void {
  const samples: number[] = [];
  let longTasks = 0;
  let longest = 0;
  try {
    const po = new PerformanceObserver(list => {
      list.getEntries().forEach(e => {
        longTasks++;
        longest = Math.max(longest, e.duration);
      });
    });
    po.observe({ entryTypes: ['longtask'] });
  } catch (e) {}

  document.addEventListener('keydown', () => {
    const t0 = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      samples.push(performance.now() - t0);
      if (samples.length >= 20) {
        const sorted = samples.splice(0, samples.length).sort((a, b) => a - b);
        const pick = (q: number) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
        console.log('[perf] keys=20 p50=' + pick(0.5) + 'ms p90=' + pick(0.9) + 'ms max=' + pick(1) + 'ms longtasks=' + longTasks + ' longest=' + Math.round(longest) + 'ms');
        longTasks = 0;
        longest = 0;
      }
    }));
  }, true);
}

export function installTvDebug(): void {
  const platform = (window as any).XuperPlatform;
  if (!platform || !platform.isTizen) return;

  console.log('[dbg] app start v' + __APP_VERSION__, navigator.userAgent);
  installPerfMonitor();

  let verbose = false;
  try { verbose = localStorage.getItem('xuper_debug') === '1'; } catch (e) {}
  if (!verbose) return;

  document.addEventListener('keydown', e => {
    console.log('[dbg key]', e.keyCode, e.key, e.repeat ? 'repeat' : '', 'active=' + describe(document.activeElement));
  }, true);
  document.addEventListener('click', e => {
    const m = e as MouseEvent;
    console.log('[dbg click]', describe(e.target as Element), 'trusted=' + e.isTrusted, 'x=' + m.clientX, 'y=' + m.clientY);
  }, true);
}
