import React, {useEffect} from 'react';
import {AppState, ImageBackground, StyleSheet} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {BACKGROUNDS} from './config';
import {useSettings} from './SettingsContext';
import {useCachedImage} from './imageCache';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

/** True for a remote http(s) URL (a wallpaper picked from the app's own
 * gallery); false for a local device photo (content://, file://, ph://…)
 * picked straight from the phone's gallery, which needs no caching. */
const isRemoteUrl = (uri: string) => /^https?:\/\//i.test(uri);

/**
 * The full-screen background photo behind the orbiting avatars.
 *
 * Honours the current selection: a photo picked from the gallery or the device
 * ('custom' + customBackgroundUri), or the bundled image of the selected
 * background. IDs with no photo of their own (e.g. 'black') render nothing
 * here on purpose, falling through to the root view's solid black fill.
 *
 * A custom background from the app's own wallpaper gallery is a remote URL,
 * so it's routed through the same download+cache used for orbit avatar
 * photos (see imageCache.ts) — otherwise it'd vanish the moment the device
 * goes offline. A photo picked straight from the phone's gallery is already
 * a local file and is used as-is.
 */
export default function MainBackground() {
  const {settings} = useSettings();
  const {livingWallpaper} = settings;

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    if (!livingWallpaper) {
      cancelAnimation(scale);
      cancelAnimation(tx);
      cancelAnimation(ty);
      scale.value = withTiming(1, {duration: 600});
      tx.value = withTiming(0, {duration: 600});
      ty.value = withTiming(0, {duration: 600});
      return;
    }

    // Slow, continuous Ken-Burns drift, overscanned so the pan never shows an
    // edge. Each axis loops on its own duration/phase so the motion reads as
    // organic rather than a mechanical back-and-forth.
    const startLoop = () => {
      scale.value = withSequence(
        withTiming(1.16, {duration: 900, easing: Easing.out(Easing.cubic)}),
        withRepeat(
          withSequence(
            withTiming(1.22, {duration: 9000, easing: Easing.inOut(Easing.sin)}),
            withTiming(1.1, {duration: 9000, easing: Easing.inOut(Easing.sin)}),
          ),
          -1,
          true,
        ),
      );
      tx.value = withRepeat(
        withSequence(
          withTiming(14, {duration: 11000, easing: Easing.inOut(Easing.sin)}),
          withTiming(-14, {duration: 11000, easing: Easing.inOut(Easing.sin)}),
        ),
        -1,
        true,
      );
      ty.value = withRepeat(
        withSequence(
          withTiming(-10, {duration: 13000, easing: Easing.inOut(Easing.sin)}),
          withTiming(10, {duration: 13000, easing: Easing.inOut(Easing.sin)}),
        ),
        -1,
        true,
      );
    };

    // "Wake up" the wallpaper the moment the app is opened, and again every
    // time it returns to the foreground.
    startLoop();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        startLoop();
      }
    });
    return () => {
      sub.remove();
      cancelAnimation(scale);
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
  }, [livingWallpaper, scale, tx, ty]);

  const livingStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: scale.value},
      {translateX: tx.value},
      {translateY: ty.value},
    ],
  }));

  const customUri = settings.customBackgroundUri;
  const customIsRemote = !!customUri && isRemoteUrl(customUri);
  const cachedCustom = useCachedImage(customIsRemote ? customUri : undefined);

  const bundled = BACKGROUNDS.find(b => b.id === settings.backgroundId);

  const source =
    settings.backgroundId === 'custom'
      ? customUri
        ? customIsRemote
          ? cachedCustom.uri
            ? {uri: cachedCustom.uri}
            : undefined
          : {uri: customUri}
        : undefined
      : bundled?.source;

  if (!source) {
    return null;
  }

  // A custom photo picked by the user always fills edge-to-edge like a
  // normal wallpaper; only a bundled entry can opt into 'contain'.
  const fit = settings.backgroundId === 'custom' ? 'cover' : bundled?.fit ?? 'cover';

  // ImageBackground (not a bare Image) because it sizes the inner image to
  // 100% × 100%; absolute insets alone leave it at its intrinsic pixel size.
  return (
    <AnimatedImageBackground
      // Remount on source change so a newly picked photo replaces the old one
      // instead of being served from the previous decode.
      key={typeof source === 'number' ? `bundled-${source}` : source.uri}
      source={source}
      style={[
        StyleSheet.absoluteFill,
        fit === 'contain' && bundled?.letterboxColor
          ? {backgroundColor: bundled.letterboxColor}
          : null,
        livingWallpaper ? livingStyle : null,
      ]}
      resizeMode={fit}
    />
  );
}
