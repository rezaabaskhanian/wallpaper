import React, {useEffect, useState} from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AppText from './AppText';

/**
 * How often a new pass starts. Each pass' own flight duration is a bit
 * shorter than this, so the object spends the rest of the interval parked
 * off-screen before the next one begins.
 */
const CYCLE_MS = 8000;

type Kind = 'missile' | 'drone';

type FlightProfile = {
  kind: Kind;
  /** Name printed along the missile body; unused for drones. */
  label: string;
  /** Start/end as fractions of screen width/height; values outside 0..1 sit
   * off-screen so the object visibly enters and exits the frame. */
  from: {x: number; y: number};
  to: {x: number; y: number};
  durationMs: number;
};

// Order alternates missile/drone, with the missile itself alternating
// between two named variants — "یک بار خیبرشکن، بار بعد شاهد یا سجیل".
const PROFILES: FlightProfile[] = [
  {
    kind: 'missile',
    label: 'خیبر شکن',
    from: {x: -0.35, y: -0.3},
    to: {x: 1.35, y: 1.3},
    durationMs: 6400,
  },
  {
    kind: 'drone',
    label: 'شاهد',
    from: {x: -0.4, y: 0.36},
    to: {x: 1.4, y: 0.58},
    durationMs: 7200,
  },
  {
    kind: 'missile',
    label: 'سجیل',
    from: {x: 1.35, y: -0.3},
    to: {x: -0.35, y: 1.3},
    durationMs: 6600,
  },
  {
    kind: 'drone',
    label: 'شاهد',
    from: {x: 1.4, y: 0.62},
    to: {x: -0.4, y: 0.4},
    durationMs: 7200,
  },
];

const MISSILE_W = 70;
const MISSILE_H = 210;
const DRONE_W = 210;
const DRONE_H = 170;

/**
 * Missile body modeled on the reference photo: a cream fuselage with a black
 * nose tip, small red canard fins near the front, a red tail-fin assembly at
 * the back, and the missile's name printed along the shaft.
 */
function MissileShape({label}: {label: string}) {
  return (
    <View style={styles.missileWrap}>
      <View style={styles.missileNose} />
      <View style={styles.missileBody}>
        <View style={styles.missileLabelWrap}>
          <AppText style={styles.missileLabel}>{label}</AppText>
        </View>
      </View>
      <View style={[styles.canard, styles.canardLeft]} />
      <View style={[styles.canard, styles.canardRight]} />
      <View style={[styles.tailFin, styles.tailFinLeft]} />
      <View style={[styles.tailFin, styles.tailFinRight]} />
      <View style={styles.tailCap} />
    </View>
  );
}

/**
 * Drone body modeled on the reference photo: a cream delta flying-wing with
 * a nose spike, a center engine pod + propeller hub, and angled tail fins.
 */
function DroneShape() {
  return (
    <View style={styles.droneWrap}>
      <View style={styles.droneNose} />
      <View style={styles.droneWing} />
      <View style={[styles.droneTailFin, styles.droneTailFinLeft]} />
      <View style={[styles.droneTailFin, styles.droneTailFinRight]} />
      <View style={styles.droneEnginePod} />
      <View style={styles.dronePropHub} />
    </View>
  );
}

/**
 * Full-screen decorative layer: every CYCLE_MS a missile or drone silhouette
 * flies across the screen from one corner to the opposite one. Meant to
 * replace the fog + bottom emblem when "combat mode" is on (see
 * HolographicHome, gated on settings.combatMode).
 */
export default function ProjectileLayer() {
  const {width, height} = useWindowDimensions();
  const [passIndex, setPassIndex] = useState(0);
  const progress = useSharedValue(0);

  const profile = PROFILES[passIndex % PROFILES.length];

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: profile.durationMs,
      easing: Easing.linear,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passIndex]);

  useEffect(() => {
    const id = setInterval(() => {
      setPassIndex(i => i + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const fromX = profile.from.x * width;
  const fromY = profile.from.y * height;
  const toX = profile.to.x * width;
  const toY = profile.to.y * height;
  const angleDeg =
    (Math.atan2(toX - fromX, -(toY - fromY)) * 180) / Math.PI;
  const isDrone = profile.kind === 'drone';
  const boxW = isDrone ? DRONE_W : MISSILE_W;
  const boxH = isDrone ? DRONE_H : MISSILE_H;

  const bodyStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const x = fromX + (toX - fromX) * t;
    const wobble = isDrone ? Math.sin(t * Math.PI * 6) * 6 : 0;
    const y = fromY + (toY - fromY) * t + wobble;
    return {
      transform: [
        {translateX: x},
        {translateY: y},
        {rotate: `${angleDeg}deg`},
      ],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.body,
          {width: boxW, height: boxH, left: -boxW / 2, top: -boxH / 2},
          bodyStyle,
        ]}>
        {isDrone ? <DroneShape /> : <MissileShape label={profile.label} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 260,
  },

  // --- Missile (خیبرشکن / سجیل) ---
  missileWrap: {
    alignItems: 'center',
  },
  missileNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#151312',
  },
  missileBody: {
    width: 18,
    height: 150,
    borderRadius: 4,
    backgroundColor: '#e9dfc2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  missileLabelWrap: {
    width: 140,
    alignItems: 'center',
    transform: [{rotate: '90deg'}],
  },
  missileLabel: {
    color: '#3a2a1a',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  canard: {
    position: 'absolute',
    top: 48,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  canardLeft: {
    left: -3,
    borderRightWidth: 12,
    borderRightColor: '#b5342a',
  },
  canardRight: {
    right: -3,
    borderLeftWidth: 12,
    borderLeftColor: '#b5342a',
  },
  tailFin: {
    position: 'absolute',
    bottom: 14,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tailFinLeft: {
    left: -13,
    borderRightWidth: 16,
    borderRightColor: '#b5342a',
  },
  tailFinRight: {
    right: -13,
    borderLeftWidth: 16,
    borderLeftColor: '#b5342a',
  },
  tailCap: {
    width: 12,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#151312',
  },

  // --- Drone (شاهد) ---
  droneWrap: {
    alignItems: 'center',
  },
  droneNose: {
    width: 8,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#e7e0cb',
  },
  droneWing: {
    width: 0,
    height: 0,
    marginTop: -4,
    borderLeftWidth: DRONE_W / 2,
    borderRightWidth: DRONE_W / 2,
    borderBottomWidth: 108,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#e7e0cb',
  },
  droneTailFin: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 26,
    borderRadius: 2,
    backgroundColor: '#2a2c26',
  },
  droneTailFinLeft: {
    left: 14,
    transform: [{rotate: '-24deg'}],
  },
  droneTailFinRight: {
    right: 14,
    transform: [{rotate: '24deg'}],
  },
  droneEnginePod: {
    position: 'absolute',
    bottom: 44,
    width: 20,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#3a3d36',
  },
  dronePropHub: {
    position: 'absolute',
    bottom: 40,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8a8d84',
  },
});
