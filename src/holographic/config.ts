/**
 * Central configuration for the holographic wallpaper.
 *
 * Everything visual/tweakable lives here so the rest of the code stays clean.
 */

/** One orbit ring: its radius, how many avatars, their size, and spin. */
export type RingConfig = {
  /** Radius as a fraction of the screen's smaller side. */
  radiusFactor: number;
  /** How many avatars sit on this ring. */
  itemCount: number;
  /** Avatar size as a fraction of the screen's smaller side. */
  sizeFactor: number;
  /** Relative spin speed (1 = base). Higher = faster. */
  speedFactor: number;
  /** Spin direction: +1 or -1. */
  direction: 1 | -1;
};

/**
 * The rings, innermost → outermost. `ringCount` in settings decides how many
 * of these are actually shown, so keep them ordered from inner to outer.
 */
export const RINGS: RingConfig[] = [
  {radiusFactor: 0.20, itemCount: 5, sizeFactor: 0.085, speedFactor: 1.5, direction: 1},
  {radiusFactor: 0.32, itemCount: 8, sizeFactor: 0.10, speedFactor: 1.0, direction: -1},
  {radiusFactor: 0.44, itemCount: 11, sizeFactor: 0.11, speedFactor: 0.72, direction: 1},
  {radiusFactor: 0.56, itemCount: 14, sizeFactor: 0.10, speedFactor: 0.5, direction: -1},
];

/** Full turn of the base orbit takes this many seconds (before speed setting). */
export const BASE_TURN_SECONDS = 70;

/**
 * Hard ceiling on how many orbiting avatars ever appear at once. The actual
 * count is `min(MAX_ORBS, items in the active orbit theme)` — never
 * user-adjustable, so the screen never gets more crowded than this no matter
 * how many items a theme ends up with.
 */
export const MAX_ORBS = 24;

/**
 * One selectable full-screen background.
 * `source` omitted → the pure topographic Skia background (no photo).
 */
export type BackgroundOption = {
  id: string;
  /** Label shown in the settings selector. */
  label: string;
  /** Bundled image source; leave out for the topographic-only option. */
  source?: number;
  /** How the photo fills the screen: 'cover' (default) crops to fill the
   * screen edge-to-edge — fine for tall photos already close to a phone's
   * aspect ratio. 'contain' shows the whole photo letterboxed instead —
   * use it for square/graphic images (like a country map) where 'cover'
   * would crop off most of the width. */
  fit?: 'cover' | 'contain';
  /** Letterbox fill colour behind a 'contain' photo, so the padding blends
   * with the image instead of showing bare black. */
  letterboxColor?: string;
};

/**
 * The backgrounds the user can pick between in settings.
 *
 * To add your own photo: drop it in `src/holographic/assets/` and add an entry
 * with `source: require('./assets/your-photo.jpg')`.
 */
export const BACKGROUNDS: BackgroundOption[] = [
  // 'main' pulled out for now — a new photo is coming to replace main.png;
  // re-add as {id: 'main', label: 'اصلی', source: require('./assets/main.png')}
  // once it's dropped in.
  {
    id: 'iran_gol',
    label: 'نقشه گل ایران',
    source: require('./assets/iran_gol.jpeg'),
    // Square graphic — 'cover' would crop off most of its width on a tall
    // phone screen and make the map look stretched/cut off.
    fit: 'contain',
    letterboxColor: '#efe3d3',
  },
  // {id: 'hero', label: 'پرتره', source: require('./assets/hero.jpg')},
  // {id: 'black', label: 'مشکی'},
  // {id: 'topographic', label: 'توپوگرافی'},
];

/** Which background is selected by default. */
export const DEFAULT_BACKGROUND_ID = 'iran_gol';

/**
 * Countdown widget defaults. This is a GENERIC countdown to a configurable
 * target date — set whatever target/label you want in the settings panel.
 */
export const COUNTDOWN = {
  /** ISO date-time the countdown targets. Fully user-configurable. */
  targetISO: '2040-01-01T00:00:00',
  /** Short label shown above the countdown. */
  label: 'شمارش معکوس',
};
