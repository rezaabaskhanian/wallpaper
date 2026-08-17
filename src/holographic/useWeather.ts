/**
 * Live weather via the device GPS + the free Open-Meteo API (no API key).
 * There is no manual/guessed fallback: if the geolocation native module
 * isn't linked yet (before a rebuild), permission is denied, or the API
 * fetch fails, this simply returns null — callers must show nothing rather
 * than a stale or made-up value.
 */
import {useEffect, useState} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';

export type Weather = {
  /** Temperature in °C, rounded. */
  temp: number;
  /** Open-Meteo WMO weather code. */
  code: number;
  /** true when it's night at the location. */
  isNight: boolean;
};

import type {WeatherKind} from './WeatherIcon';

/** Map an Open-Meteo WMO code (+ day/night) to a drawn icon kind (see
 * WeatherIcon — emoji glyphs don't reliably render on this launcher, see its
 * doc comment for why). */
export function weatherIcon(code: number, isNight: boolean): WeatherKind {
  if (code === 0) return isNight ? 'moon' : 'sun';
  if (code <= 2) return isNight ? 'partly-night' : 'partly-day';
  if (code === 3) return 'cloud';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 95) return 'storm';
  return isNight ? 'moon' : 'sun';
}

export async function getGeolocation(): Promise<{
  lat: number;
  lon: number;
} | null> {
  let Geolocation: any;
  try {
    // Loaded lazily so a missing native module (pre-rebuild) doesn't crash.
    Geolocation = require('@react-native-community/geolocation').default;
  } catch {
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      (pos: any) =>
        resolve({lat: pos.coords.latitude, lon: pos.coords.longitude}),
      () => resolve(null),
      {enableHighAccuracy: false, timeout: 15000, maximumAge: 600000},
    );
  });
}

/** Fetch current weather; refreshes every 30 minutes. */
export function useWeather(enabled: boolean): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    if (!enabled) {
      setWeather(null);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const coords = await getGeolocation();
      if (!coords || cancelled) return;
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}` +
          `&longitude=${coords.lon}&current=temperature_2m,weather_code,is_day`;
        const res = await fetch(url);
        const json = await res.json();
        const cur = json?.current;
        if (cur && !cancelled) {
          setWeather({
            temp: Math.round(cur.temperature_2m),
            code: cur.weather_code,
            isNight: cur.is_day === 0,
          });
        }
      } catch {
        // Leave weather as-is (likely still null) — no fallback value.
      }
    };

    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  return weather;
}
