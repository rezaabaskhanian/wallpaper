import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import Avatar from './Avatar';
import {ORBIT_ITEMS} from './data';
import {RINGS} from './config';
import {useSettings} from './SettingsContext';

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
  minSide: number;
  centerX: number;
  centerY: number;
  orbit: SharedValue<number>;
  manualRotation: SharedValue<number>;
  parallaxX: SharedValue<number>;
  parallaxY: SharedValue<number>;
  onSelectMartyr?: (martyrId: string) => void;
};

function OrbitAvatar({
  point,
  sphereRadius,
  axis,
  glow,
  minSide,
  centerX,
  centerY,
  orbit,
  manualRotation,
  parallaxX,
  parallaxY,
  onSelectMartyr,
}: OrbitAvatarProps) {
  const item = ORBIT_ITEMS[point.itemIndex % ORBIT_ITEMS.length];
  const size = point.sizeFactor * minSide;

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
        {translateX: x + parallaxX.value * 2},
        {translateY: y + parallaxY.value * 2},
        {scale},
      ],
      opacity: 0.35 + depth * 0.65,
      zIndex: Math.round(depth * 100),
    };
  });

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
          image={item.image}
          glow={glow}
          ringWidth={0}
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
  onSelectMartyr,
}: Props) {
  const {settings} = useSettings();
  const rings = RINGS.slice(0, Math.max(1, settings.ringCount));

  // Orb count is set directly by the user; density no longer tied to rings.
  const totalCount = Math.max(1, settings.ballCount);
  // Sphere radius follows the outermost active ring; avatar size averages them.
  const sphereRadiusFactor = Math.max(...rings.map(r => r.radiusFactor));
  const sizeFactor =
    rings.reduce((sum, r) => sum + r.sizeFactor, 0) / rings.length;
  const sphereRadius = sphereRadiusFactor * minSide;
  const axis = settings.rotationAxis === 'x' ? 0 : settings.rotationAxis === 'z' ? 2 : 1;

  const points = React.useMemo(
    () => buildSphere(totalCount, sizeFactor),
    [totalCount, sizeFactor],
  );

  if (!settings.showOrbs) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {points.map(point => (
        <OrbitAvatar
          key={point.itemIndex}
          point={point}
          sphereRadius={sphereRadius}
          axis={axis}
          glow={settings.glowColor}
          minSide={minSide}
          centerX={centerX}
          centerY={centerY}
          orbit={orbit}
          manualRotation={manualRotation}
          parallaxX={parallaxX}
          parallaxY={parallaxY}
          onSelectMartyr={onSelectMartyr}
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
