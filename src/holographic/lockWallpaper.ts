import {NativeModules} from 'react-native';

/** Which surface(s) to apply the captured still to. */
export type WallpaperTarget = 'lock' | 'home' | 'both';

type LockWallpaperNative = {
  /** Captures the current app window and sets it as the wallpaper. */
  setWallpaperFromScreen: (which: WallpaperTarget) => Promise<boolean>;
  /** Downloads an image URL and sets it as the wallpaper. */
  setWallpaperFromUrl: (url: string, which: WallpaperTarget) => Promise<boolean>;
  /** Captures the current app window and saves it as the source photo for
   * HolographicWallpaperService (the real system live wallpaper). */
  captureLiveWallpaperSource: () => Promise<boolean>;
  /** Downloads an image URL and saves it as the live-wallpaper source photo. */
  setLiveWallpaperSourceFromUrl: (url: string) => Promise<boolean>;
  /** Opens Android's own "set live wallpaper" screen for this app's live
   * wallpaper — the user still taps "Set wallpaper" there. */
  requestSetLiveWallpaper: () => Promise<boolean>;
};

const LockWallpaper: LockWallpaperNative | undefined =
  NativeModules.LockWallpaper;

/**
 * Sets the current on-screen scene as the device wallpaper (still image) for the
 * lock screen, home screen, or both. The caller should hide the clock/quote/
 * status chrome first so only the holographic background is captured. Throws if
 * the native module is missing (e.g. before a rebuild) or the OS refuses.
 */
export async function setDeviceWallpaper(
  target: WallpaperTarget,
): Promise<void> {
  if (!LockWallpaper?.setWallpaperFromScreen) {
    throw new Error('LockWallpaper native module unavailable — rebuild the app.');
  }
  await LockWallpaper.setWallpaperFromScreen(target);
}

/**
 * Downloads an image (a gallery wallpaper) and sets it as the lock/home/both
 * wallpaper natively. Throws if the native module is missing.
 */
export async function setWallpaperFromUrl(
  url: string,
  target: WallpaperTarget,
): Promise<void> {
  if (!LockWallpaper?.setWallpaperFromUrl) {
    throw new Error('LockWallpaper native module unavailable — rebuild the app.');
  }
  await LockWallpaper.setWallpaperFromUrl(url, target);
}

/**
 * Saves the current on-screen scene as the source photo for the real system
 * live wallpaper (HolographicWallpaperService, home screen only — Android
 * does not allow an animated wallpaper behind the lock screen) and opens
 * Android's own "set live wallpaper" screen so the user can confirm it. The
 * caller should hide the clock/quote/status chrome first, same as
 * setDeviceWallpaper.
 */
export async function setLiveWallpaperFromCurrentScreen(): Promise<void> {
  if (
    !LockWallpaper?.captureLiveWallpaperSource ||
    !LockWallpaper?.requestSetLiveWallpaper
  ) {
    throw new Error('LockWallpaper native module unavailable — rebuild the app.');
  }
  await LockWallpaper.captureLiveWallpaperSource();
  await LockWallpaper.requestSetLiveWallpaper();
}

/**
 * Same as setLiveWallpaperFromCurrentScreen, but the source is a gallery
 * wallpaper URL instead of the current on-screen scene.
 */
export async function setLiveWallpaperFromUrl(url: string): Promise<void> {
  if (
    !LockWallpaper?.setLiveWallpaperSourceFromUrl ||
    !LockWallpaper?.requestSetLiveWallpaper
  ) {
    throw new Error('LockWallpaper native module unavailable — rebuild the app.');
  }
  await LockWallpaper.setLiveWallpaperSourceFromUrl(url);
  await LockWallpaper.requestSetLiveWallpaper();
}
