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

const COUNTS = {low: 22, medium: 38, high: 60} as const;

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
}: {
  particle: Particle;
  clock: SharedValue<number>;
  width: number;
  height: number;
  brightness: number;
  color: string;
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
    return {
      transform: [{translateX: x}, {translateY: y}],
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

/** A drifting field of glowing dust/light motes rising slowly up the screen. */
export default function ParticleField() {
  const {settings} = useSettings();
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

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({length: count}).map(() => ({
        x: Math.random(),
        size: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1.2,
        offset: Math.random(),
        swayAmp: 6 + Math.random() * 22,
        swayFreq: 1 + Math.random() * 2.5,
        swayPhase: Math.random() * Math.PI * 2,
        base: 0.35 + Math.random() * 0.5,
      })),
    [count],
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
          color={settings.glowColor}
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
