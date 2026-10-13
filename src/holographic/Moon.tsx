import React, {useMemo} from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {BlurMask, Canvas, Circle, Group, RadialGradient, Skia, vec} from '@shopify/react-native-skia';
import type {MoonSample} from './dayNight';

type Props = {sample: MoonSample};

/**
 * The night counterpart of SunFlare (same «خورشید و ماه» switch): a soft cool
 * halo and a moon disc in its real phase. The dark part is a sky-coloured
 * disc slid across the moon and clipped to it — not an exact terminator, but
 * it reads as the right crescent / half / gibbous at a glance, and like the
 * sun it's drawn once per minute, never animated.
 */
export default function Moon({sample}: Props) {
  const {width: w, height: h} = useWindowDimensions();
  const cx = sample.x * w;
  const cy = sample.y * h;
  const r = Math.min(w, h) * 0.045;

  const clip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

  if (sample.intensity <= 0.01) return null;

  const k = sample.intensity;
  const waxing = sample.phase < 0.5;
  // Lit fraction 0 (new) .. 1 (full); the shadow disc slides off as it grows.
  const lit = (1 - Math.cos(2 * Math.PI * sample.phase)) / 2;
  // Northern hemisphere: a waxing moon is lit on the right, so the shadow
  // sits to the left of centre, and the other way round when waning.
  const shadowX = cx + (waxing ? -1 : 1) * 2 * r * lit;
  const glowR = r * 5;

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Circle cx={cx} cy={cy} r={glowR}>
        <RadialGradient
          c={vec(cx, cy)}
          r={glowR}
          colors={[
            `rgba(205, 220, 255, ${0.35 * k * (0.4 + 0.6 * lit)})`,
            `rgba(180, 200, 255, ${0.12 * k * (0.4 + 0.6 * lit)})`,
            'rgba(180, 200, 255, 0)',
          ]}
          positions={[0, 0.35, 1]}
        />
      </Circle>
      <Group clip={clip} opacity={k}>
        <Circle cx={cx} cy={cy} r={r}>
          <RadialGradient
            c={vec(cx - r * 0.3, cy - r * 0.3)}
            r={r * 1.4}
            colors={['#fbfaf2', '#e6e2cf', '#c9c4ad']}
          />
        </Circle>
        {/* Earthshine: the dark part stays faintly visible. */}
        <Circle cx={shadowX} cy={cy} r={r * 1.02} color="rgba(12, 16, 34, 0.9)">
          <BlurMask blur={r * 0.12} style="normal" />
        </Circle>
      </Group>
    </Canvas>
  );
}
