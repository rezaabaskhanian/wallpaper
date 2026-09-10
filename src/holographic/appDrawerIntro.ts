/**
 * Timing for the "swipe up for your apps / set as launcher" intro modal
 * (AppDrawerIntroModal) — the app's most easily-missed feature. Shown once on
 * first launch, then again if the user has been away long enough that
 * they've plausibly forgotten it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'appDrawerIntro:lastShownAt';
const REINTRO_AFTER_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

/**
 * True the very first time the app runs (nothing stored yet), and again once
 * more than 5 days have passed since it was last shown.
 */
export async function shouldShowAppDrawerIntro(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return true;
    }
    const lastShown = Number(raw);
    if (!Number.isFinite(lastShown)) {
      return true;
    }
    return Date.now() - lastShown > REINTRO_AFTER_MS;
  } catch {
    // Storage unavailable — safer to skip than to nag every launch.
    return false;
  }
}

/** Records that the intro was just shown, resetting the 5-day timer. */
export async function markAppDrawerIntroShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Best-effort — worst case the intro just reappears next launch.
  }
}
