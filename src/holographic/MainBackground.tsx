import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import {
  AppState,
  ImageBackground,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
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
import WaterRippleLayer, {type WaterRippleHandle} from './WaterRippleLayer';

/**
 * The full-screen background photo behind the orbiting avatars.
 *
 * Honours the current selection: a photo picked from the gallery or the device
 * ('custom' + customBackgroundUri), or the bundled image of the selected
 * background. IDs with no photo of their own (e.g. 'black') render nothing
 * here on purpose, falling through to the root view's solid black fill.
 *
 * A custom background from the app's own wallpaper gallery is a remote URL
 * and is loaded straight from it — the native image loader keeps its own disk
 * cache, so it still shows offline. It must NOT go through imageCache.ts's
 * base64 data uris: a full-size wallpaper as a multi-MB data uri fails to
 * decode on Android and the screen just goes black.
 */
const MainBackground = forwardRef<WaterRippleHandle>((_props, ref) => {
  const {settings} = useSettings();
  const {livingWallpaper, wallpaperShake, waterRipple} = settings;
  const {width, height} = useWindowDimensions();

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const shakeRot = useSharedValue(0);

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

  // Low-amplitude tremble layered on the drift above. Each axis runs on its
  // own period so the three never line up into an obvious back-and-forth, and
  // the amplitude stays inside the Ken-Burns overscan so no edge is exposed.
  useEffect(() => {
    const trembling = livingWallpaper && wallpaperShake;
    if (!trembling) {
      cancelAnimation(shakeX);
      cancelAnimation(shakeY);
      cancelAnimation(shakeRot);
      shakeX.value = withTiming(0, {duration: 400});
      shakeY.value = withTiming(0, {duration: 400});
      shakeRot.value = withTiming(0, {duration: 400});
      return;
    }

    const tremble = (sv: typeof shakeX, amp: number, duration: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(amp, {duration, easing: Easing.inOut(Easing.sin)}),
          withTiming(-amp, {duration, easing: Easing.inOut(Easing.sin)}),
        ),
        -1,
        true,
      );
    };
    tremble(shakeX, 1.6, 130);
    tremble(shakeY, 1.2, 170);
    tremble(shakeRot, 0.14, 210);

    return () => {
      cancelAnimation(shakeX);
      cancelAnimation(shakeY);
      cancelAnimation(shakeRot);
    };
  }, [livingWallpaper, wallpaperShake, shakeX, shakeY, shakeRot]);

  const livingStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: scale.value},
      {translateX: tx.value + shakeX.value},
      {translateY: ty.value + shakeY.value},
      {rotateZ: `${shakeRot.value}deg`},
    ],
  }));

  // The tap gesture lives on the whole scene (HolographicHome), so its point
  // is in untransformed screen space while the ripple canvas sits *inside*
  // the Ken-Burns transform — undo that transform here so the ripple starts
  // exactly under the finger. Matches the transform list above: a point maps
  // to screen as s * (local + t) about the centre.
  const rippleRef = useRef<WaterRippleHandle>(null);
  useImperativeHandle(
    ref,
    () => ({
      addDrop: (x: number, y: number) => {
        const s = scale.value || 1;
        const cx = width / 2;
        const cy = height / 2;
        rippleRef.current?.addDrop(
          (x - cx) / s - (tx.value + shakeX.value) + cx,
          (y - cy) / s - (ty.value + shakeY.value) + cy,
        );
      },
    }),
    [scale, tx, ty, shakeX, shakeY, width, height],
  );

  const customUri = settings.customBackgroundUri;

  const bundled = BACKGROUNDS.find(b => b.id === settings.backgroundId);

  const source =
    settings.backgroundId === 'custom'
      ? customUri
        ? {uri: customUri}
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
  // The ripple canvas is a sibling inside the same animated wrapper so it
  // inherits an identical transform — drawn on its own it would otherwise
  // show an un-zoomed copy of the photo over the drifting one.
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        livingWallpaper ? livingStyle : null,
      ]}>
      <ImageBackground
        // Remount on source change so a newly picked photo replaces the old
        // one instead of being served from the previous decode.
        key={typeof source === 'number' ? `bundled-${source}` : source.uri}
        source={source}
        // Downsample on decode: gallery wallpapers can be far larger than the
        // screen, and a full-resolution bitmap is too big for Android to draw.
        resizeMethod="resize"
        style={[
          StyleSheet.absoluteFill,
          fit === 'contain' && bundled?.letterboxColor
            ? {backgroundColor: bundled.letterboxColor}
            : null,
        ]}
        resizeMode={fit}
      />
      {waterRipple ? (
        <WaterRippleLayer
          ref={rippleRef}
          source={source}
          width={width}
          height={height}
          fit={fit}
        />
      ) : null}
    </Animated.View>
  );
});

export default MainBackground;
