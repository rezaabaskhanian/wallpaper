import React, {useEffect, useMemo} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import {useSettings} from './SettingsContext';

const COUNTS = {low: 22, medium: 38, high: 60, extreme: 95} as const;
/** Multiplies each particle's drift speed — higher intensity also moves
 * faster, not just denser. */
const SPEED_FACTOR = {low: 1, medium: 1, high: 1.25, extreme: 1.6} as const;

type Particle = {
  x: number; // 0..1 of width
  size: number;
  speed: number; // fraction of the cycle it climbs per unit clock
  offset: number; // starting progress 0..1
  swayAmp: number; // px
  swayFreq: number;
  swayPhase: number;
  base: number; // base opacity
};

/** Smooth 0→1→0 fade so particles appear/vanish softly near the edges. */
function edgeFade(p: number): number {
  'worklet';
  const f = Math.min(p, 1 - p) / 0.15;
  return Math.max(0, Math.min(1, f));
}

function Dot({
  particle,
  clock,
  width,
  height,
  brightness,
  color,
  tiltX,
  tiltY,
}: {
  particle: Particle;
  clock: SharedValue<number>;
  width: number;
  height: number;
  brightness: number;
  color: string;
  /** Gyroscope tilt offsets (see HolographicHome), so the dust drifts along
   * with the background/orbs instead of staying pinned in place. */
  tiltX?: SharedValue<number>;
  tiltY?: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    // Progress climbs from bottom (0) to top (1), wrapping around.
    const p = (clock.value * particle.speed + particle.offset) % 1;
    const y = height * (1 - p);
    const sway =
      Math.sin(clock.value * particle.swayFreq + particle.swayPhase) *
      particle.swayAmp;
    const x = width * particle.x + sway;
    const twinkle =
      0.55 + 0.45 * Math.sin(clock.value * 6 + particle.swayPhase * 3);
    // A softer factor than the orbs (1.4) so the dust reads as further back.
    const tx = tiltX ? tiltX.value * 0.8 : 0;
    const ty = tiltY ? tiltY.value * 0.8 : 0;
    return {
      transform: [{translateX: x + tx}, {translateY: y + ty}],
      opacity: particle.base * brightness * twinkle * edgeFade(p),
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: color,
          shadowColor: color,
        },
        style,
      ]}
    />
  );
}

type Props = {
  /** Gyroscope tilt offsets (see HolographicHome) — optional so this
   * component keeps working standalone (e.g. in a gallery preview). */
  tiltX?: SharedValue<number>;
  tiltY?: SharedValue<number>;
};

/** A drifting field of glowing dust/light motes rising slowly up the screen. */
export default function ParticleField({tiltX, tiltY}: Props) {
  const {settings, resolvedGlowColor} = useSettings();
  const {width, height} = useWindowDimensions();
  const clock = useSharedValue(0);

  useEffect(() => {
    // One slow linear cycle; particle speeds vary the real motion.
    clock.value = withRepeat(
      withTiming(1, {duration: 22000, easing: Easing.linear}),
      -1,
      false,
    );
  }, [clock]);

  const count = COUNTS[settings.particleIntensity];
  const speedFactor = SPEED_FACTOR[settings.particleIntensity];

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({length: count}).map(() => ({
        x: Math.random(),
        size: 2 + Math.random() * 4,
        speed: (0.5 + Math.random() * 1.2) * speedFactor,
        offset: Math.random(),
        swayAmp: 6 + Math.random() * 22,
        swayFreq: 1 + Math.random() * 2.5,
        swayPhase: Math.random() * Math.PI * 2,
        base: 0.35 + Math.random() * 0.5,
      })),
    [count, speedFactor],
  );

  if (settings.particleMode === 'off') {
    return null;
  }

  // 'auto' makes the motes glow brighter at night, calmer in bright daylight.
  let brightness = 1;
  if (settings.particleMode === 'auto') {
    const h = new Date().getHours();
    const nightFactor = h < 6 || h >= 19 ? 1 : h < 8 || h >= 17 ? 0.6 : 0.3;
    brightness = 0.55 + 0.45 * nightFactor;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((particle, i) => (
        <Dot
          key={i}
          particle={particle}
          clock={clock}
          width={width}
          height={height}
          brightness={brightness}
          color={resolvedGlowColor}
          tiltX={tiltX}
          tiltY={tiltY}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(245, 230, 179, 0.95)',
    shadowColor: '#f5e6b3',
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
});
