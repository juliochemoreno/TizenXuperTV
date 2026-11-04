/**
 * Apple TV Style Image Texture Prefetcher
 * Pre-decodes upcoming offscreen images in memory so that when
 * the user navigates horizontally or changes slides, there is zero image flash.
 */
const prefetchedUrls = new Set<string>();

export function prefetchImages(urls: (string | undefined)[], limit = 4) {
  if (typeof window === 'undefined') return;

  const validUrls = urls.filter((u): u is string => Boolean(u && !prefetchedUrls.has(u))).slice(0, limit);

  for (const url of validUrls) {
    prefetchedUrls.add(url);
    const img = new Image();
    img.src = url;
    if (typeof (img as any).decode === 'function') {
      (img as any).decode().catch(() => {});
    }
  }
}
