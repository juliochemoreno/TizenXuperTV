/**
 * Fast eased scrolling for the TV. The browser's smooth scroll lasts ~300-500 ms and cannot be tuned;
 * this one takes 180 ms (100 ms while keys repeat) and a new key press continues from where the
 * current animation is, so focus never waits for the scroll.
 */
const running = new WeakMap<HTMLElement, number>();

export function animateScroll(el: HTMLElement, axis: 'left' | 'top', to: number, duration = 180): void {
  const prop = axis === 'left' ? 'scrollLeft' : 'scrollTop';
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  const from = el[prop];
  const delta = to - from;
  if (Math.abs(delta) < 1) return;
  const start = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el[prop] = from + delta * eased;
    if (p < 1) running.set(el, requestAnimationFrame(step));
    else running.delete(el);
  };
  running.set(el, requestAnimationFrame(step));
}

/**
 * Smooth TV Horizontal Slider Scroll (Apple TV / tvOS style)
 *
 * Keeps the focus cursor in the natural view comfort zone without
 * unnecessarily shifting the container when items are already fully visible.
 * Only scrolls when approaching the viewport margins.
 * Dynamically switches to instant scroll ('auto') during rapid navigation to prevent
 * animation queue lag on Smart TV ARM chipsets.
 */
let lastScrollTime = 0;

export function scrollHorizontalSlider(
  container: HTMLElement | null,
  target: HTMLElement | null,
  index: number,
  paddingLeft = 48,
  paddingRight = 160
) {
  if (!container || !target) return;

  const now = performance.now();
  const isRapidNav = (now - lastScrollTime) < 160;
  lastScrollTime = now;
  const duration = isRapidNav ? 100 : 180;

  // Returning to first item: always reset cleanly to start
  if (index === 0) {
    animateScroll(container, 'left', 0, duration);
    return;
  }

  const cRect = container.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();

  // If card is cut off on the left or encroaching on the left margin
  if (tRect.left < cRect.left + paddingLeft) {
    const delta = tRect.left - (cRect.left + paddingLeft);
    const targetScroll = Math.max(0, container.scrollLeft + delta);
    animateScroll(container, 'left', targetScroll, duration);
  } else if (tRect.right > cRect.right - paddingRight) {
    // If card is cut off on the right or encroaching on the right margin
    const delta = tRect.right - (cRect.right - paddingRight);
    const targetScroll = container.scrollLeft + delta;
    animateScroll(container, 'left', targetScroll, duration);
  }
}
