import React, {createContext, useContext, useMemo, useState} from 'react';
import {COUNTDOWN, DEFAULT_BACKGROUND_ID, RINGS} from './config';
import {DEFAULT_FONT_ID} from './fonts';
import {setAppFont} from './setupFonts';
import {THEMES} from './themes';

/** A draggable widget's position offset (px) from its default anchor. */
export type LayoutOffset = {x: number; y: number};

/** Live, user-adjustable wallpaper settings (kept in memory for now). */
export type WallpaperSettings = {
  /** Auto-spin the rings. */
  autoRotate: boolean;
  /** Speed multiplier for the auto-spin (0.25 .. 3). */
  speed: number;
  /** How many rings to show (1 .. RINGS.length). */
  ringCount: number;
  /** Show the rotating orbs at all. */
  showOrbs: boolean;
  /** How many rotating orbs sit on the sphere. */
  ballCount: number;
  /** Visual style for each orbiting martyr portrait: plain glowing orb, or a
   * small winged "angel" with the portrait as its face. */
  orbShape: 'orb' | 'angel';
  /** Which martyr category populates the orbiting "logo" avatars; '' shows
   * every martyr regardless of category (see MartyrCategory in store/types). */
  martyrCategoryId: string;
  /** Axis the sphere spins around: 'x', 'y', 'z', or 'mixed' (each orb picks
   * its own axis round-robin, like electrons around an atom). */
  rotationAxis: 'x' | 'y' | 'z' | 'mixed';
  /** Selected background id (see BACKGROUNDS in config, or 'custom'). */
  backgroundId: string;
  /** Uri of a photo the user picked from their gallery (for backgroundId 'custom'). */
  customBackgroundUri?: string;
  /** Day/night colour theme: auto (by sun times), forced day/night, or off. */
  dayNightMode: 'auto' | 'day' | 'night' | 'off';
  /** Floating light-particle effect: off, always on, or auto (brighter at night). */
  particleMode: 'off' | 'on' | 'auto';
  /** Particle density/brightness. */
  particleIntensity: 'low' | 'medium' | 'high';
  /** Glow/accent colour for the orbs and particles (hex). */
  glowColor: string;
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
  /** Show the weather line (icon + temperature). */
  showWeather: boolean;
  /** Try to fetch live weather from GPS; else use manualTemp. */
  liveWeather: boolean;
  /** Fallback temperature (°C) when live weather is off/unavailable. */
  manualTemp: number;
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
  /** Rain/snow particles driven by the live weather condition. */
  weatherEffects: boolean;
  /** Animate (Ken Burns zoom) the locked-wallpaper thumbnails in the gallery. */
  animatedLockedPreview: boolean;
  /** Home-screen widget: pick a new quote each time it refreshes, instead of
   * always showing the same one. */
  widgetAutoRotateQuote: boolean;
};

type SettingsContextValue = {
  settings: WallpaperSettings;
  update: <K extends keyof WallpaperSettings>(
    key: K,
    value: WallpaperSettings[K],
  ) => void;
  /** Apply a theme preset (one-shot; values stay editable afterwards). */
  applyTheme: (themeId: string) => void;
};

const DEFAULTS: WallpaperSettings = {
  autoRotate: true,
  speed: 1,
  ringCount: RINGS.length,
  showOrbs: true,
  ballCount: 24,
  orbShape: 'orb',
  martyrCategoryId: '',
  rotationAxis: 'y',
  dayNightMode: 'auto',
  particleMode: 'auto',
  particleIntensity: 'medium',
  glowColor: '#5eead4',
  vignette: false,
  fogMode: 'off',
  fogIntensity: 'medium',
  themeId: 'A',
  backgroundId: DEFAULT_BACKGROUND_ID,
  showClock: true,
  showWeather: true,
  liveWeather: true,
  manualTemp: 24,
  showDate: true,
  hourFormat: '12',
  fontId: DEFAULT_FONT_ID,
  editLayout: false,
  clockOffset: {x: 0, y: 0},
  weatherOffset: {x: 0, y: 0},
  quoteOffset: {x: 0, y: 0},
  showQuote: true,
  quoteLine1: 'ما با این جوان‌ها',
  quoteLine2: 'به جایی خواهیم رسید',
  countdownTargetISO: COUNTDOWN.targetISO,
  countdownLabel: COUNTDOWN.label,
  // combatMode: false, // [combat mode disabled for now]
  gyroParallax: false,
  weatherEffects: false,
  animatedLockedPreview: true,
  widgetAutoRotateQuote: true,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({children}: {children: React.ReactNode}) {
  const [settings, setSettings] = useState<WallpaperSettings>(DEFAULTS);

  // Keep the global font patch (setupFonts) in sync with the selection so every
  // re-rendered piece of text uses the chosen font. Done during render so the
  // children below read the correct font on the same pass.
  setAppFont(settings.fontId);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      update: (key, val) => setSettings(prev => ({...prev, [key]: val})),
      applyTheme: themeId => {
        const theme = THEMES.find(t => t.id === themeId);
        if (!theme) return;
        setSettings(prev => ({...prev, ...theme.patch, themeId}));
      },
    }),
    [settings],
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
