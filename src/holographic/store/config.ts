/**
 * Wallpaper-store configuration.
 *
 * Point CATALOG_URL at your Go backend's catalog endpoint.
 */
// Production API (api.wallpaperapp.ir). For local dev against a Go backend
// running on your Mac, swap this to 'http://10.0.2.2:8090/api/v1' (Android
// emulator) — 10.0.2.2 maps to the host machine's localhost.
const API_BASE_URL = 'https://api.wallpaperapp.ir/api/v1';

export const CATALOG_URL = `${API_BASE_URL}/catalog`;
export const MARTYRS_URL = `${API_BASE_URL}/martyrs`;
export const MARTYR_CATEGORIES_URL = `${API_BASE_URL}/martyr-categories`;
export const QUOTES_URL = `${API_BASE_URL}/quotes`;
export const HERO_URL = `${API_BASE_URL}/hero`;
export const PROMO_REDEEM_URL = `${API_BASE_URL}/promo-codes/redeem`;

/**
 * The single non-consumable in-app product (defined in the Cafe Bazaar panel)
 * that unlocks every premium wallpaper — current and future.
 */
export const PREMIUM_SKU = 'premium_unlock';

/**
 * The RSA public key from the Cafe Bazaar developer panel, used by Poolakey for
 * on-device purchase validation. Leave empty to disable local validation while
 * wiring things up; fill it in before shipping.
 */
export const BAZAAR_RSA_PUBLIC_KEY = '';
