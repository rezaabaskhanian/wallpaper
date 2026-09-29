import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
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
 * First-launch call to action: one big button that captures the current scene
 * and goes straight to Android's "set live wallpaper" screen, with a single
 * line telling the user what to tap there. Everything else (settings, gallery)
 * is optional — this is the one step a new user should take.
 *
 * Sits on a transparent-to-dark gradient so the button and the line under it
 * stay readable over any photo, however busy.
 */
export default function OneTapWallpaperButton({bottom, onPress, onDismiss}: Props) {
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

      <Pressable
        style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onPress}
        accessibilityRole="button">
        <AppText style={styles.buttonText}>✨ این را والپیپر گوشیم کن</AppText>
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
