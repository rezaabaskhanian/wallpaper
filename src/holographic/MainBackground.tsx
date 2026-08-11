import React from 'react';
import {ImageBackground, StyleSheet} from 'react-native';
import {BACKGROUNDS} from './config';
import {useSettings} from './SettingsContext';
import {useCachedImage} from './imageCache';

/** True for a remote http(s) URL (a wallpaper picked from the app's own
 * gallery); false for a local device photo (content://, file://, ph://…)
 * picked straight from the phone's gallery, which needs no caching. */
const isRemoteUrl = (uri: string) => /^https?:\/\//i.test(uri);

/**
 * The full-screen background photo behind the orbiting avatars.
 *
 * Honours the current selection: a photo picked from the gallery or the device
 * ('custom' + customBackgroundUri), or the bundled image of the selected
 * background. IDs with no photo of their own (e.g. 'black') render nothing
 * here on purpose, falling through to the root view's solid black fill.
 *
 * A custom background from the app's own wallpaper gallery is a remote URL,
 * so it's routed through the same download+cache used for orbit avatar
 * photos (see imageCache.ts) — otherwise it'd vanish the moment the device
 * goes offline. A photo picked straight from the phone's gallery is already
 * a local file and is used as-is.
 */
export default function MainBackground() {
  const {settings} = useSettings();

  const customUri = settings.customBackgroundUri;
  const customIsRemote = !!customUri && isRemoteUrl(customUri);
  const cachedCustom = useCachedImage(customIsRemote ? customUri : undefined);

  const source =
    settings.backgroundId === 'custom'
      ? customUri
        ? customIsRemote
          ? cachedCustom.uri
            ? {uri: cachedCustom.uri}
            : undefined
          : {uri: customUri}
        : undefined
      : BACKGROUNDS.find(b => b.id === settings.backgroundId)?.source;

  if (!source) {
    return null;
  }

  // ImageBackground (not a bare Image) because it sizes the inner image to
  // 100% × 100%; absolute insets alone leave it at its intrinsic pixel size.
  return (
    <ImageBackground
      // Remount on source change so a newly picked photo replaces the old one
      // instead of being served from the previous decode.
      key={typeof source === 'number' ? `bundled-${source}` : source.uri}
      source={source}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );
}
