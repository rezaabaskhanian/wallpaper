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

/**
 * Top-left widget: a big clock and the date. Weather/temperature, settings and
 * battery live in the TopLeftBar row above this.
 */
export default function ClockWidget() {
  const {settings, update, resolvedGlowColor} = useSettings();
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
  // Photo-matched glow instead of the fixed gold, when the user opted in
  // (Settings ▸ عمومی ▸ رنگ پویا هم روی نوشته‌ها) — see dynamicColorText's
  // doc comment in SettingsContext for why this is a separate, off-by-default
  // switch rather than riding on dynamicColor alone.
  const glowShadow =
    settings.dynamicColor && settings.dynamicColorText
      ? withAlpha(resolvedGlowColor, 0.5)
      : undefined;

  if (settings.clockLayout === 'bigCentered') {
    // The user can push clockFontScale far past what the inline clock
    // allows (see SettingsPanel's maxClockScale), so the requested size can
    // legitimately be bigger than the screen. Clamp the actually-rendered
    // fontSize to whatever fits both the screen width (2-digit line) and
    // height (hour + minute stacked, plus AM/PM) with a safety margin, so
    // it grows up to "fills the screen" but never clips or overflows.
    const requestedFontSize = 64 * scale;
    // ~2 digits per line at this weight/letterSpacing; add a margin so
    // widest digit pairs ("00".."88") never touch the screen edge.
    const maxByWidth = (screenW * 0.86) / 1.3;
    const lineHeightFactor = 1.22;
    const ampmReserve = showAmpm ? 0.5 : 0;
    const maxByHeight =
      (screenH * 0.72) / (2 * lineHeightFactor + ampmReserve);
    const fontSize = Math.max(
      24,
      Math.min(requestedFontSize, maxByWidth, maxByHeight),
    );
    const lineHeight = fontSize * lineHeightFactor;
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
              glowShadow ? {textShadowColor: glowShadow} : null,
            ]}>
            {hourStr}
          </AppText>
          <AppText
            style={[
              styles.bigMinute,
              {fontSize, lineHeight, color: settings.clockTextColor},
              glowShadow ? {textShadowColor: glowShadow} : null,
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
            glowShadow ? {textShadowColor: glowShadow} : null,
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
