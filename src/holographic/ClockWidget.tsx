import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import AppText from './AppText';
import DraggableWidget from './DraggableWidget';
import {useSettings} from './SettingsContext';
import {formatGregorian, formatJalali, toFa} from './date';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Top-left widget: a big clock and the date. Weather/temperature, settings and
 * battery live in the TopLeftBar row above this.
 */
export default function ClockWidget() {
  const {settings, update} = useSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours24 = now.getHours();
  const ampm = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const clock = `${pad(hours12)}:${pad(now.getMinutes())}`;

  return (
    <DraggableWidget
      style={styles.wrap}
      offset={settings.clockOffset}
      editing={settings.editLayout}
      onCommit={o => update('clockOffset', o)}
      label="ساعت">
      <View style={styles.clockRow}>
        <AppText style={styles.clock}>{toFa(clock)}</AppText>
        <AppText style={styles.ampm}>{ampm}</AppText>
      </View>

      {settings.showDate ? (
        <>
          <AppText style={styles.dateFa}>{formatJalali(now)}</AppText>
          <AppText style={styles.dateEn}>{formatGregorian(now)}</AppText>
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
