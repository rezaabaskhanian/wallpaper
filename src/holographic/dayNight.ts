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

export type SunFlareSample = {
  /** 0 (left edge) .. 1 (right edge), fraction of screen width. */
  x: number;
  /** 0 (near top) .. 1 (lower band), fraction of screen height. */
  y: number;
  /** 0 = invisible .. 1 = full brightness. */
  intensity: number;
  /** Flare tint as an rgb() string. */
  color: string;
};

// Keeps the flare's screen-space travel confined to an upper band, so it
// arcs behind the clock/orbs instead of drifting through screen centre.
const FLARE_TOP_BAND = 0.08;
const FLARE_BOTTOM_BAND = 0.5;
// How far past the real sunrise/sunset the flare keeps fading in/out, so it
// doesn't pop on/off at the exact minute.
const FLARE_EDGE_MARGIN = 0.6;

/**
 * Where a sun-glow lens flare should sit on screen and how strong it should
 * be, driven by the same sunrise/sunset window as the tint above. The sun
 * travels left → right across the day, arcing highest (screen top, solar
 * noon) and lowest/brightest-flared near the horizon band at sunrise/sunset,
 * fading out entirely once night falls.
 */
export function sampleSunFlare(hour: number, sun: SunTimes): SunFlareSample {
  const {sunrise, sunset} = sun;
  const span = sunset - sunrise || 1;
  const start = sunrise - FLARE_EDGE_MARGIN;
  const end = sunset + FLARE_EDGE_MARGIN;
  if (hour <= start || hour >= end) {
    return {x: 0.5, y: FLARE_BOTTOM_BAND, intensity: 0, color: 'rgb(255,255,255)'};
  }

  const t = Math.max(0, Math.min(1, (hour - sunrise) / span));
  // Parabolic arc: 0 at either horizon (t=0/1), 1 at solar noon (t=0.5).
  const arc = 1 - Math.pow(2 * t - 1, 2);

  let edgeFade = 1;
  if (hour < sunrise) {
    edgeFade = (hour - start) / FLARE_EDGE_MARGIN;
  } else if (hour > sunset) {
    edgeFade = (end - hour) / FLARE_EDGE_MARGIN;
  }

  // Real low-sun flares read brighter/warmer than high-noon glare.
  const closeToHorizon = 1 - arc;
  const intensity =
    Math.max(0, Math.min(1, edgeFade)) * (0.35 + 0.65 * closeToHorizon);

  const horizonColor: Rgba = [255, 130, 70, 1];
  const noonColor: Rgba = [255, 250, 225, 1];
  const [r, g, b] = lerpRgba(horizonColor, noonColor, arc);

  return {
    x: t,
    y: FLARE_TOP_BAND + (1 - arc) * (FLARE_BOTTOM_BAND - FLARE_TOP_BAND),
    intensity,
    color: `rgb(${r}, ${g}, ${b})`,
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
