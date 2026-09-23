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
  /** Mirrors the water-ripple switches into the live wallpaper service. */
  setLiveWallpaperRipple: (
    enabled: boolean,
    auto: boolean,
  ) => Promise<boolean>;
  /** Downloads the starred photos into the live wallpaper's rotation pool. */
  setLiveWallpaperSources: (
    urls: string[],
    enabled: boolean,
  ) => Promise<boolean>;
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

/**
 * Pushes the water-ripple switches down to the live wallpaper service, which
 * has no access to the JS settings store. Safe to call on every settings
 * change — it's a SharedPreferences write, and a missing native module (an
 * older build) is ignored rather than thrown, since the in-app ripple works
 * regardless of whether the live wallpaper is even in use.
 */
/**
 * Hands the starred rotation photos to the live wallpaper service so the home
 * screen rerolls one on every unlock, instead of staying on the single photo
 * that was set once. Only the app's own gallery URLs can be fetched natively,
 * so device-gallery picks (content://, file://) are dropped here rather than
 * failing one by one in the download loop.
 *
 * Fire-and-forget like the ripple sync: the pool simply keeps its previous
 * contents if a download fails.
 */
export async function syncLiveWallpaperSources(
  uris: string[],
  enabled: boolean,
): Promise<void> {
  if (!LockWallpaper?.setLiveWallpaperSources) {
    return;
  }
  try {
    await LockWallpaper.setLiveWallpaperSources(
      uris.filter(u => /^https:\/\//i.test(u)),
      enabled,
    );
  } catch {
    // Keeps whatever pool the service already had.
  }
}

export async function syncLiveWallpaperRipple(
  enabled: boolean,
  auto: boolean,
): Promise<void> {
  if (!LockWallpaper?.setLiveWallpaperRipple) {
    return;
  }
  try {
    await LockWallpaper.setLiveWallpaperRipple(enabled, auto);
  } catch {
    // Not worth surfacing — the home-screen ripple simply keeps its old state.
  }
}
