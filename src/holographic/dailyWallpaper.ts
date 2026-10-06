/**
 * "Change my wallpaper every day" — JS side of DailyWallpaper.kt. The native
 * job only knows a pool of image URLs; which mood they came from is kept here
 * so the pool can be rebuilt whenever the catalog changes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules} from 'react-native';

type DailyWallpaperNative = {
  enable: (urls: string[]) => Promise<boolean>;
  disable: () => Promise<boolean>;
  updatePool: (urls: string[]) => Promise<boolean>;
};
const Native: DailyWallpaperNative | undefined = NativeModules.DailyWallpaper;

const MOOD_KEY = 'dailyWallpaper:moodId';

/** Mood id the daily change draws from, or null when it's off. */
export async function getDailyMood(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(MOOD_KEY);
  } catch {
    return null;
  }
}

export async function enableDailyWallpaper(moodId: string, urls: string[]): Promise<void> {
  if (!Native) throw new Error('DailyWallpaper native module unavailable — rebuild the app.');
  await Native.enable(urls);
  await AsyncStorage.setItem(MOOD_KEY, moodId);
}

export async function disableDailyWallpaper(): Promise<void> {
  await Native?.disable();
  await AsyncStorage.removeItem(MOOD_KEY);
}

/** Best-effort pool refresh after a catalog reload or a premium unlock. */
export function updateDailyPool(urls: string[]): void {
  if (urls.length === 0) return; // keep the old pool rather than go empty
  Native?.updatePool(urls).catch(() => {});
}
