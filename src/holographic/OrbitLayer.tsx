import React, {useEffect} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import Avatar from './Avatar';
import {useOrbitItems, type OrbitItem} from './data';
import {RINGS} from './config';
import {useSettings} from './SettingsContext';
import {useStore} from './store/StoreContext';
import {useCachedImage, useImagesReady} from './imageCache';

type Props = {
  centerX: number;
  centerY: number;
  /** Smaller screen side; radii/sizes are fractions of this. */
  minSide: number;
  /** Accumulated auto-orbit angle in radians. */
  orbit: SharedValue<number>;
  /** Extra radians added by the user's drag gesture. */
  manualRotation: SharedValue<number>;
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
  /** Extra offset from the device gyroscope (0 when disabled), added on top
   * of the drag-driven parallax above. */
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  /** Called with a martyr id when its icon is tapped. */
  onSelectMartyr?: (martyrId: string) => void;
};

/** Precomputed position of one avatar on the unit sphere. */
type SpherePoint = {
  itemIndex: number;
  /** Base coordinates on the unit sphere (before rotation). */
  x0: number;
  y0: number;
  z0: number;
  /** Avatar size as a fraction of minSide. */
  sizeFactor: number;
};

/** Golden angle — spreads points evenly around the sphere. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Distribute `count` points evenly over the surface of a unit sphere using the
 * Fibonacci-sphere method, so avatars wrap the whole ball instead of sitting on
 * flat concentric rings.
 */
function buildSphere(count: number, sizeFactor: number): SpherePoint[] {
  const points: SpherePoint[] = [];
  for (let i = 0; i < count; i++) {
    // y goes 1 → -1 (top pole → bottom pole).
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    points.push({
      itemIndex: i,
      x0: Math.cos(theta) * ringRadius,
      y0: y,
      z0: Math.sin(theta) * ringRadius,
      sizeFactor,
    });
  }
  return points;
}

type OrbitAvatarProps = {
  point: SpherePoint;
  sphereRadius: number;
  /** 0 = x axis, 1 = y axis, 2 = z axis. */
  axis: number;
  /** Glow/accent colour for the avatar ring. */
  glow: string;
  /** 'orb' or 'angel' — see Avatar's `shape` prop. */
  shape: 'orb' | 'angel';
  /** 'steady' or 'flicker' — see SettingsContext's `orbVisibility`. */
  visibility: 'steady' | 'flicker';
  minSide: number;
  centerX: number;
  centerY: number;
  orbit: SharedValue<number>;
  manualRotation: SharedValue<number>;
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  onSelectMartyr?: (martyrId: string) => void;
  items: OrbitItem[];
};

