import React, {useMemo} from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import type {SunFlareSample} from './dayNight';
import {withAlpha} from './dynamicColor';

type Props = {
  sample: SunFlareSample;
  /** Area to draw into; defaults to the full screen. The settings preview
   * passes its own small card size. */
  width?: number;
  height?: number;
};

const RAY_COUNT = 12;

/**
 * Renders the sun-glow lens flare sampled by dayNight.ts's sampleSunFlare, in
 * Skia so every layer is a real soft gradient (plain Views with shadowRadius
 * render as hard-edged discs on Android):
 *  - a wide warm bloom and a white-hot core that fades into the sun colour,
 *  - faint static rays (no spin: redrawing a full-screen canvas every frame
 *    costs battery and made the home screen miss taps on slower devices),
 *  - a thin horizontal (anamorphic) streak through the sun,
 *  - a few tinted "ghost" discs along the axis toward screen centre.
 * Colour, position and strength all come from the sample, so the flare warms
 * to orange low on the horizon at sunrise/sunset and pales at noon.
 */
export default function SunFlare({sample, width, height}: Props) {
  const screen = useWindowDimensions();
  const w = width ?? screen.width;
  const h = height ?? screen.height;

  const cx = sample.x * w;
  const cy = sample.y * h;
  const base = Math.min(w, h);
  const coreR = base * 0.045; // sizes the streak and ghosts
  const glowR = base * 0.16;
  const bloomR = base * 0.5;
  const rayLen = base * 0.42;

  // Thin wedges fanning out from the sun, drawn once per size/position.
  const rays = useMemo(() => {
    const path = Skia.Path.Make();
    for (let i = 0; i < RAY_COUNT; i++) {
      const a = (i / RAY_COUNT) * Math.PI * 2;
      // Alternate long/short rays so it doesn't read as a clock face.
      const len = i % 2 === 0 ? rayLen : rayLen * 0.6;
      const spread = 0.045;
      path.moveTo(cx, cy);
      path.lineTo(cx + Math.cos(a - spread) * len, cy + Math.sin(a - spread) * len);
      path.lineTo(cx + Math.cos(a + spread) * len, cy + Math.sin(a + spread) * len);
      path.close();
    }
    return path;
  }, [cx, cy, rayLen]);

  if (sample.intensity <= 0.01 || w <= 0 || h <= 0) {
    return null;
  }

  const k = sample.intensity;
  const color = sample.color;
  const a = (alpha: number) => withAlpha(color, alpha * k);

  // Ghosts sit on the line from the sun through screen centre.
  const dx = w / 2 - cx;
  const dy = h / 2 - cy;
  const ghosts: {t: number; r: number; tint: string; alpha: number}[] = [
    {t: 0.55, r: coreR * 1.1, tint: 'rgb(150, 210, 255)', alpha: 0.22},
    {t: 0.9, r: coreR * 0.55, tint: color, alpha: 0.3},
    {t: 1.25, r: coreR * 1.8, tint: 'rgb(190, 255, 200)', alpha: 0.14},
    {t: 1.6, r: coreR * 0.9, tint: 'rgb(220, 170, 255)', alpha: 0.18},
  ];

  return (
    <Canvas
      pointerEvents="none"
      style={width === undefined ? StyleSheet.absoluteFill : {width: w, height: h}}>
      {/* Wide bloom that lights up the sky around the sun. */}
      <Circle cx={cx} cy={cy} r={bloomR}>
        <RadialGradient
          c={vec(cx, cy)}
          r={bloomR}
          colors={[a(0.6), a(0.28), a(0.08), a(0)]}
          positions={[0, 0.2, 0.55, 1]}
        />
      </Circle>

      {/* Rays. */}
      <Path path={rays}>
        <RadialGradient
          c={vec(cx, cy)}
          r={rayLen}
          colors={[a(0.55), a(0.2), a(0)]}
          positions={[0, 0.45, 1]}
        />
        <BlurMask blur={base * 0.006} style="normal" />
      </Path>

      {/* Horizontal anamorphic streak. */}
      <Oval
        x={cx - w * 0.45}
        y={cy - coreR * 0.18}
        width={w * 0.9}
        height={coreR * 0.36}>
        <LinearGradient
          start={vec(cx - w * 0.45, cy)}
          end={vec(cx + w * 0.45, cy)}
          colors={[a(0), a(0.35), a(0)]}
        />
        <BlurMask blur={coreR * 0.15} style="normal" />
      </Oval>

      {/* White-hot centre fading through the sun colour to nothing — one
          soft gradient, so there is no hard disc edge. */}
      <Circle cx={cx} cy={cy} r={glowR}>
        <RadialGradient
          c={vec(cx, cy)}
          r={glowR}
          colors={[
            `rgba(255, 255, 255, ${k})`,
            `rgba(255, 255, 255, ${0.85 * k})`,
            a(0.7),
            a(0.25),
            a(0),
          ]}
          positions={[0, 0.12, 0.3, 0.6, 1]}
        />
      </Circle>

      {ghosts.map((g, i) => {
        const gx = cx + dx * g.t;
        const gy = cy + dy * g.t;
        return (
          <Circle key={i} cx={gx} cy={gy} r={g.r}>
            <RadialGradient
              c={vec(gx, gy)}
              r={g.r}
              colors={[
                withAlpha(g.tint, g.alpha * 0.4 * k),
                withAlpha(g.tint, g.alpha * k),
                withAlpha(g.tint, 0),
              ]}
              positions={[0, 0.8, 1]}
            />
          </Circle>
        );
      })}
    </Canvas>
  );
}
