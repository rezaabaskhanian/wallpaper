import {NativeModules} from 'react-native';

type HomeWidgetNative = {
  /** Persists the "auto rotate quote" pref for the home-screen widget
   * (a separate process — it can't read React state directly) and refreshes
   * any placed widget instances right away. */
  setAutoRotateQuote: (enabled: boolean) => Promise<boolean>;
  /** Downloads/copies the given URI, caches it as the widget's background
   * photo, and refreshes any placed widget instances. Pass null to clear it. */
  setBackgroundImage: (uri: string | null) => Promise<boolean>;
};

const HomeWidget: HomeWidgetNative | undefined = NativeModules.HomeWidget;

/**
 * Tells the home-screen widget (see QuoteWidgetProvider.kt) whether to pick a
 * new quote each time it refreshes. Silently no-ops if the native module
 * isn't linked yet (e.g. before a rebuild) — the widget just keeps its
 * default (on).
 */
export async function setWidgetAutoRotateQuote(enabled: boolean): Promise<void> {
  if (!HomeWidget?.setAutoRotateQuote) {
    return;
  }
  await HomeWidget.setAutoRotateQuote(enabled);
}

/**
 * Mirrors a background photo onto the home-screen widget — currently only
 * meaningful for a remote URL (a wallpaper applied from the store gallery);
 * the bundled default background can't be synced since it's a JS asset, not
 * a real file. Pass null to clear it back to the plain card. Silently no-ops
 * if the native module isn't linked yet.
 */
export async function setWidgetBackgroundImage(uri: string | null): Promise<void> {
  if (!HomeWidget?.setBackgroundImage) {
    return;
  }
  await HomeWidget.setBackgroundImage(uri);
}
