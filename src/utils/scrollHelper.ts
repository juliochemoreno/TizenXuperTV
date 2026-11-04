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
  const behavior: ScrollBehavior = isRapidNav ? 'auto' : 'smooth';

  // Returning to first item: always reset cleanly to start
  if (index === 0) {
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ left: 0, behavior });
    } else {
      container.scrollLeft = 0;
    }
    return;
  }

  const cRect = container.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();

  // If card is cut off on the left or encroaching on the left margin
  if (tRect.left < cRect.left + paddingLeft) {
    const delta = tRect.left - (cRect.left + paddingLeft);
    const targetScroll = Math.max(0, container.scrollLeft + delta);
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ left: targetScroll, behavior });
    } else {
      container.scrollLeft = targetScroll;
    }
  } else if (tRect.right > cRect.right - paddingRight) {
    // If card is cut off on the right or encroaching on the right margin
    const delta = tRect.right - (cRect.right - paddingRight);
    const targetScroll = container.scrollLeft + delta;
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ left: targetScroll, behavior });
    } else {
      container.scrollLeft = targetScroll;
    }
  }
}
