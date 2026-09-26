import React, {useEffect, useState} from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import AppText from './AppText';
import DraggableWidget from './DraggableWidget';
import {useSettings} from './SettingsContext';
import {formatGregorian, formatJalali, toFa} from './date';
import {withAlpha} from './dynamicColor';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Base clock fontSize in the "big centered" layout at clockFontScale 1. */
export const BIG_CLOCK_BASE_FONT_SIZE = 64;
const BIG_CLOCK_LINE_HEIGHT_FACTOR = 1.22;

/**
 * Largest fontSize the "big centered" clock can render at without clipping:
 * it has to fit both the screen width (2-digit line) and height (hour +
 * minute stacked, plus AM/PM) with a safety margin. The settings slider uses
 * this too, so its range stops where the clock stops growing.
 */
export function bigClockMaxFontSize(
  screenW: number,
  screenH: number,
  showAmpm: boolean,
): number {
  // ~2 digits per line at this weight/letterSpacing; add a margin so
  // widest digit pairs ("00".."88") never touch the screen edge.
  const maxByWidth = (screenW * 0.86) / 1.3;
  const ampmReserve = showAmpm ? 0.5 : 0;
  const maxByHeight =
    (screenH * 0.72) / (2 * BIG_CLOCK_LINE_HEIGHT_FACTOR + ampmReserve);
  return Math.min(maxByWidth, maxByHeight);
}

/**
 * Top-left widget: a big clock and the date. Weather/temperature, settings and
 * battery live in the TopLeftBar row above this.
 */
export default function ClockWidget() {
  const {settings, update} = useSettings();
  const [now, setNow] = useState(() => new Date());
  const {width: screenW, height: screenH} = useWindowDimensions();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours24 = now.getHours();
  const is24 = settings.hourFormat === '24';
  const isEnDigits = settings.clockDigits === 'en';
  const ampm = hours24 < 12
    ? (isEnDigits ? 'AM' : 'ق.ظ')
    : (isEnDigits ? 'PM' : 'ب.ظ');
  const showAmpm = !is24 && settings.showAmPm;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const localize = (s: string) => (isEnDigits ? s : toFa(s));
  const hourStr = localize(pad(is24 ? hours24 : hours12));
  const minuteStr = localize(pad(now.getMinutes()));
  const clock = `${hourStr}:${minuteStr}`;
  const scale = settings.clockFontScale;
  const smallColor = settings.clockSmallTextColor;

  if (settings.clockLayout === 'bigCentered') {
    // The settings slider stops at the size that fills the screen, but a
    // saved scale can still exceed it (e.g. after rotating or on a smaller
    // screen), so clamp the rendered fontSize so it never clips or overflows.
    const requestedFontSize = BIG_CLOCK_BASE_FONT_SIZE * scale;
    const fontSize = Math.max(
      24,
      Math.min(
        requestedFontSize,
        bigClockMaxFontSize(screenW, screenH, showAmpm),
      ),
    );
    const lineHeight = fontSize * BIG_CLOCK_LINE_HEIGHT_FACTOR;
    const ampmFontSize = Math.max(14, fontSize * 0.28);

    return (
      <DraggableWidget
        style={styles.wrapCentered}
        offset={settings.clockOffset}
        editing={settings.editLayout}
        onCommit={o => update('clockOffset', o)}
        label="ساعت">
        <View style={styles.bigClock}>
          <AppText
            style={[
              styles.bigHour,
              {fontSize, lineHeight, color: settings.clockTextColor},
            ]}>
            {hourStr}
          </AppText>
          <AppText
            style={[
              styles.bigMinute,
              {fontSize, lineHeight, color: settings.clockTextColor},
            ]}>
            {minuteStr}
          </AppText>
          {showAmpm ? (
            <AppText
              style={[
                styles.bigAmpm,
                {fontSize: ampmFontSize, color: smallColor},
              ]}>
              {ampm}
            </AppText>
          ) : null}
        </View>
      </DraggableWidget>
    );
  }

  return (
    <DraggableWidget
      style={styles.wrap}
      offset={settings.clockOffset}
      editing={settings.editLayout}
      onCommit={o => update('clockOffset', o)}
      label="ساعت">
      <View style={styles.clockRow}>
        <AppText
          style={[
            styles.clock,
            {fontSize: 25 * scale, color: settings.clockTextColor},
          ]}>
          {clock}
        </AppText>
        {showAmpm ? (
          <AppText
            style={[styles.ampm, {fontSize: 16 * scale, color: smallColor}]}>
            {ampm}
          </AppText>
        ) : null}
      </View>

      {settings.showDate ? (
        <>
          <AppText
            style={[styles.dateFa, {fontSize: 15 * scale, color: smallColor}]}>
            {formatJalali(now)}
          </AppText>
          <AppText
            style={[
              styles.dateEn,
              {fontSize: 12 * scale, color: withAlpha(smallColor, 0.6)},
            ]}>
            {formatGregorian(now)}
          </AppText>
        </>
      ) : null}
    </DraggableWidget>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 92,
    left: 24,
    alignItems: 'flex-start',
    zIndex: 150,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  wrapCentered: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
  },
  bigClock: {
    alignItems: 'center',
  },
  bigHour: {
    color: '#f5e6b3',
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(212,175,55,0.5)',
    textShadowRadius: 22,
  },
  bigMinute: {
    color: '#f5e6b3',
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(212,175,55,0.5)',
    textShadowRadius: 22,
  },
  bigAmpm: {
    color: '#eafffb',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  clock: {
    color: '#f5e6b3',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(212,175,55,0.5)',
    textShadowRadius: 18,
  },
  ampm: {
    color: '#eafffb',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  dateFa: {
    color: '#eafffb',
    fontSize: 15,
    marginTop: 2,
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 8,
  },
  dateEn: {
    color: 'rgba(234,255,251,0.6)',
    fontSize: 12,
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 6,
  },
});
