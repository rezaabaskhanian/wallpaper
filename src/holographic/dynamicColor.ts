/**
 * Extracts a vivid accent colour from the current background photo, for
 * Settings ▸ عمومی ▸ رنگ پویا از عکس (off by default). Uses Skia — already a
 * dependency for the topographic background — to downsample the photo to a
 * handful of pixels, average them, then boost saturation/lightness into a
 * pleasant glow range (the same idea as Android's "Material You" wallpaper
 * colour, simplified to an average instead of real k-means clustering).
 */
import {useEffect, useState} from 'react';
import {Skia, useImage} from '@shopify/react-native-skia';

/** Small enough to be instant; large enough to average out noise/detail. */
const SAMPLE_SIZE = 12;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) {
    return [0, 0, l];
  }
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) {
    h = ((g - b) / d) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/** A flat photo average reads muddy/gray — push it into a vivid, legible
 * accent range instead of using the raw average directly. */
function toAccentColor(r: number, g: number, b: number): string {
  const [h, s] = rgbToHsl(r, g, b);
  const boostedS = Math.max(0.5, Math.min(0.85, s * 1.7));
  const [ar, ag, ab] = hslToRgb(h, boostedS, 0.62);
  return `rgb(${ar}, ${ag}, ${ab})`;
}

export type DynamicColorSource = number | string | undefined;

/**
 * Samples `source`'s average colour and returns a boosted accent, or null
 * while disabled/loading/failed — callers should fall back to the manually
 * picked glow colour in that case.
 */
export function useDynamicAccentColor(
  source: DynamicColorSource,
  enabled: boolean,
): string | null {
  // useImage tolerates a null source (it just resolves to a null image), so
  // this stays a single, unconditionally-called hook regardless of `enabled`.
  const image = useImage(enabled ? source ?? null : null);
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !image) {
      setColor(null);
      return;
    }
    try {
      const surface = Skia.Surface.MakeOffscreen(SAMPLE_SIZE, SAMPLE_SIZE);
      if (!surface) {
        setColor(null);
        return;
      }
      const canvas = surface.getCanvas();
      canvas.drawImageRect(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        Skia.XYWHRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE),
        Skia.Paint(),
      );
      const pixels = surface.makeImageSnapshot().readPixels();
      if (!pixels) {
        setColor(null);
        return;
      }
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        r += pixels[i];
        g += pixels[i + 1];
        b += pixels[i + 2];
        count++;
      }
      if (count === 0) {
        setColor(null);
        return;
      }
      setColor(toAccentColor(r / count, g / count, b / count));
    } catch {
      setColor(null);
    }
  }, [image, enabled]);

  return color;
}
