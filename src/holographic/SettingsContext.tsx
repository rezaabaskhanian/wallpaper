import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BACKGROUNDS, COUNTDOWN, DEFAULT_BACKGROUND_ID, RINGS} from './config';
import {DEFAULT_EN_FONT_ID, DEFAULT_FA_FONT_ID, getFont} from './fonts';
import {syncLiveWallpaperRipple, syncLiveWallpaperSources} from './lockWallpaper';
import {pruneOversizedImageCache} from './imageCache';
import {setAppFonts} from './setupFonts';
import {THEMES} from './themes';
import {useDynamicAccentColor, type DynamicColorSource} from './dynamicColor';

const SETTINGS_STORAGE_KEY = 'wallpaperSettings:v1';
const PRESETS_STORAGE_KEY = 'wallpaperPresets:v1';

/** A draggable widget's position offset (px) from its default anchor. */
export type LayoutOffset = {x: number; y: number};

/** Live, user-adjustable wallpaper settings, persisted to AsyncStorage. */
export type WallpaperSettings = {
  /** Auto-spin the rings. */
  autoRotate: boolean;
  /** Speed multiplier for the auto-spin (0.25 .. 3). */
  speed: number;
  /** How many rings to show (1 .. RINGS.length). */
  ringCount: number;
  /** Show the rotating orbs at all. */
  showOrbs: boolean;
  /** How many rotating orbs sit on the sphere. User-adjustable downward only —
   * the settings panel caps the upper bound at `min(MAX_ORBS, items in the
   * active orbit theme)`, see SettingsPanel's ballCount stepper. */
  ballCount: number;
  /** How orbs stay visible: 'steady' (always shown once loaded), or
   * 'flicker' — each orb independently fades in/out on its own randomized
   * animated cycle. */
  orbVisibility: 'steady' | 'flicker';
  /** Which orbit theme (see OrbitCategory in store/types) populates the
   * home-screen orbit and its central portrait; '' picks the first category
   * returned by the backend (normally "شهدا", preserving the original look). */
  orbitCategoryId: string;
  /** Axis the sphere spins around: 'x', 'y', 'z', or 'mixed' (each orb picks
   * its own axis round-robin, like electrons around an atom). */
  rotationAxis: 'x' | 'y' | 'z' | 'mixed';
  /** Selected background id (see BACKGROUNDS in config, or 'custom'). */
  backgroundId: string;
  /** "Living wallpaper": slow, continuous Ken-Burns zoom/drift on the main
   * background photo, with an extra wake-up zoom pulse whenever the app
   * returns to the foreground (see MainBackground.tsx). */
  livingWallpaper: boolean;
  /** Adds a very slow, low-amplitude tremble on top of the living-wallpaper
   * drift (see MainBackground.tsx). No effect unless livingWallpaper is on. */
  wallpaperShake: boolean;
  /** Uri of a photo the user picked from their gallery (for backgroundId 'custom'). */
  customBackgroundUri?: string;
  /** Up to 5 wallpaper-gallery photo URLs the user starred for random
   * rotation (see WallpaperGallery.tsx's star toggle). */
  randomBackgroundUris: string[];
  /** When on and randomBackgroundUris isn't empty, one of those photos is
   * picked at random into customBackgroundUri on launch and whenever the app
   * returns to the foreground (see HolographicHome.tsx). */
  randomBackgroundEnabled: boolean;
  /** Day/night colour theme: auto (by sun times), forced day/night, or off. */
  dayNightMode: 'auto' | 'day' | 'night' | 'off';
  /** Dynamic sun-glow lens flare that arcs across the sky in sync with
   * dayNightMode (see sampleSunFlare in dayNight.ts); off at night. */
  sunFlare: boolean;
  /** Floating light-particle effect: off, always on, or auto (brighter at night). */
  particleMode: 'off' | 'on' | 'auto';
  /** Particle density/brightness/speed — each step up adds more dust motes
   * and makes them drift faster (see COUNTS/SPEED_FACTOR in ParticleField.tsx). */
  particleIntensity: 'low' | 'medium' | 'high' | 'extreme';
  /** Shape of the rising light particles: small glowing dots, or small
   * hearts (a bit larger than the dots) that tilt as they sway. */
  particleShape: 'dot' | 'heart';
  /** Glow/accent colour for the orbs and particles (hex). Ignored in favour
   * of a colour sampled from the background photo when `dynamicColor` is on
   * (and sampling succeeds) — see `resolvedGlowColor` on the context. */
  glowColor: string;
  /** Derive the glow colour from the current background photo instead of the
   * manual swatch above. On by default. */
  dynamicColor: boolean;
  /** Cinematic dark-edge vignette overlay. */
  vignette: boolean;
  /** Ambient mist rolling in from an edge: off, bottom, top, or both. */
  fogMode: 'off' | 'bottom' | 'top' | 'both';
  /** How thick the ambient mist is (edge reach + how much of the whole
   * screen it gradually hazes over). */
  fogIntensity: 'low' | 'medium' | 'high';
  /** Last applied theme id (see THEMES in config). */
  themeId: string;
  /** Show the clock widget. */
  showClock: boolean;
  /** Show the weather line (icon + temperature). Always sourced live from the
   * weather API (GPS + Open-Meteo) — shows nothing when that fetch hasn't
   * succeeded yet, never a manual/guessed value. */
  showWeather: boolean;
  /** Show the date under the clock. */
  showDate: boolean;
  /** Clock format: 12-hour (with AM/PM) or 24-hour (no AM/PM). */
  hourFormat: '12' | '24';
  /** Show the ق.ظ/ب.ظ (AM/PM) label next to the clock. Only relevant when
   * hourFormat is '12' — split out as its own switch so it can be turned off
   * independently instead of being tied 1:1 to the 12/24 choice. */
  showAmPm: boolean;
  /** Digit script used to render the clock's time: Persian (۱۲:۳۰) or
   * English/western (12:30) — also switches the AM/PM label to "AM"/"PM"
   * when set to 'en'. Only the clock; other Persian text is unaffected. */
  clockDigits: 'fa' | 'en';
  /** Clock widget placement/style: 'inline' is the default small clock next
   * to the date in the top-left corner; 'bigCentered' shows just the time,
   * large, centered on the screen, with the hour stacked above the minute
   * instead of side by side (see ClockWidget.tsx). */
  clockLayout: 'inline' | 'bigCentered';
  /** Font colour (hex) for the clock's hour:minute digits, in both layouts.
   * Independent of glowColor/dynamicColor, which only affect the glow behind
   * the text, not its fill colour. */
  clockTextColor: string;
  /** Font colour (hex) for the clock's small text: the date lines and the
   * AM/PM label. The Gregorian line renders at reduced opacity of it. */
  clockSmallTextColor: string;
  /** Font colour (hex) for the bottom quote widget's main (large) line. */
  quoteTextColor: string;
  /** Font colour (hex) for the bottom quote widget's small first line. */
  quoteSmallTextColor: string;
  /** Font id for Persian/Arabic text (see FONTS in fonts.ts). */
  fontIdFa: string;
  /** Font id for English (Latin) text (see FONTS in fonts.ts). */
  fontIdEn: string;
  /** Size multiplier for the clock/date widget (0.7 .. 1.6). */
  clockFontScale: number;
  /** Size multiplier for the bottom quote widget (0.7 .. 1.6). */
  quoteFontScale: number;
  /** When true, clock & bottom text become draggable to reposition them. */
  editLayout: boolean;
  /** Drag offset for the clock/date block. */
  clockOffset: LayoutOffset;
  /** Drag offset for the weather/temperature label. */
  weatherOffset: LayoutOffset;
  /** Drag offset for the bottom quote block. */
  quoteOffset: LayoutOffset;
  /** Show the bottom quote/emblem widget. */
  showQuote: boolean;
  /** First (small) line of the bottom quote. */
  quoteLine1: string;
  /** Second (large, gold) line of the bottom quote. */
  quoteLine2: string;
  /** Which quote category (see QuoteCategory in store/types) populates the
   * bottom-of-screen quote widget; '' picks the first category returned by
   * the backend (normally "بیانات رهبر", preserving the original content). */
  quoteCategoryId: string;
  // /** When on, the bottom quote widget shows the backend's AI-generated
  //  * "quote of the day" (GET /daily-quote) instead of quoteCategoryId's
  //  * pick — see QuoteWidget.tsx. Falls back to the normal category pick if
  //  * the fetch fails (e.g. the feature isn't configured server-side). */
  // dailyAiQuote: boolean; // [AI disabled for this version]
  /** Countdown target date-time (ISO string). [countdown feature disabled] */
  countdownTargetISO: string;
  /** Countdown label. [countdown feature disabled] */
  countdownLabel: string;
  // [combat mode disabled for now — planned for a future version, see
  // ProjectileLayer.tsx]
  // /** "Combat" mode: hides the fog and the bottom quote/emblem, and instead
  //  * flies a missile/drone silhouette across the screen every 8s. */
  // combatMode: boolean;
  /** Tilt the scene with the device's gyroscope, on top of the drag parallax. */
  gyroParallax: boolean;
  /** Tilt the background photo as a 3D plane (perspective rotate) under the
   * gyroscope, instead of a flat translate. No real subject/foreground
   * cutout (that needs an on-device ML segmentation model, not currently a
   * dependency) — this is a stylised "tilting plane" depth cue layered
   * against the already-independent orbit/particle parallax speeds. Off by
   * default; requires gyroParallax to also be on to have any effect. */
  depthParallax: boolean;
  /** Show an expanding glow ring wherever the screen is tapped. */
  touchRipple: boolean;
  /** Water-surface ripple: tapping the wallpaper distorts the photo itself in
   * spreading rings, like a pebble dropped in water, and one drop plays in the
   * centre whenever the app is opened (see WaterRippleLayer.tsx). */
  waterRipple: boolean;
  /** Keep the water rippling on its own: a drop lands somewhere at random
   * every 10s while the app is in the foreground. Needs waterRipple on. */
  waterRippleAuto: boolean;
  /** Rain/snow particle effect: off, user-picked rain/snow, or 'auto'
   * (driven by the live weather condition instead of a manual pick). */
  weatherEffects: 'off' | 'rain' | 'snow' | 'auto';
  /** Animate (Ken Burns zoom) the locked-wallpaper thumbnails in the gallery. */
  animatedLockedPreview: boolean;
  /** Home-screen widget: pick a new quote each time it refreshes, instead of
   * always showing the same one. */
  widgetAutoRotateQuote: boolean;
};

