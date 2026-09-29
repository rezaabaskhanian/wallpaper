import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import AppText from './AppText';

type Props = {
  /** Distance from the screen bottom, so it clears the app-drawer handle. */
  bottom: number;
  onPress: () => void;
  onDismiss: () => void;
};

/**
 * First-launch call to action: one big button that captures the current scene
 * and goes straight to Android's "set live wallpaper" screen, with a single
 * line telling the user what to tap there. Everything else (settings, gallery)
 * is optional — this is the one step a new user should take.
 */
export default function OneTapWallpaperButton({bottom, onPress, onDismiss}: Props) {
  return (
    <View style={[styles.wrap, {bottom}]} pointerEvents="box-none">
      <Pressable
        style={styles.dismiss}
        onPress={onDismiss}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="بستن">
        <AppText style={styles.dismissText}>✕</AppText>
      </Pressable>
      <Pressable
        style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onPress}
        accessibilityRole="button">
        <AppText style={styles.buttonText}>✨ این را والپیپر گوشیم کن</AppText>
      </Pressable>
      <AppText style={styles.hint}>در صفحه بعد، Set wallpaper را بزنید</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 380,
  },
  dismiss: {
    alignSelf: 'flex-start',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 11, 40, 0.7)',
    marginBottom: 8,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
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
    marginTop: 10,
    color: '#eafffb',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
  },
});
