import React from 'react';
import {Image, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import {BACKGROUNDS} from './config';
import {useSettings} from './SettingsContext';

type Props = {
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
};

/**
 * Full-screen background image shown in place of the old center portrait.
 * Renders nothing if no image is configured (topographic bg stays visible).
 */
export default function WallpaperBackground({parallaxX, parallaxY}: Props) {
  const {settings} = useSettings();
  // 'custom' → a photo picked from the gallery; otherwise a bundled background.
  const source =
    settings.backgroundId === 'custom'
      ? settings.customBackgroundUri
        ? {uri: settings.customBackgroundUri}
        : undefined
      : BACKGROUNDS.find(b => b.id === settings.backgroundId)?.source;

  const style = useAnimatedStyle(() => ({
    transform: [
      // Very subtle parallax so the photo drifts opposite the rings.
      {translateX: -parallaxX.value * 0.5},
      {translateY: -parallaxY.value * 0.5},
      {scale: 1.08}, // slight overscan so parallax never shows edges
    ],
  }));

  if (!source) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/* Darkening scrim so the orbiting avatars stay readable over the photo. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(2, 10, 10, 0.45)',
  },
});
