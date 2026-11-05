/** Splash screen defined in index.html (shown before any script runs) */
export function setSplashStatus(text: string): void {
  const el = document.querySelector('#xuper-splash .xs-status');
  if (el) el.textContent = text;
}

export function hideSplash(): void {
  const el = document.getElementById('xuper-splash');
  if (!el || el.classList.contains('is-hiding')) return;
  el.classList.add('is-hiding');
  setTimeout(() => el.remove(), 400);
}
