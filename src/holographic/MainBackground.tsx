import React from 'react';
import {ImageBackground, StyleSheet} from 'react-native';
import {BACKGROUNDS} from './config';
import {useSettings} from './SettingsContext';

/**
 * The full-screen background photo behind the orbiting avatars.
 *
 * Honours the current selection: a photo picked from the gallery or the device
 * ('custom' + customBackgroundUri), or the bundled image of the selected
 * background. IDs with no photo of their own (e.g. 'black') render nothing
 * here on purpose, falling through to the root view's solid black fill.
 */
export default function MainBackground() {
  const {settings} = useSettings();

  const source =
    settings.backgroundId === 'custom'
      ? settings.customBackgroundUri
        ? {uri: settings.customBackgroundUri}
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
