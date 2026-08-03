/**
 * Wallpaper-store configuration.
 *
 * Point CATALOG_URL at your Go backend's catalog endpoint. During development
 * you can host a static JSON file anywhere reachable from the device/emulator
 * (on the Android emulator, `10.0.2.2` maps to your Mac's localhost).
 */
// Local dev: the Go backend running on the Mac; 10.0.2.2 = host localhost from
// the Android emulator. Swap for your real server URL in production.
export const CATALOG_URL = 'http://10.0.2.2:8090/api/v1/catalog';

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
