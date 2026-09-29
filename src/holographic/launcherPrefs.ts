/**
 * App-drawer memory kept on the phone only: which apps were opened most
 * recently (the «اخیر» row) and which ones the user hid from the list.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_KEY = 'appDrawer:recent';
const HIDDEN_KEY = 'appDrawer:hidden';

/** Kept a little longer than the row shows, so uninstalled or hidden apps
 * dropping out still leave it full. */
const RECENT_KEEP = 12;

async function readList(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(p => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

async function writeList(key: string, list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Best-effort.
  }
}

/** Package names, most recently opened first. */
export function getRecentApps(): Promise<string[]> {
  return readList(RECENT_KEY);
}

export async function noteAppLaunched(packageName: string): Promise<string[]> {
  const list = await readList(RECENT_KEY);
  const next = [packageName, ...list.filter(p => p !== packageName)].slice(0, RECENT_KEEP);
  await writeList(RECENT_KEY, next);
  return next;
}

export function getHiddenApps(): Promise<string[]> {
  return readList(HIDDEN_KEY);
}

export async function setAppHidden(
  packageName: string,
  hidden: boolean,
): Promise<string[]> {
  const list = (await readList(HIDDEN_KEY)).filter(p => p !== packageName);
  const next = hidden ? [...list, packageName] : list;
  await writeList(HIDDEN_KEY, next);
  return next;
}

const LONG_PRESS_HINT_KEY = 'appDrawer:longPressHintSeen';

/** The drawer's one-time "hold an app for more options" hint. Storage errors
 * count as seen, so it never nags on every open. */
export async function shouldShowLongPressHint(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LONG_PRESS_HINT_KEY)) !== '1';
  } catch {
    return false;
  }
}

export async function markLongPressHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LONG_PRESS_HINT_KEY, '1');
  } catch {
    // Best-effort.
  }
}
