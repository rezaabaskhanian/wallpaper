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

type Props = {
  /** 0 = hidden (day) .. 1 = full brightness (deep night). */
  intensity: number;
};

const STAR_COUNT = 46;

type Star = {
  x: number; // %
  y: number; // %
  size: number;
  phase: number;
  base: number;
};

function StarDot({
  star,
  clock,
  intensity,
}: {
  star: Star;
  clock: SharedValue<number>;
  intensity: number;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((clock.value + star.phase) * Math.PI * 2));
    return {opacity: intensity * star.base * twinkle};
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
        },
        style,
      ]}
    />
  );
}

/** A soft field of twinkling stars, shown over the sky at night. */
export default function StarField({intensity}: Props) {
  const {width, height} = useWindowDimensions();
  const clock = useSharedValue(0);

  const stars = useMemo<Star[]>(
    () =>
      Array.from({length: STAR_COUNT}).map(() => ({
        x: Math.random() * 100,
        y: Math.random() * 62, // keep to the upper sky, away from the road/text
        size: 1 + Math.random() * 2.2,
        phase: Math.random(),
        base: 0.5 + Math.random() * 0.5,
      })),
    // Regenerate only if the screen size changes meaningfully.
    [width, height],
  );

  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, {duration: 3500, easing: Easing.linear}),
      -1,
      false,
    );
  }, [clock]);

  if (intensity <= 0.01) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((star, i) => (
        <StarDot key={i} star={star} clock={clock} intensity={intensity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    backgroundColor: '#fffbe6',
    shadowColor: '#fff7d6',
    shadowOpacity: 0.9,
    shadowRadius: 2,
  },
});