/** A user-saved snapshot of the full settings state, under a name they chose. */
export type UserPreset = {
  id: string;
  label: string;
  createdAt: number;
  snapshot: WallpaperSettings;
};

type SettingsContextValue = {
  settings: WallpaperSettings;
  /** `settings.glowColor`, unless `dynamicColor` is on and a colour was
   * successfully sampled from the current background photo — use this
   * wherever the glow/accent colour is actually rendered. */
  resolvedGlowColor: string;
  update: <K extends keyof WallpaperSettings>(
    key: K,
    value: WallpaperSettings[K],
  ) => void;
  /** Apply a theme preset (one-shot; values stay editable afterwards). */
  applyTheme: (themeId: string) => void;
  /** User-saved presets (see savePreset), persisted separately from settings. */
  userPresets: UserPreset[];
  /** Snapshot the current settings under a chosen name. */
  savePreset: (label: string) => void;
  /** Restore every setting from a previously saved preset. */
  applyPreset: (id: string) => void;
  deletePreset: (id: string) => void;
};

const DEFAULTS: WallpaperSettings = {
  autoRotate: true,
  speed: 1,
  ringCount: RINGS.length,
  showOrbs: false,
  ballCount: 24,
  orbVisibility: 'steady',
  orbitCategoryId: '',
  rotationAxis: 'y',
  dayNightMode: 'auto',
  sunFlare: false,
  particleMode: 'auto',
  particleIntensity: 'medium',
  particleShape: 'dot',
  glowColor: '#5eead4',
  dynamicColor: true,
  vignette: false,
  fogMode: 'off',
  fogIntensity: 'medium',
  themeId: 'A',
  backgroundId: DEFAULT_BACKGROUND_ID,
  livingWallpaper: false,
  wallpaperShake: false,
  randomBackgroundUris: [],
  randomBackgroundEnabled: false,
  showClock: true,
  showWeather: true,
  showDate: true,
  hourFormat: '12',
  showAmPm: true,
  clockDigits: 'fa',
  clockLayout: 'inline',
  clockTextColor: '#f5e6b3',
  quoteTextColor: '#f5e6b3',
  clockSmallTextColor: '#ffffff',
  quoteSmallTextColor: '#ffffff',
  fontIdFa: DEFAULT_FA_FONT_ID,
  fontIdEn: DEFAULT_EN_FONT_ID,
  clockFontScale: 1,
  quoteFontScale: 1,
  editLayout: false,
  clockOffset: {x: 0, y: 0},
  weatherOffset: {x: 0, y: 0},
  quoteOffset: {x: 0, y: 0},
  showQuote: false,
  quoteLine1: 'ما با این جوان‌ها',
  quoteLine2: 'به جایی خواهیم رسید',
  quoteCategoryId: '',
  // dailyAiQuote: false, // [AI disabled for this version]
  countdownTargetISO: COUNTDOWN.targetISO,
  countdownLabel: COUNTDOWN.label,
  // combatMode: false, // [combat mode disabled for now]
  gyroParallax: false,
  depthParallax: false,
  touchRipple: false,
  waterRipple: false,
  waterRippleAuto: false,
  weatherEffects: 'off',
  animatedLockedPreview: true,
  widgetAutoRotateQuote: true,
};

