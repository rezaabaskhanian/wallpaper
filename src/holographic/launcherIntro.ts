/**
 * When to suggest making this app the phone's launcher (LauncherIntroModal).
 * Wallpaper comes first: the suggestion only appears once the user has set a
 * wallpaper at least once and opened the app at least 3 times. "Later" hides
 * it for the next 5 opens, it's shown at most twice in total, and never again
 * once the user has tapped "try it".
 *
 * An "open" is what analytics counts as one (trackAppOpen), so the launcher
 * case — foregrounded on every Home press — doesn't inflate it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'launcherIntro:state';

const MIN_OPENS = 3;
const SNOOZE_OPENS = 5;
const MAX_SHOWS = 2;

type State = {
  opens: number;
  hasSetWallpaper: boolean;
  shows: number;
  /** Not shown again before `opens` reaches this. */
  snoozeUntilOpen: number;
  accepted: boolean;
};

const INITIAL: State = {
  opens: 0,
  hasSetWallpaper: false,
  shows: 0,
  snoozeUntilOpen: 0,
  accepted: false,
};

async function read(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? {...INITIAL, ...JSON.parse(raw)} : INITIAL;
  } catch {
    return INITIAL;
  }
}

async function change(fn: (s: State) => State): Promise<State> {
  const next = fn(await read());
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort — worst case the counters lag a little.
  }
  return next;
}

export function noteLauncherIntroAppOpen(): Promise<State> {
  return change(s => ({...s, opens: s.opens + 1}));
}

export async function noteLauncherIntroWallpaperSet(): Promise<void> {
  await change(s => ({...s, hasSetWallpaper: true}));
}

/** Whether the intro is due, given the state noteLauncherIntroAppOpen returned.
 * The caller also skips it when the app already is the launcher. */
export function isLauncherIntroDue(s: State): boolean {
  return (
    !s.accepted &&
    s.hasSetWallpaper &&
    s.opens >= MIN_OPENS &&
    s.shows < MAX_SHOWS &&
    s.opens >= s.snoozeUntilOpen
  );
}

export async function markLauncherIntroShown(): Promise<void> {
  await change(s => ({...s, shows: s.shows + 1}));
}

/** "Later" (or dismissing the card any other way). */
export async function snoozeLauncherIntro(): Promise<void> {
  await change(s => ({...s, snoozeUntilOpen: s.opens + SNOOZE_OPENS}));
}

export async function markLauncherIntroAccepted(): Promise<void> {
  await change(s => ({...s, accepted: true}));
}
