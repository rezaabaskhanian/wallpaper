import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  LinearGradient,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import AppText from './AppText';
import {toFa} from './date';
import {sampleDayNight, sampleSunFlare} from './dayNight';
import {useSettings} from './SettingsContext';
import SunFlare from './SunFlare';
import {useSunTimes, type SunTimes} from './useSunTimes';

const CARD_HEIGHT = 150;
/** One simulated day (an hour before sunrise → an hour after sunset). */
const DAY_LOOP_MS = 12_000;
/** ~30fps is plenty for a small preview and keeps re-renders cheap. */
const FRAME_MS = 33;
/** Where the ground starts, as a fraction of the card height. */
const GROUND_Y = 0.62;

function formatHour(hour: number): string {
  const total = Math.round(((hour % 24) + 24) % 24 * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return toFa(`${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`);
}

function phaseLabel(hour: number, {sunrise, sunset}: SunTimes): string {
  const noon = (sunrise + sunset) / 2;
  if (hour < sunrise - 0.3) return 'پیش از طلوع';
  if (hour < sunrise + 1) return 'طلوع';
  if (hour < noon - 1) return 'صبح';
  if (hour < noon + 1) return 'ظهر';
  if (hour < sunset - 1) return 'عصر';
  if (hour < sunset + 0.3) return 'غروب';
  return 'شب';
}

function decimalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * A small sky card in Settings that fast-forwards one day so the user can see
 * what the sun flare does over time: it rises low and orange on the left,
 * climbs pale and high at noon, and sets orange on the right. Uses the same
 * sampleSunFlare/sampleDayNight as the real wallpaper, plus a marker for
 * where the sun is right now.
 */
export default function SunDayPreview() {
  const {settings} = useSettings();
  const sun = useSunTimes(settings.dayNightMode === 'auto');
  const [width, setWidth] = useState(0);
  const from = sun.sunrise - 1;
  const to = sun.sunset + 1;
  const [hour, setHour] = useState(from);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const phase = ((Date.now() - start) % DAY_LOOP_MS) / DAY_LOOP_MS;
      setHour(from + phase * (to - from));
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [from, to]);

  const h = CARD_HEIGHT;
  // Dotted path the sun travels along, from sunrise to sunset.
  const arc = useMemo(() => {
    const path = Skia.Path.Make();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const hr = sun.sunrise + ((sun.sunset - sun.sunrise) * i) / steps;
      const p = sampleSunFlare(hr, sun);
      if (i === 0) path.moveTo(p.x * width, p.y * h);
      else path.lineTo(p.x * width, p.y * h);
    }
    return path;
  }, [sun, width, h]);

  const {tint} = sampleDayNight(hour, sun);
  const flare = sampleSunFlare(hour, sun);
  const nowHour = decimalHour(new Date());
  const nowOnArc =
    nowHour > sun.sunrise && nowHour < sun.sunset
      ? sampleSunFlare(nowHour, sun)
      : null;

  return (
    <View
      style={styles.card}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={width} height={h}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, h * GROUND_Y)}
                colors={['#2f6db5', '#9fd0f5']}
              />
            </Rect>
            {/* Same time-of-day tint the wallpaper uses. */}
            <Rect x={0} y={0} width={width} height={h} color={tint} />
            <Path
              path={arc}
              style="stroke"
              strokeWidth={1.2}
              color="rgba(255,255,255,0.35)">
              <DashPathEffect intervals={[3, 5]} />
            </Path>
          </Canvas>
          <SunFlare sample={flare} width={width} height={h} />
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Ground, drawn over the flare so the sun sets behind it. */}
            <Rect
              x={0}
              y={h * GROUND_Y}
              width={width}
              height={h * (1 - GROUND_Y)}>
              <LinearGradient
                start={vec(0, h * GROUND_Y)}
                end={vec(0, h)}
                colors={['#1b2a3a', '#0b1119']}
              />
            </Rect>
            {nowOnArc ? (
              <Circle
                cx={nowOnArc.x * width}
                cy={nowOnArc.y * h}
                r={4}
                color="rgba(255,255,255,0.9)"
              />
            ) : null}
          </Canvas>
        </>
      ) : null}

      <View style={styles.timePill}>
        <AppText style={styles.timeText}>
          {formatHour(hour)} · {phaseLabel(hour, sun)}
        </AppText>
      </View>
      <View style={styles.legend}>
        <AppText style={styles.legendText}>طلوع {formatHour(sun.sunrise)}</AppText>
        {nowOnArc ? (
          <AppText style={styles.legendText}>● الان</AppText>
        ) : null}
        <AppText style={styles.legendText}>غروب {formatHour(sun.sunset)}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    backgroundColor: '#0b1119',
  },
  timePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    writingDirection: 'rtl',
  },
  // Sunrise sits on the left of the sky, so keep the legend left-to-right.
  legend: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
});
