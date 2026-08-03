/**
 * Maps the current time of day (using real sunrise/sunset) to a full-screen
 * colour tint + a star intensity, interpolating smoothly between key moments so
 * the wallpaper drifts gently from dawn → day → dusk → night.
 */
import type {SunTimes} from './useSunTimes';

type Rgba = [number, number, number, number];

export type DayNight = {
  /** Overlay tint as an rgba() string. */
  tint: string;
  /** 0 = no stars (day) .. 1 = full stars (deep night). */
  starIntensity: number;
};

type Key = {h: number; tint: Rgba; star: number};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgba(a: Rgba, b: Rgba, t: number): Rgba {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
    lerp(a[3], b[3], t),
  ];
}

/** Build the day's colour keyframes anchored to sunrise/sunset. */
function keyframes({sunrise, sunset}: SunTimes): Key[] {
  const noon = (sunrise + sunset) / 2;
  const NIGHT: Rgba = [4, 10, 40, 0.5];
  return [
    {h: 0, tint: NIGHT, star: 1},
    {h: sunrise - 1, tint: [10, 15, 50, 0.45], star: 1},
    {h: sunrise + 0.4, tint: [255, 140, 60, 0.28], star: 0.12},
    {h: sunrise + 2, tint: [255, 205, 130, 0.1], star: 0},
    {h: noon, tint: [255, 255, 255, 0.04], star: 0},
    {h: sunset - 2, tint: [255, 205, 130, 0.1], star: 0},
    {h: sunset - 0.4, tint: [255, 110, 60, 0.28], star: 0.12},
    {h: sunset + 1.2, tint: [20, 20, 60, 0.44], star: 0.7},
    {h: 24, tint: NIGHT, star: 1},
  ];
}

/** Sample the tint + star intensity for a decimal hour (0..24). */
export function sampleDayNight(hour: number, sun: SunTimes): DayNight {
  const keys = keyframes(sun);
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (hour >= keys[i].h && hour <= keys[i + 1].h) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const span = b.h - a.h || 1;
  const t = Math.max(0, Math.min(1, (hour - a.h) / span));
  const [r, g, bl, al] = lerpRgba(a.tint, b.tint, t);
  return {
    tint: `rgba(${r}, ${g}, ${bl}, ${al})`,
    starIntensity: lerp(a.star, b.star, t),
  };
}

/** Forced-mode helper: pick a representative hour for 'day' / 'night'. */
export function hourForMode(
  mode: 'auto' | 'day' | 'night',
  sun: SunTimes,
  realHour: number,
): number {
  if (mode === 'day') return (sun.sunrise + sun.sunset) / 2;
  if (mode === 'night') return 0;
  return realHour;
}
