import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BACKGROUNDS, COUNTDOWN, DEFAULT_BACKGROUND_ID, RINGS} from './config';
import {DEFAULT_FONT_ID} from './fonts';
import {setAppFont} from './setupFonts';
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
  /** Uri of a photo the user picked from their gallery (for backgroundId 'custom'). */
  customBackgroundUri?: string;
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
  /** Glow/accent colour for the orbs and particles (hex). Ignored in favour
   * of a colour sampled from the background photo when `dynamicColor` is on
   * (and sampling succeeds) — see `resolvedGlowColor` on the context. */
  glowColor: string;
  /** Derive the glow colour from the current background photo instead of the
   * manual swatch above. Off by default. */
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
  /** Selected on-screen font id (see FONTS in fonts.ts). */
  fontId: string;
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
  glowColor: '#5eead4',
  dynamicColor: true,
  vignette: false,
  fogMode: 'off',
  fogIntensity: 'medium',
  themeId: 'A',
  backgroundId: DEFAULT_BACKGROUND_ID,
  showClock: true,
  showWeather: true,
  showDate: true,
  hourFormat: '12',
  fontId: DEFAULT_FONT_ID,
  editLayout: false,
  clockOffset: {x: 0, y: 0},
  weatherOffset: {x: 0, y: 0},
  quoteOffset: {x: 0, y: 0},
  showQuote: false,
  quoteLine1: 'ما با این جوان‌ها',
  quoteLine2: 'به جایی خواهیم رسید',
  quoteCategoryId: '',
  countdownTargetISO: COUNTDOWN.targetISO,
  countdownLabel: COUNTDOWN.label,
  // combatMode: false, // [combat mode disabled for now]
  gyroParallax: false,
  depthParallax: false,
  touchRipple: false,
  weatherEffects: 'off',
  animatedLockedPreview: true,
  widgetAutoRotateQuote: true,
};

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
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<WallpaperSettings>;
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

  // Keep the global font patch (setupFonts) in sync with the selection so every
  // re-rendered piece of text uses the chosen font. Done during render so the
  // children below read the correct font on the same pass.
  setAppFont(settings.fontId);

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
        setSettings(preset.snapshot);
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
