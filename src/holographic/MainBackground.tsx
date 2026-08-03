import React from 'react';
import {ImageBackground, StyleSheet} from 'react-native';
import {BACKGROUNDS} from './config';
import {useSettings} from './SettingsContext';

// Fallback full-screen photo, used for backgrounds that carry no image of their
// own (e.g. 'black' / 'topographic'). Drop your PNG at
// src/holographic/assets/main.png to replace it.
const MAIN_IMAGE = require('./assets/main.png');

/**
 * The full-screen background photo behind the orbiting avatars.
 *
 * Honours the current selection: a photo picked from the gallery or the device
 * ('custom' + customBackgroundUri), otherwise the bundled image of the selected
 * background, otherwise the default main image.
 */
export default function MainBackground() {
  const {settings} = useSettings();

  const source =
    settings.backgroundId === 'custom'
      ? settings.customBackgroundUri
        ? {uri: settings.customBackgroundUri}
        : MAIN_IMAGE
      : BACKGROUNDS.find(b => b.id === settings.backgroundId)?.source ??
        MAIN_IMAGE;

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
