import React from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import type {SunFlareSample} from './dayNight';

type Props = {
  sample: SunFlareSample;
};

/**
 * Renders the sun-glow lens flare sampled by dayNight.ts's sampleSunFlare:
 * a bright core + soft halo at the sun's current screen position, plus a
 * couple of faint "ghost" artifacts along the axis toward screen centre
 * (the classic lens-flare look), all scaled by the sample's intensity.
 */
export default function SunFlare({sample}: Props) {
  const {width, height} = useWindowDimensions();

  if (sample.intensity <= 0.01) {
    return null;
  }

  const cx = sample.x * width;
  const cy = sample.y * height;
  const dx = width / 2 - cx;
  const dy = height / 2 - cy;

  const coreSize = Math.min(width, height) * 0.16;
  const haloSize = coreSize * 3.4;

  const ghostStyle = (t: number, size: number, baseOpacity: number) => ({
    left: cx + dx * t - size / 2,
    top: cy + dy * t - size / 2,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: sample.color,
    opacity: baseOpacity * sample.intensity,
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.halo,
          {
            left: cx - haloSize / 2,
            top: cy - haloSize / 2,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: sample.color,
            shadowColor: sample.color,
            opacity: 0.45 * sample.intensity,
          },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            left: cx - coreSize / 2,
            top: cy - coreSize / 2,
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: sample.color,
            shadowColor: sample.color,
            opacity: sample.intensity,
          },
        ]}
      />
      <View style={[styles.ghost, ghostStyle(0.45, coreSize * 0.35, 0.16)]} />
      <View style={[styles.ghost, ghostStyle(0.8, coreSize * 0.2, 0.12)]} />
      <View style={[styles.ghost, ghostStyle(1.2, coreSize * 0.45, 0.08)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    shadowOpacity: 0.9,
    shadowRadius: 60,
  },
  core: {
    position: 'absolute',
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  ghost: {
    position: 'absolute',
  },
});
