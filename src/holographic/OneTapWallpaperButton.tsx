import React, {useEffect} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import AppText from './AppText';

type Props = {
  /** Distance from the screen bottom, so it clears the app-drawer handle. */
  bottom: number;
  onPress: () => void;
  onDismiss: () => void;
};

/** "Set wallpaper" wrapped in LRI…PDI (U+2066/U+2069), so the English label
 * stays one left-to-right run instead of reordering the Persian around it. */
export const SET_WALLPAPER_LABEL = '⁦Set wallpaper⁩';

/**
 * First-launch call to action: a pulsing «زنده» badge over the moving scene
 * (the real preview) and one big button that captures it and goes straight
 * to Android's "set live wallpaper" screen, with a single line telling the
 * user what to tap there — Android itself requires that one confirmation. Everything else (settings, gallery)
 * is optional — this is the one step a new user should take.
 *
 * Sits on a transparent-to-dark gradient so the button and the line under it
 * stay readable over any photo, however busy.
 */
export default function OneTapWallpaperButton({bottom, onPress, onDismiss}: Props) {
  // Pulsing «زنده» dot — the scene behind is the actual animated preview
  // (HolographicHome turns on the touch ripple and drops demo ripples).
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {duration: 1100, easing: Easing.inOut(Easing.sin)}),
      -1,
      true,
    );
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
    transform: [{scale: 0.8 + pulse.value * 0.4}],
  }));

  return (
    <View style={[styles.wrap, {paddingBottom: bottom}]} pointerEvents="box-none">
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="oneTapFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.45" stopColor="#000" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#oneTapFade)" />
      </Svg>

      <View style={styles.liveRow}>
        <Animated.View style={[styles.liveDot, dotStyle]} />
        <AppText style={styles.liveLabel}>والپیپر زنده</AppText>
      </View>
      <AppText style={styles.caption}>
        با لمس، روی عکس موج می‌افته. همین الان صفحه رو لمس کن!
      </AppText>

      <Pressable
        style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onPress}
        accessibilityRole="button">
        <AppText style={styles.buttonText}>✨ همین رو زنده بذار روی گوشیم</AppText>
      </Pressable>
      <AppText style={styles.hint}>
        در صفحه بعد، {SET_WALLPAPER_LABEL} را بزنید
      </AppText>
      <Pressable
        style={styles.later}
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button">
        <AppText style={styles.laterText}>بعداً</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 72,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 380,
  },
  liveRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.6)',
  },
  liveDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: '#f87171'},
  liveLabel: {color: '#ffffff', fontSize: 14, fontWeight: '700', writingDirection: 'rtl'},
  caption: {
    marginTop: 10,
    marginBottom: 16,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  button: {
    alignSelf: 'stretch',
    minHeight: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#8b5cf6',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 0},
    elevation: 10,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{scale: 0.98}],
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  hint: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  later: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  laterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
  },
});