function OrbitAvatar({
  point,
  sphereRadius,
  axis,
  glow,
  shape,
  visibility,
  minSide,
  centerX,
  centerY,
  orbit,
  manualRotation,
  parallaxX,
  parallaxY,
  tiltX,
  tiltY,
  onSelectMartyr,
  items,
}: OrbitAvatarProps) {
  const item = items[point.itemIndex % items.length];
  const size = point.sizeFactor * minSide;

  // Real martyr photos are remote — wait for the cached/downloaded copy
  // before showing this orb at all, so nothing pops in as a blank/broken
  // circle. Items with no photo (placeholders) have nothing to wait for.
  const remoteUri =
    item.image && typeof item.image === 'object' && 'uri' in item.image
      ? (item.image as {uri: string}).uri
      : undefined;
  const cachedImage = useCachedImage(remoteUri);
  const displayImage = remoteUri
    ? cachedImage.uri
      ? {uri: cachedImage.uri}
      : undefined
    : item.image;
  const imageReady = remoteUri ? cachedImage.ready : true;

  // 'flicker' mode: each orb fades to hidden and back on its own randomized
  // loop, so orbs disappear/reappear independently instead of all together.
  // Durations/delays are randomized once per orb (stable for its lifetime)
  // rather than re-randomized every cycle — Reanimated worklets can't call
  // Math.random() mid-animation, so this is generated up front in JS.
  const flickerVisible = useSharedValue(1);
  useEffect(() => {
    if (visibility !== 'flicker') {
      flickerVisible.value = withTiming(1, {duration: 300});
      return;
    }
    const initialDelay = Math.random() * 3000;
    const hideAfter = 2000 + Math.random() * 3500;
    const hideDuration = 500 + Math.random() * 700;
    const hiddenFor = 900 + Math.random() * 2200;
    const showDuration = 500 + Math.random() * 700;
    flickerVisible.value = withDelay(
      initialDelay,
      withRepeat(
        withSequence(
          withDelay(hideAfter, withTiming(0, {duration: hideDuration, easing: Easing.inOut(Easing.quad)})),
          withDelay(hiddenFor, withTiming(1, {duration: showDuration, easing: Easing.inOut(Easing.quad)})),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(flickerVisible);
    };
  }, [visibility, flickerVisible]);

  const style = useAnimatedStyle(() => {
    'worklet';
    // Whole sphere spins around the chosen axis; drag adds to it.
    const spin = orbit.value + manualRotation.value;
    const cos = Math.cos(spin);
    const sin = Math.sin(spin);

    // Projected coords (screenX right, screenY up) + depth (-1 back .. +1 front).
    let px: number;
    let py: number;
    let pd: number;
    if (axis === 0) {
      // Rotate around X: top/bottom tumbling.
      px = point.x0;
      py = point.y0 * cos - point.z0 * sin;
      pd = point.y0 * sin + point.z0 * cos;
    } else if (axis === 2) {
      // Rotate around Z: flat in-plane spin (depth stays put).
      px = point.x0 * cos - point.y0 * sin;
      py = point.x0 * sin + point.y0 * cos;
      pd = point.z0;
    } else {
      // Rotate around Y (default): left/right turntable.
      px = point.x0 * cos - point.z0 * sin;
      py = point.y0;
      pd = point.x0 * sin + point.z0 * cos;
    }

    // Orthographic projection onto the screen (Y up → screen Y down).
    const x = centerX + sphereRadius * px - size / 2;
    const y = centerY - sphereRadius * py - size / 2;

    // pd: -1 back .. +1 front. Front points are bigger, brighter, on top.
    const depth = (pd + 1) / 2;
    const scale = 0.5 + depth * 0.55;
    return {
      transform: [
        {translateX: x + parallaxX.value * 2 + tiltX.value * 1.4},
        {translateY: y + parallaxY.value * 2 + tiltY.value * 1.4},
        {scale},
      ],
      opacity: (0.35 + depth * 0.65) * flickerVisible.value,
      zIndex: Math.round(depth * 100),
    };
  });

  if (!imageReady) {
    return null;
  }

  const martyrId = item.martyrId;
  const handlePress =
    onSelectMartyr && martyrId ? () => onSelectMartyr(martyrId) : undefined;

  return (
    <Animated.View style={[styles.item, style]}>
      <Pressable onPress={handlePress} disabled={!handlePress} hitSlop={6}>
        <Avatar
          size={size}
          colors={item.colors}
          label={item.label}
          image={displayImage}
          glow={glow}
          ringWidth={0}
          shape={shape}
        />
      </Pressable>
    </Animated.View>
  );
}

export default function OrbitLayer({
  centerX,
  centerY,
  minSide,
  orbit,
  manualRotation,
  parallaxX,
  parallaxY,
  tiltX,
  tiltY,
  onSelectMartyr,
}: Props) {
  const {settings} = useSettings();
  const {martyrs} = useStore();
  const items = useOrbitItems();
  const rings = RINGS.slice(0, Math.max(1, settings.ringCount));

  // Nothing renders — not even placeholder discs — until the real martyr
  // list has loaded from the backend AND every item's photo is downloaded
  // and cached. Avoids ever flashing the numbered fallback tiles or orbs
  // popping in one by one; the screen simply shows no orbs until it can
  // show the real ones, all at once.
  const martyrsLoaded = martyrs.length > 0;
  const photoUrls = React.useMemo(
    () =>
      items
        .map(item =>
          item.image && typeof item.image === 'object' && 'uri' in item.image
            ? (item.image as {uri: string}).uri
            : undefined,
        )
        .filter((u): u is string => !!u),
    [items],
  );
  const allImagesReady = useImagesReady(photoUrls);

  // Orb count follows the (already ballCount-capped, possibly
  // random-sampled) item list from useOrbitItems — see its docs for why this
  // can be smaller than settings.ballCount for small categories.
  const totalCount = Math.max(1, items.length);
  // Sphere radius follows the outermost active ring; avatar size averages them.
  const sphereRadiusFactor = Math.max(...rings.map(r => r.radiusFactor));
  const sizeFactor =
    rings.reduce((sum, r) => sum + r.sizeFactor, 0) / rings.length;
  const sphereRadius = sphereRadiusFactor * minSide;
  const globalAxis =
    settings.rotationAxis === 'x' ? 0 : settings.rotationAxis === 'z' ? 2 : 1;
  const mixedAxis = settings.rotationAxis === 'mixed';

  const points = React.useMemo(
    () => buildSphere(totalCount, sizeFactor),
    [totalCount, sizeFactor],
  );

  if (!settings.showOrbs || !martyrsLoaded || !allImagesReady) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {points.map(point => (
        <OrbitAvatar
          key={point.itemIndex}
          point={point}
          sphereRadius={sphereRadius}
          axis={mixedAxis ? point.itemIndex % 3 : globalAxis}
          glow={settings.glowColor}
          shape={settings.orbShape}
          visibility={settings.orbVisibility}
          minSide={minSide}
          centerX={centerX}
          centerY={centerY}
          orbit={orbit}
          manualRotation={manualRotation}
          parallaxX={parallaxX}
          parallaxY={parallaxY}
          tiltX={tiltX}
          tiltY={tiltY}
          onSelectMartyr={onSelectMartyr}
          items={items}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    top: -20,
    left: 0,
  },
});
