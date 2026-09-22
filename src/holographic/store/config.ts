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
export const ORBIT_CATALOG_URL = `${API_BASE_URL}/orbit-catalog`;
export const MARTYRS_URL = `${API_BASE_URL}/martyrs`;
export const MARTYR_CATEGORIES_URL = `${API_BASE_URL}/martyr-categories`;
export const QUOTES_URL = `${API_BASE_URL}/quotes`;
export const QUOTE_CATEGORIES_URL = `${API_BASE_URL}/quote-categories`;
export const DAILY_QUOTE_URL = `${API_BASE_URL}/daily-quote`;
export const HERO_URL = `${API_BASE_URL}/hero`;
export const PROMO_REDEEM_URL = `${API_BASE_URL}/promo-codes/redeem`;
export const AI_GENERATE_URL = `${API_BASE_URL}/ai/generate`;
export const AI_CREDITS_REDEEM_URL = `${API_BASE_URL}/ai/credits/redeem`;

/**
 * The single non-consumable in-app product (defined in the Cafe Bazaar panel)
 * that unlocks every premium wallpaper — current and future.
 */
export const PREMIUM_SKU = 'premium_unlock';

/**
 * Consumable in-app product (defined in the Cafe Bazaar panel) that grants a
 * fixed number of AI wallpaper-generation credits — see backend's
 * aigenerateservice.skuCredits for the exact amount (currently 30). Unlike
 * PREMIUM_SKU, this one must be consumed (Poolakey's consumePurchase) after
 * the backend confirms the credit grant, so it can be bought again.
 */
export const AI_CREDITS_SKU = 'ai_credits';

/**
 * The RSA public key from the Cafe Bazaar developer panel (In-App Billing tab),
 * passed to Poolakey's `useBazaar` hook for on-device purchase validation.
 */
export const BAZAAR_RSA_PUBLIC_KEY =
  'MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwCN9iof6MW0lGtj4oHBSfDbURiwn0VvutrHnvb+1leFZ2HNgJmVwXogC3vpCE/QtPhuE8H2Ddvviv4XP/reyutDls8KvArih/bkGQKXLyUloKZ4OhirNtj3NpCzK6TRXfNC8U8ZiGvy94yODRDSYQDCgzW2RjRtFCnoHSKtxiSuuG4lQdjxW+TvHkGT1uUczdBx9diY1aQr+zoZpUNdbzcGIZNUvP1bpUWeYSDFGL8CAwEAAQ==';
