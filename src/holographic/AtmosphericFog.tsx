import React, {useEffect} from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {
  Canvas,
  Group,
  Rect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {useSettings} from './SettingsContext';

/**
 * Ongoing ambient mist that drifts in from the bottom and/or top edge, plus
 * a very faint haze that gradually spreads to cover the whole screen. Stays
 * alive for as long as `fogMode` is enabled and disappears the moment it's
 * turned off in Settings.
 *
 * Everything draws inside a single Skia Canvas, with the Reanimated shared
 * values wired straight into Skia's opacity/transform props instead of
 * wrapping each band in its own Animated.View + Canvas. These loops run
 * forever while fog is on, so keeping it to one GPU surface (instead of up
 * to three) and letting Skia animate on the UI thread directly — with no
 * native-view style bridge in between — avoids the frame drops that build
 * up over time with the previous per-band Canvas approach.
 */
const FOG_COLOR_RGB = '214,232,230';
const FOG_COLOR = `rgba(${FOG_COLOR_RGB},1)`;
const FOG_TRANSPARENT = `rgba(${FOG_COLOR_RGB},0)`;

type IntensityConfig = {
  /** Fraction of screen height the edge band reaches toward the centre. */
  reachFrac: number;
  /** Peak opacity of the breathing edge band. */
  edgePeak: number;
  /** Target opacity of the full-screen haze once it has built up. */
  hazePeak: number;
};

const INTENSITY: Record<'low' | 'medium' | 'high', IntensityConfig> = {
  low: {reachFrac: 0.34, edgePeak: 0.55, hazePeak: 0.045},
  medium: {reachFrac: 0.5, edgePeak: 0.75, hazePeak: 0.08},
  high: {reachFrac: 0.66, edgePeak: 0.95, hazePeak: 0.13},
};

export default function AtmosphericFog() {
  const {settings} = useSettings();
  const {width, height} = useWindowDimensions();

  if (settings.fogMode === 'off') {
    return null;
  }

  const cfg = INTENSITY[settings.fogIntensity] ?? INTENSITY.medium;
  const showBottom = settings.fogMode === 'bottom' || settings.fogMode === 'both';
  const showTop = settings.fogMode === 'top' || settings.fogMode === 'both';
  const reach = height * cfg.reachFrac;

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Haze width={width} height={height} peak={cfg.hazePeak} />
      {showBottom ? (
        <Band
          edge="bottom"
          width={width}
          height={height}
          reach={reach}
          peak={cfg.edgePeak}
        />
      ) : null}
      {showTop ? (
        <Band
          edge="top"
          width={width}
          height={height}
          reach={reach}
          peak={cfg.edgePeak}
        />
      ) : null}
    </Canvas>
  );
}

/**
 * A flat, screen-covering fog tint that eases in from nothing up to `peak`
 * over ~10s — the mist "gradually taking over the whole space" rather than
 * appearing instantly — then holds with a very slow breathing motion.
 */
function Haze({width, height, peak}: {width: number; height: number; peak: number}) {
  const level = useSharedValue(0);

  useEffect(() => {
    level.value = withSequence(
      withTiming(peak, {duration: 10000, easing: Easing.out(Easing.cubic)}),
      withRepeat(
        withSequence(
          withTiming(peak * 1.2, {
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(peak * 0.8, {
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    );
  }, [level, peak]);

  return (
    <Group opacity={level}>
      <Rect x={0} y={0} width={width} height={height} color={FOG_COLOR} />
    </Group>
  );
}

function Band({
  edge,
  width,
  height,
  reach,
  peak,
}: {
  edge: 'top' | 'bottom';
  width: number;
  height: number;
  reach: number;
  peak: number;
}) {
  // Slow opacity "breathing" and a gentle vertical drift so the mist reads
  // as alive rather than a static gradient painted on the screen.
  const breathe = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 4200, easing: Easing.inOut(Easing.sin)}),
        withTiming(0, {duration: 4200, easing: Easing.inOut(Easing.sin)}),
      ),
      -1,
      false,
    );
    drift.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 6000, easing: Easing.inOut(Easing.sin)}),
        withTiming(0, {duration: 6000, easing: Easing.inOut(Easing.sin)}),
      ),
      -1,
      false,
    );
  }, [breathe, drift]);

  // Bottom mist drifts down as it swells, top mist drifts up — both read as
  // "rolling further into frame" rather than sliding sideways.
  const driftSign = edge === 'bottom' ? 1 : -1;
  const opacity = useDerivedValue(() => peak * (0.55 + breathe.value * 0.45));
  const transform = useDerivedValue(() => [
    {translateY: driftSign * drift.value * 14},
  ]);

  const start = edge === 'bottom' ? vec(0, height) : vec(0, 0);
  const end = edge === 'bottom' ? vec(0, height - reach) : vec(0, reach);

  return (
    <Group opacity={opacity} transform={transform}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={start}
          end={end}
          colors={[FOG_COLOR, FOG_TRANSPARENT]}
        />
      </Rect>
    </Group>
  );
}
