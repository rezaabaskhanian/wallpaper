/**
 * «مجموعه‌ی من»: wallpapers the user hearted, newest first, kept only on this
 * device (no accounts). Keyed by the full-image URL so the same wallpaper
 * can't be saved twice.
 *
 * The in-app «چرخش» and the live wallpaper's photo pool draw from the newest
 * ROTATION_SIZE favourites — useFavoritesSync() mirrors them into
 * settings.randomBackgroundUris (the live wallpaper downloads each one, hence
 * the cap). Hearts replace the old 5-photo star list, migrated once in load().
 */
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSettings} from './SettingsContext';
import type {WallpaperItem} from './store/types';

const KEY = 'favorites:v1';
export const ROTATION_SIZE = 5;

export type FavoriteItem = Pick<WallpaperItem, 'id' | 'title' | 'thumb' | 'full' | 'premium'>;

let items: FavoriteItem[] | null = null; // null = not loaded yet
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

/** SettingsContext's storage key — read directly for the one-time migration,
 * so it doesn't depend on when the settings provider finishes loading. */
const SETTINGS_KEY = 'wallpaperSettings:v1';

let loading: Promise<void> | null = null;

function load(): Promise<void> {
  loading ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw !== null) {
        items = JSON.parse(raw) as FavoriteItem[];
      } else {
        // First run with hearts: carry over the old starred rotation photos.
        const settingsRaw = await AsyncStorage.getItem(SETTINGS_KEY);
        const stars: string[] = settingsRaw
          ? (JSON.parse(settingsRaw).randomBackgroundUris ?? [])
          : [];
        items = stars.map(full => ({id: full, title: '', thumb: full, full, premium: false}));
        AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
      }
    } catch {
      items = [];
    }
    emit();
  })();
  return loading;
}

function save(next: FavoriteItem[]) {
  items = next;
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

export function isFavorite(full: string): boolean {
  return !!items?.some(f => f.full === full);
}

export function toggleFavorite(w: FavoriteItem): boolean {
  const list = items ?? [];
  if (list.some(f => f.full === w.full)) {
    save(list.filter(f => f.full !== w.full));
    return false;
  }
  const {id, title, thumb, full, premium} = w;
  save([{id, title, thumb, full, premium}, ...list]);
  return true;
}

export function removeFavorite(full: string): void {
  save((items ?? []).filter(f => f.full !== full));
}

export function useFavorites(): FavoriteItem[] {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender(n => n + 1);
    listeners.add(l);
    load();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return items ?? [];
}

/**
 * Mount once (HolographicHome): keeps the rotation pool = the newest
 * ROTATION_SIZE hearts.
 */
export function useFavoritesSync(): void {
  const favorites = useFavorites();
  const {settings, update} = useSettings();
  const loaded = items !== null;
  useEffect(() => {
    if (!loaded) return;
    const pool = favorites.slice(0, ROTATION_SIZE).map(f => f.full);
    const current = settings.randomBackgroundUris;
    if (pool.length !== current.length || pool.some((u, i) => u !== current[i])) {
      update('randomBackgroundUris', pool);
    }
  }, [loaded, favorites, settings.randomBackgroundUris, update]);
}
