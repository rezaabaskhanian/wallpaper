/**
 * The red «تازه» dot: shown on the settings gear and the gallery button when
 * the catalog has a wallpaper newer than the newest one the user had when
 * they last opened the gallery. On the very first run the current newest is
 * simply recorded, so a fresh install starts without a dot.
 */
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useStore} from './store/StoreContext';

const KEY = 'gallery:lastSeenNewest';

let lastSeen: string | null | undefined; // undefined = not loaded yet
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

async function load(): Promise<void> {
  if (lastSeen !== undefined) return;
  try {
    lastSeen = await AsyncStorage.getItem(KEY);
  } catch {
    lastSeen = null;
  }
  emit();
}

function save(value: string) {
  lastSeen = value;
  emit();
  AsyncStorage.setItem(KEY, value).catch(() => {});
}

/** Newest `createdAt` in the catalog, or null if unknown. */
function useNewest(): string | null {
  const {catalog} = useStore();
  let newest: string | null = null;
  for (const w of catalog?.wallpapers ?? []) {
    if (w.createdAt && (!newest || w.createdAt > newest)) newest = w.createdAt;
  }
  return newest;
}

export function useHasNewWallpapers(): boolean {
  const newest = useNewest();
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender(n => n + 1);
    listeners.add(l);
    load();
    return () => {
      listeners.delete(l);
    };
  }, []);
  useEffect(() => {
    // First run: remember what's there now instead of flagging it all as new.
    if (newest && lastSeen === null) save(newest);
  }, [newest]);
  return !!newest && typeof lastSeen === 'string' && newest > lastSeen;
}

/** Call when the gallery is opened: clears the dot. */
export function useMarkWallpapersSeen(active: boolean): void {
  const newest = useNewest();
  useEffect(() => {
    if (active && newest && newest !== lastSeen) save(newest);
  }, [active, newest]);
}
