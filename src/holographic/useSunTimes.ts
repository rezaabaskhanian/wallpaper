/**
 * Local sunrise/sunset hours for the day/night theme.
 *
 * Uses the device location + Open-Meteo's daily sunrise/sunset (no API key).
 * Falls back to sensible defaults (6:00 / 18:00) when location or the network
 * is unavailable, so the day/night effect always works.
 */
import {useEffect, useState} from 'react';
import {getGeolocation} from './useWeather';

export type SunTimes = {
  /** Local sunrise as a decimal hour (e.g. 5.5 = 05:30). */
  sunrise: number;
  /** Local sunset as a decimal hour. */
  sunset: number;
};

export const DEFAULT_SUN_TIMES: SunTimes = {sunrise: 6, sunset: 18};

/** Parse an "…T05:12" ISO-ish string to a decimal hour. */
function parseHour(iso: string): number {
  const time = iso.split('T')[1] ?? '00:00';
  const [h, m] = time.split(':');
  return Number(h) + Number(m) / 60;
}

export function useSunTimes(enabled: boolean): SunTimes {
  const [times, setTimes] = useState<SunTimes>(DEFAULT_SUN_TIMES);

  useEffect(() => {
    if (!enabled) {
      setTimes(DEFAULT_SUN_TIMES);
      return;
    }
    let cancelled = false;

    (async () => {
      const coords = await getGeolocation();
      if (!coords || cancelled) return;
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}` +
          `&longitude=${coords.lon}&daily=sunrise,sunset&timezone=auto`;
        const res = await fetch(url);
        const json = await res.json();
        const sr = json?.daily?.sunrise?.[0];
        const ss = json?.daily?.sunset?.[0];
        if (sr && ss && !cancelled) {
          setTimes({sunrise: parseHour(sr), sunset: parseHour(ss)});
        }
      } catch {
        // keep defaults
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return times;
}
