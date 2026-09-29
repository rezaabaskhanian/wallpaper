/**
 * One-time flags for the first-launch "make this my wallpaper" button
 * (OneTapWallpaperButton) and the rating request that follows the first
 * successful wallpaper set, plus the shared "it worked" message every
 * set-wallpaper path ends with (announceWallpaperSet).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules} from 'react-native';
import {showAlert} from './AppAlert';
import {
  trackWallpaperSet,
  type WallpaperSetMethod,
  type WallpaperSetSource,
} from './analytics';
import {noteLauncherIntroWallpaperSet} from './launcherIntro';

const CTA_SHOWN_KEY = 'oneTapWallpaper:shown';
const RATING_ASKED_KEY = 'rating:askedAfterWallpaper';

async function getFlag(key: string): Promise<boolean | null> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    // Storage unavailable — callers treat this as "don't show", not "show".
    return null;
  }
}

async function setFlag(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, '1');
  } catch {
    // Best-effort.
  }
}

/** True only on the app's very first run. */
export async function shouldShowOneTapWallpaper(): Promise<boolean> {
  return (await getFlag(CTA_SHOWN_KEY)) === false;
}

/** Marked as soon as the button appears, so it belongs to the first launch
 * only — it still stays on screen for the rest of that session. */
export function markOneTapWallpaperShown(): Promise<void> {
  return setFlag(CTA_SHOWN_KEY);
}

/** The rating request is shown once, after the first successful set. */
async function shouldAskForRating(): Promise<boolean> {
  return (await getFlag(RATING_ASKED_KEY)) === false;
}

type StoreRatingNative = {openRating: () => Promise<boolean>};
const StoreRating: StoreRatingNative | undefined = NativeModules.StoreRating;

/** Opens Cafe Bazaar's rating/comment form for this app. */
export async function openStoreRating(): Promise<void> {
  try {
    await StoreRating?.openRating();
  } catch {
    // Nothing useful to tell the user if the store can't be opened.
  }
}

async function askForRatingOnce(): Promise<void> {
  if (!(await shouldAskForRating())) return;
  await setFlag(RATING_ASKED_KEY);
  showAlert(
    'از اپ راضی هستی؟ ⭐',
    'با امتیاز دادن در کافه‌بازار حمایتمان کن.',
    {
      confirmText: '⭐ امتیاز می‌دهم',
      cancelText: 'بعداً',
      onConfirm: () => {
        openStoreRating();
      },
    },
  );
}

/**
 * Call once a wallpaper has really been set (for a live wallpaper: after
 * isLiveWallpaperActive confirmed it). Records the analytics event, shows the
 * short success message, and after the very first success asks for a rating.
 */
export function announceWallpaperSet(
  method: WallpaperSetMethod,
  source: WallpaperSetSource,
): void {
  trackWallpaperSet(method, source);
  noteLauncherIntroWallpaperSet();
  showAlert(
    '✅ والپیپرت تنظیم شد!',
    method === 'lock' ? 'برو صفحه قفل رو ببین' : 'برو صفحه اصلی رو ببین',
    {
      onDismiss: () => {
        // Let the success card fade out before the rating card fades in.
        setTimeout(() => {
          askForRatingOnce();
        }, 350);
      },
    },
  );
}
