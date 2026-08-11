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
import type {Weather} from './useWeather';

type Kind = 'rain' | 'snow';

/** Map an Open-Meteo WMO code to a precipitation kind, or null for none. */
function kindForCode(code: number): Kind | null {
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) {
    return 'rain';
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'snow';
  }
  return null;
}

const COUNTS: Record<Kind, number> = {rain: 46, snow: 34};

type Drop = {
  x: number; // 0..1 of width
  size: number;
  speed: number; // fraction of the fall cycle per unit clock
  offset: number; // starting progress 0..1
  swayAmp: number; // px, snow only
  swayFreq: number;
  swayPhase: number;
  opacity: number;
};

function Rain({
  drop,
  clock,
  width,
  height,
}: {
  drop: Drop;
  clock: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const p = (clock.value * drop.speed + drop.offset) % 1;
    const y = height * p - 40;
    // Slight leftward slant, like wind-blown rain.
    const x = width * drop.x - p * 18;
    return {
      transform: [{translateX: x}, {translateY: y}, {rotate: '18deg'}],
      opacity: drop.opacity * Math.min(1, p * 6) * Math.min(1, (1 - p) * 6),
    };
  });

  return (
    <Animated.View
      style={[styles.rainDrop, {height: drop.size * 6}, style]}
    />
  );
}

function Snow({
  drop,
  clock,
  width,
  height,
}: {
  drop: Drop;
  clock: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const p = (clock.value * drop.speed + drop.offset) % 1;
    const y = height * p - 20;
    const sway =
      Math.sin(clock.value * drop.swayFreq * 6 + drop.swayPhase) *
      drop.swayAmp;
    const x = width * drop.x + sway;
    return {
      transform: [{translateX: x}, {translateY: y}],
      opacity: drop.opacity * Math.min(1, p * 6) * Math.min(1, (1 - p) * 6),
    };
  });

  return (
    <Animated.View
      style={[
        styles.snowFlake,
        {width: drop.size, height: drop.size, borderRadius: drop.size / 2},
        style,
      ]}
    />
  );
}

/**
 * Rain or snow, driven by the live weather condition. Off unless
 * settings.weatherEffects is on AND a live API fetch has resolved a code —
 * no manual/guessed condition to fall back to.
 */
export default function WeatherEffects({weather}: {weather: Weather | null}) {
  const {settings} = useSettings();
  const {width, height} = useWindowDimensions();
  const clock = useSharedValue(0);

  const kind = settings.weatherEffects && weather ? kindForCode(weather.code) : null;
  const duration = kind === 'snow' ? 6000 : 1400;

  useEffect(() => {
    if (!kind) return;
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, {duration, easing: Easing.linear}),
      -1,
      false,
    );
  }, [kind, duration, clock]);

  const count = kind ? COUNTS[kind] : 0;
  const drops = useMemo<Drop[]>(
    () =>
      Array.from({length: count}).map(() => ({
        x: Math.random(),
        size: 2 + Math.random() * 3,
        speed: 0.7 + Math.random() * 0.8,
        offset: Math.random(),
        swayAmp: 10 + Math.random() * 20,
        swayFreq: 0.5 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        opacity: kind === 'snow' ? 0.5 + Math.random() * 0.4 : 0.25 + Math.random() * 0.3,
      })),
    [count, kind],
  );

  if (!kind) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {drops.map((drop, i) =>
        kind === 'rain' ? (
          <Rain key={i} drop={drop} clock={clock} width={width} height={height} />
        ) : (
          <Snow key={i} drop={drop} clock={clock} width={width} height={height} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rainDrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(190,216,235,0.75)',
  },
  snowFlake: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#ffffff',
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },
});
