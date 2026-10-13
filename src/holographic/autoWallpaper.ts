/**
 * «تعویض خودکار» — the one auto-change in the app (native DailyWallpaper.kt):
 * every N hours a random wallpaper from one source — a category (moods are
 * categories too) or «مجموعه‌ی من» — goes on the lock and home screen, even
 * with the app closed. The native job only knows a list of image URLs; the
 * source is kept here so the list can be rebuilt when the catalog, the
 * favourites or the premium unlock change (useAutoWallpaperSync).
 */
import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules} from 'react-native';
import {useFavorites} from './favorites';
import {useStore} from './store/StoreContext';
import type {WallpaperItem} from './store/types';

type Native = {
  enable: (urls: string[], hours: number) => Promise<boolean>;
  disable: () => Promise<boolean>;
  updatePool: (urls: string[]) => Promise<boolean>;
};
const NativeAuto: Native | undefined = NativeModules.DailyWallpaper;

export type AutoSource =
  | {kind: 'category'; id: string; title: string}
  | {kind: 'favorites'; title: string};

export type AutoState = {source: AutoSource; hours: number};

/** Intervals offered to the user; 6 hours is the default. */
export const AUTO_HOURS = [1, 3, 6, 12, 24] as const;
export const DEFAULT_HOURS = 6;

const KEY = 'autoWallpaper:v1';
/** The old mood-only «هر روز» switch, migrated once. */
const LEGACY_MOOD_KEY = 'dailyWallpaper:moodId';

export const sameSource = (a: AutoSource | undefined, b: AutoSource) =>
  !!a && a.kind === b.kind && (a.kind === 'favorites' || a.id === (b as {id: string}).id);

let state: AutoState | null | undefined; // undefined = not loaded yet
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

let loading: Promise<void> | null = null;
function load(): Promise<void> {
  loading ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw) as AutoState;
      } else {
        const mood = await AsyncStorage.getItem(LEGACY_MOOD_KEY);
        state = mood ? {source: {kind: 'category', id: mood, title: ''}, hours: 24} : null;
        if (state) {
          await AsyncStorage.setItem(KEY, JSON.stringify(state));
          await AsyncStorage.removeItem(LEGACY_MOOD_KEY);
        }
      }
    } catch {
      state = null;
    }
    emit();
  })();
  return loading;
}

export function useAutoWallpaper(): AutoState | null {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender(n => n + 1);
    listeners.add(l);
    load();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state ?? null;
}

/** Image URLs a source can use: only wallpapers this user can have (a locked
 * premium one would otherwise be handed out for free). */
export function useAutoPool(): (source: AutoSource) => string[] {
  const {catalog, isUnlocked} = useStore();
  const favorites = useFavorites();
  return useCallback(
    (source: AutoSource) => {
      if (source.kind === 'favorites') {
        return favorites.filter(f => isUnlocked(f as WallpaperItem)).map(f => f.full);
      }
      const parentOf = (id: string) => catalog?.categories.find(c => c.id === id)?.parentId;
      return (catalog?.wallpapers ?? [])
        .filter(w => w.category === source.id || parentOf(w.category) === source.id)
        .filter(isUnlocked)
        .map(w => w.full);
    },
    [catalog, favorites, isUnlocked],
  );
}

/** Throws a user-facing message when it can't be turned on. */
export async function enableAutoWallpaper(
  source: AutoSource,
  hours: number,
  urls: string[],
): Promise<void> {
  if (!NativeAuto) throw new Error('برای این قابلیت نسخه‌ی تازه‌ی اپ لازمه.');
  if (urls.length === 0) {
    throw new Error(
      source.kind === 'favorites'
        ? 'اول چند والپیپر رو ❤️ کن.'
        : 'این دسته هنوز والپیپر رایگان نداره.',
    );
  }
  await NativeAuto.enable(urls, hours);
  state = {source, hours};
  emit();
  await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export async function disableAutoWallpaper(): Promise<void> {
  await NativeAuto?.disable();
  state = null;
  emit();
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/** «هر ۶ ساعت» / «روزانه» */
export function hoursLabel(hours: number, toFa: (n: number) => string): string {
  return hours >= 24 ? 'روزانه' : `هر ${toFa(hours)} ساعت`;
}

/**
 * Mount once (HolographicHome): keeps the native pool in step with the
 * catalog / favourites / premium unlock, and fills in a migrated source's
 * missing title. Never empties the pool — an empty fetch keeps the old one.
 */
export function useAutoWallpaperSync(): void {
  const auto = useAutoWallpaper();
  const poolFor = useAutoPool();
  const {catalog} = useStore();
  useEffect(() => {
    if (!auto) return;
    const urls = poolFor(auto.source);
    if (urls.length > 0) NativeAuto?.updatePool(urls).catch(() => {});
    if (auto.source.kind === 'category' && !auto.source.title && catalog) {
      const title = catalog.categories.find(c => c.id === (auto.source as {id: string}).id)?.title;
      if (title) {
        state = {...auto, source: {...auto.source, title}};
        emit();
        AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
      }
    }
  }, [auto, poolFor, catalog]);
}
