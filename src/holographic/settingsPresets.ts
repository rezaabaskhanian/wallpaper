import type {WallpaperSettings} from './SettingsContext';

/**
 * Built-in one-tap looks shown at the start of the presets row (Settings ▸
 * خانه). Each only touches the «جلوه‌ها» and «حرکت و لمس» settings — never
 * the photo, fonts, clock or text. Every on/off switch of those two groups
 * that a preset doesn't name is turned off (they cost battery); choices that
 * are a matter of taste (particle shape, glow colour) are left alone.
 */
export type BuiltinPreset = {
  id: string;
  label: string;
  patch: Partial<WallpaperSettings>;
};

const ALL_OFF: Partial<WallpaperSettings> = {
  sunFlare: false,
  dynamicColor: false,
  vignette: false,
  fogMode: 'off',
  weatherEffects: 'off',
  particleMode: 'off',
  livingWallpaper: false,
  wallpaperShake: false,
  waterRipple: false,
  waterRippleAuto: false,
  gyroParallax: false,
  depthParallax: false,
  touchRipple: false,
};

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  {
    id: 'simple',
    label: 'ساده',
    patch: {...ALL_OFF, dayNightMode: 'off'},
  },
  {
    id: 'calm',
    label: 'آرام',
    patch: {
      ...ALL_OFF,
      dayNightMode: 'auto',
      particleMode: 'on',
      particleIntensity: 'low',
      livingWallpaper: true,
      dynamicColor: true,
    },
  },
  {
    id: 'rainy',
    label: 'بارانی',
    patch: {
      ...ALL_OFF,
      dayNightMode: 'auto',
      fogMode: 'bottom',
      weatherEffects: 'rain',
      vignette: true,
    },
  },
  {
    id: 'night',
    label: 'شب',
    patch: {
      ...ALL_OFF,
      dayNightMode: 'night',
      particleMode: 'on',
      particleIntensity: 'medium',
      vignette: true,
    },
  },
  {
    id: 'smart',
    label: 'هوشمند',
    patch: {
      ...ALL_OFF,
      dayNightMode: 'auto',
      particleMode: 'auto',
      weatherEffects: 'auto',
      sunFlare: true,
    },
  },
];

/** True when every value the preset sets already matches `settings`. */
export function presetMatches(
  preset: BuiltinPreset,
  settings: WallpaperSettings,
): boolean {
  return (Object.keys(preset.patch) as (keyof WallpaperSettings)[]).every(
    k => settings[k] === preset.patch[k],
  );
}
