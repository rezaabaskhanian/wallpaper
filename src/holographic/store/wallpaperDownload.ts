import {CATALOG_URL} from './config';

// CATALOG_URL is `${API_BASE_URL}/catalog`; strip the last segment to get the
// base, rather than exporting yet another constant for one templated route.
const API_BASE_URL = CATALOG_URL.replace(/\/catalog$/, '');

/**
 * Tells the backend a wallpaper was actually applied (not just previewed),
 * so the admin panel can spot ones nobody downloads and prune them — see
 * Wallpapers.tsx's download-count column. Best-effort: failures are swallowed
 * since this is just analytics, never something that should block applying
 * the wallpaper itself.
 */
export function trackWallpaperDownload(id: string): void {
  fetch(`${API_BASE_URL}/wallpapers/${encodeURIComponent(id)}/download`, {
    method: 'POST',
  }).catch(() => {});
}
