import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import AppText from './AppText';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Avatar from './Avatar';
import {HERO} from './data';

type Props = {
  centerX: number;
  centerY: number;
  size: number;
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
};

export default function HeroCenter({
  centerX,
  centerY,
  size,
  parallaxX,
  parallaxY,
}: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {duration: 2600, easing: Easing.inOut(Easing.ease)}),
      -1,
      true,
    );
  }, [pulse]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: parallaxX.value * 0.6},
      {translateY: parallaxY.value * 0.6},
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{scale: 1 + pulse.value * 0.12}],
    opacity: 0.45 + pulse.value * 0.4,
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          left: centerX - size / 2,
          top: centerY - size / 2 - size * 0.35,
          width: size,
        },
        containerStyle,
      ]}>
      <View style={styles.avatarWrap}>
        <Animated.View
          style={[
            styles.glow,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: size * 0.75,
            },
            glowStyle,
          ]}
        />
        <Avatar
          size={size}
          colors={HERO.colors}
          image={HERO.image}
          glow="rgba(212, 175, 55, 0.95)"
          ringWidth={3}
        />
      </View>
      <AppText style={styles.slogan}>{HERO.slogan}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 200,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(212, 175, 55, 0.35)',
  },
  slogan: {
    marginTop: 18,
    color: '#f5e6b3',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(212,175,55,0.6)',
    textShadowRadius: 12,
    writingDirection: 'rtl',
  },
});
