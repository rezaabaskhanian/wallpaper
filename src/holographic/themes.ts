/**
 * Ready-made themes. Each theme is a one-shot preset: applying it merges its
 * `patch` into the live settings, after which every value can still be tweaked
 * by hand in the settings panel.
 */
import type {WallpaperSettings} from './SettingsContext';

export type Theme = {
  id: string;
  /** Label shown in the settings selector. */
  label: string;
  patch: Partial<WallpaperSettings>;
};

export const THEMES: Theme[] = [
  {
    id: 'A',
    label: 'مسیر نور',
    patch: {
      backgroundId: 'main',
      dayNightMode: 'auto',
      particleMode: 'auto',
      particleIntensity: 'medium',
      showOrbs: true,
      ballCount: 24,
      glowColor: '#f5c451',
      vignette: false,
      speed: 1,
    },
  },
  {
    id: 'B',
    label: 'آسمان شب',
    patch: {
      dayNightMode: 'night',
      particleMode: 'on',
      particleIntensity: 'high',
      showOrbs: true,
      ballCount: 30,
      glowColor: '#5eead4',
      vignette: false,
      speed: 1,
    },
  },
  {
    id: 'C',
    label: 'مینیمال',
    patch: {
      dayNightMode: 'off',
      particleMode: 'off',
      showOrbs: false,
      glowColor: '#ffffff',
      vignette: false,
      speed: 0.75,
    },
  },
  {
    id: 'D',
    label: 'تاریخی',
    patch: {
      dayNightMode: 'auto',
      particleMode: 'on',
      particleIntensity: 'low',
      showOrbs: true,
      glowColor: '#e0a75e',
      vignette: true,
      speed: 0.6,
    },
  },
];
