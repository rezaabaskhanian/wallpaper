import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import AppText from './AppText';
import AngelWings from './AngelWings';

type Props = {
  size: number;
  colors: [string, string];
  label?: string;
  image?: ImageSourcePropType;
  /** Glow ring color. */
  glow?: string;
  ringWidth?: number;
  /** 'orb' (default): plain glowing circle. 'angel': adds small wings behind
   * the circle, so the portrait reads as a little angel's face. */
  shape?: 'orb' | 'angel';
};

/**
 * Circular avatar with a glowing ring. Renders a real portrait when `image`
 * is provided, otherwise a two-tone placeholder disc.
 */
export default function Avatar({
  size,
  colors,
  label,
  image,
  glow = 'rgba(64, 224, 208, 0.9)',
  ringWidth = 2,
  shape = 'orb',
}: Props) {
  const face = (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: glow,
          borderWidth: ringWidth,
          shadowColor: glow,
          shadowRadius: size * 0.28,
        },
      ]}>
      {image ? (
        <Image
          source={image}
          style={{width: size, height: size, borderRadius: size / 2}}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {backgroundColor: colors[1], borderRadius: size / 2},
          ]}>
          <View
            style={[
              styles.topTone,
              {backgroundColor: colors[0], borderRadius: size / 2},
            ]}
          />
          {label ? (
            <AppText style={[styles.label, {fontSize: size * 0.26}]}>
              {label}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );

  if (shape !== 'angel') {
    return face;
  }

  return (
    <View style={{width: size, height: size}}>
      <AngelWings size={size} glow={glow} />
      {face}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.9,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },
  topTone: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    height: '58%',
    opacity: 0.85,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '18%',
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
