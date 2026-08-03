import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import Avatar from './Avatar';
import {useHero} from './data';
import {useSettings} from './SettingsContext';

type Props = {
  centerX: number;
  centerY: number;
  /** Smaller screen side; the orb is sized from this. */
  minSide: number;
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
};

/**
 * The central leader portrait rendered as one big glowing orb in the middle of
 * the sphere, matching the smaller orbiting avatars but larger.
 */
export default function CenterPortrait({
  centerX,
  centerY,
  minSide,
  parallaxX,
  parallaxY,
}: Props) {
  const {settings} = useSettings();
  const hero = useHero();
  const size = minSide * 0.5;

  const style = useAnimatedStyle(() => ({
    transform: [
      {translateX: parallaxX.value * 0.6},
      {translateY: parallaxY.value * 0.6},
    ],
  }));

  if (!hero.image) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          left: centerX - size / 2,
          top: centerY - size / 2,
        },
        style,
      ]}>
      <Avatar
        size={size}
        colors={hero.colors}
        image={hero.image}
        glow={settings.glowColor}
        ringWidth={0}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 50,
  },
});
