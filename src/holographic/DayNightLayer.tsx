import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSettings} from './SettingsContext';
import {useSunTimes} from './useSunTimes';
import {hourForMode, sampleDayNight, sampleMoon, sampleSunFlare} from './dayNight';
import StarField from './StarField';
import SunFlare from './SunFlare';
import Moon from './Moon';

function decimalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * A full-screen colour tint + star layer that shifts the wallpaper through
 * dawn / day / dusk / night based on the real local sunrise & sunset (with a
 * clock fallback). Sits above the photo but below the orbs and widgets.
 */
type Props = {
  /** Drops the twinkling stars (used while capturing a clean wallpaper frame). */
  hideStars?: boolean;
};

export default function DayNightLayer({hideStars = false}: Props) {
  const {settings} = useSettings();
  const mode = settings.dayNightMode;
  const sun = useSunTimes(mode === 'auto');
  const [hour, setHour] = useState(() => decimalHour(new Date()));

  useEffect(() => {
    const id = setInterval(() => setHour(decimalHour(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  if (mode === 'off') {
    return null;
  }

  const effHour = hourForMode(mode, sun, hour);
  const {tint, starIntensity} = sampleDayNight(effHour, sun);
  const flare = sampleSunFlare(effHour, sun);
  const moon = sampleMoon(effHour, sun, new Date());

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, {backgroundColor: tint}]} />
      {settings.sunFlare ? <SunFlare sample={flare} /> : null}
      {/* Same «خورشید و ماه» switch: the moon takes over at night. */}
      {settings.sunFlare ? <Moon sample={moon} /> : null}
      {hideStars ? null : <StarField intensity={starIntensity} />}
    </View>
  );
}
