import React, {useMemo} from 'react';
import {
  Canvas,
  Group,
  Path,
  Skia,
  Blur,
  Paint,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import {useDerivedValue, SharedValue} from 'react-native-reanimated';
import type {SkPath} from '@shopify/react-native-skia';

type Props = {
  width: number;
  height: number;
  /** 0..1 loop driving the slow holographic rotation/drift. */
  progress: SharedValue<number>;
  /** Parallax offset in px, driven by the pan/tilt gesture. */
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
  /** Skip the opaque base gradient so contour lines overlay a photo bg. */
  transparentBase?: boolean;
};

/**
 * Builds a single topographic contour: a wavy near-circle whose radius is
 * modulated by a few sine harmonics so the stacked rings read like an
 * elevation map rather than plain concentric circles.
 */
function buildContour(
  cx: number,
  cy: number,
  radius: number,
  seed: number,
): SkPath {
  const path = Skia.Path.Make();
  const steps = 120;
  const h1 = 0.08 + (seed % 3) * 0.02;
  const h2 = 0.05 + (seed % 5) * 0.015;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const wobble =
      1 +
      h1 * Math.sin(t * 3 + seed) +
      h2 * Math.sin(t * 5 - seed * 0.7) +
      0.03 * Math.sin(t * 8 + seed * 1.3);
    const r = radius * wobble;
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.close();
  return path;
}

export default function TopographicBackground({
  width,
  height,
  progress,
  parallaxX,
  parallaxY,
  transparentBase = false,
}: Props) {
  const cx = width / 2;
  const cy = height / 2;

  // Static contour rings, built once. Two interleaved families rotate in
  // opposite directions for a subtle holographic depth.
  const {ringsA, ringsB} = useMemo(() => {
    const maxR = Math.hypot(width, height) * 0.55;
    const count = 16;
    const a: SkPath[] = [];
    const b: SkPath[] = [];
    for (let i = 1; i <= count; i++) {
      const radius = (maxR / count) * i;
      const p = buildContour(cx, cy, radius, i);
      if (i % 2 === 0) {
        a.push(p);
      } else {
        b.push(p);
      }
    }
    return {ringsA: a, ringsB: b};
  }, [cx, cy, width, height]);

  const origin = useMemo(() => vec(cx, cy), [cx, cy]);

  const transformA = useDerivedValue(() => [
    {translateX: parallaxX.value},
    {translateY: parallaxY.value},
    {rotate: progress.value * Math.PI * 2 * 0.06},
  ]);

  const transformB = useDerivedValue(() => [
    {translateX: parallaxX.value * 1.6},
    {translateY: parallaxY.value * 1.6},
    {rotate: -progress.value * Math.PI * 2 * 0.09},
  ]);

  return (
    <Canvas style={{position: 'absolute', width, height}}>
      {/* Deep holographic base glow (skipped when a photo bg is behind us). */}
      {transparentBase ? null : (
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(cx, cy)}
            r={Math.max(width, height) * 0.75}
            colors={['#0b3a3a', '#061c1c', '#020a0a']}
          />
        </Rect>
      )}

      <Group transform={transformA} origin={origin}>
        {ringsA.map((p, i) => (
          <Path
            key={`a-${i}`}
            path={p}
            style="stroke"
            strokeWidth={1.1}
            color="rgba(64, 224, 208, 0.28)">
            <Blur blur={0.6} />
          </Path>
        ))}
      </Group>

      <Group transform={transformB} origin={origin}>
        {ringsB.map((p, i) => (
          <Path
            key={`b-${i}`}
            path={p}
            style="stroke"
            strokeWidth={0.9}
            color="rgba(125, 211, 252, 0.18)"
          />
        ))}
      </Group>

      {/* Center bloom so the hero sits in a pool of light. */}
      <Group>
        <Paint>
          <Blur blur={40} />
        </Paint>
        <Rect x={cx - 140} y={cy - 140} width={280} height={280}>
          <RadialGradient
            c={vec(cx, cy)}
            r={160}
            colors={['rgba(64,224,208,0.35)', 'rgba(64,224,208,0)']}
          />
        </Rect>
      </Group>
    </Canvas>
  );
}