/**
 * Settings saved before the Persian/English font split carried a single
 * `fontId`. Move it into the group it belongs to so the user's old pick
 * survives; the other group keeps its default.
 */
function migrateLegacyFont(
  saved: Partial<WallpaperSettings> & {fontId?: string},
): Partial<WallpaperSettings> {
  const {fontId, ...rest} = saved;
  if (fontId === undefined) return rest;
  const key = getFont(fontId).script === 'en' ? 'fontIdEn' : 'fontIdFa';
  return {[key]: fontId, ...rest};
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({children}: {children: React.ReactNode}) {
  const [settings, setSettings] = useState<WallpaperSettings>(DEFAULTS);
  // True once the persisted settings have been loaded (or found absent) —
  // guards the save effect below so it doesn't overwrite storage with
  // DEFAULTS before the real, previously-saved values have been read.
  const loadedRef = useRef(false);

  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const presetsLoadedRef = useRef(false);

  useEffect(() => {
    pruneOversizedImageCache();
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = migrateLegacyFont(JSON.parse(raw));
        // A background bundled at save-time can later be removed from
        // BACKGROUNDS (see config.ts) — without this, a device that had
        // picked it stays stuck pointing at a photo that no longer exists
        // (MainBackground then renders nothing) instead of falling back to
        // the app's current default.
        const validBackgroundIds = new Set([
          ...BACKGROUNDS.map(b => b.id),
          'custom',
        ]);
        if (
          saved.backgroundId !== undefined &&
          !validBackgroundIds.has(saved.backgroundId)
        ) {
          saved.backgroundId = DEFAULT_BACKGROUND_ID;
        }
        setSettings(prev => ({...prev, ...saved}));
      })
      .catch(() => {
        // No persisted settings yet, or corrupted — fall back to DEFAULTS.
      })
      .finally(() => {
        loadedRef.current = true;
      });

    AsyncStorage.getItem(PRESETS_STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        setUserPresets(JSON.parse(raw) as UserPreset[]);
      })
      .catch(() => {
        // No saved presets yet, or corrupted — start with an empty list.
      })
      .finally(() => {
        presetsLoadedRef.current = true;
      });
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  useEffect(() => {
    if (!presetsLoadedRef.current) return;
    AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(userPresets)).catch(() => {});
  }, [userPresets]);

  // The live wallpaper runs in its own process with no access to this store,
  // so the ripple switches have to be mirrored into its SharedPreferences.
  useEffect(() => {
    syncLiveWallpaperRipple(settings.waterRipple, settings.waterRippleAuto);
  }, [settings.waterRipple, settings.waterRippleAuto]);

  // Same reason, for the rotation pool: the service downloads and keeps its
  // own copies, since it can reach neither the JS store nor the image cache.
  useEffect(() => {
    syncLiveWallpaperSources(
      settings.randomBackgroundUris,
      settings.randomBackgroundEnabled,
    );
  }, [settings.randomBackgroundUris, settings.randomBackgroundEnabled]);

  // Keep the global font patch (setupFonts) in sync with the selection so every
  // re-rendered piece of text uses the chosen font. Done during render so the
  // children below read the correct font on the same pass.
  setAppFonts(settings.fontIdFa, settings.fontIdEn);

  // Mirrors MainBackground's own source resolution so the sampled colour
  // always matches what's actually on screen. Skipped for a remote gallery
  // URL only in that it's fetched directly (Skia's Data.fromURI handles
  // http(s) itself) rather than through the app's own image cache.
  const bundledBackground = BACKGROUNDS.find(b => b.id === settings.backgroundId);
  const dynamicColorSource: DynamicColorSource =
    settings.backgroundId === 'custom'
      ? settings.customBackgroundUri
      : bundledBackground?.source;
  const dynamicGlowColor = useDynamicAccentColor(
    dynamicColorSource,
    settings.dynamicColor,
  );
  const resolvedGlowColor = dynamicGlowColor ?? settings.glowColor;

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedGlowColor,
      update: (key, val) => setSettings(prev => ({...prev, [key]: val})),
      applyTheme: themeId => {
        const theme = THEMES.find(t => t.id === themeId);
        if (!theme) return;
        setSettings(prev => ({...prev, ...theme.patch, themeId}));
      },
      userPresets,
      savePreset: label => {
        const trimmed = label.trim();
        if (!trimmed) return;
        setUserPresets(prev => [
          ...prev,
          {
            id: `${Date.now()}`,
            label: trimmed,
            createdAt: Date.now(),
            snapshot: settings,
          },
        ]);
      },
      applyPreset: id => {
        const preset = userPresets.find(p => p.id === id);
        if (!preset) return;
        setSettings({...DEFAULTS, ...migrateLegacyFont(preset.snapshot)});
      },
      deletePreset: id => {
        setUserPresets(prev => prev.filter(p => p.id !== id));
      },
    }),
    [settings, userPresets, resolvedGlowColor],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return ctx;
}
