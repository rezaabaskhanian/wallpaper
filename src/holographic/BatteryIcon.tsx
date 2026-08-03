import React from 'react';
import {Canvas, Rect, RoundedRect} from '@shopify/react-native-skia';

type Props = {
  size?: number;
  color?: string;
  /** Fill level 0..100. */
  level?: number;
};

/**
 * A battery glyph drawn with Skia so it takes an exact fill colour (the 🔋
 * emoji renders green/coloured and ignores `color`). Shows a body outline with
 * an inner fill proportional to `level`, plus the positive terminal nub.
 */
export default function BatteryIcon({
  size = 20,
  color = '#ffffff',
  level = 100,
}: Props) {
  const w = size;
  const h = size * 0.58;
  const stroke = Math.max(1.2, size * 0.08);
  const bodyW = w * 0.82;
  const pad = stroke + 1.5;
  const clamped = Math.min(100, Math.max(0, level));
  const fillW = ((bodyW - pad * 2) * clamped) / 100;

  return (
    <Canvas style={{width: w, height: h}}>
      {/* body outline */}
      <RoundedRect
        x={stroke / 2}
        y={stroke / 2}
        width={bodyW - stroke}
        height={h - stroke}
        r={2}
        color={color}
        style="stroke"
        strokeWidth={stroke}
      />
      {/* positive terminal */}
      <Rect
        x={bodyW}
        y={h * 0.3}
        width={w * 0.1}
        height={h * 0.4}
        color={color}
      />
      {/* charge level fill */}
      <RoundedRect
        x={pad}
        y={pad}
        width={Math.max(0, fillW)}
        height={h - pad * 2}
        r={1}
        color={color}
      />
    </Canvas>
  );
}
