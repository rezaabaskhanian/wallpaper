import React from 'react';
import {StyleSheet, Text} from 'react-native';
import type {TextProps} from 'react-native';
import {familyForWeight, getFont} from './fonts';
import {useSettings} from './SettingsContext';

/**
 * Drop-in replacement for React Native's <Text> that applies the user-selected
 * font (matched to the element's fontWeight). Because it reads the font from
 * settings context, every AppText re-renders and re-applies the family the
 * moment the user picks a different font — no global monkey-patch needed.
 *
 * IMPORTANT (Android): a custom asset `fontFamily` must NOT be combined with
 * `fontWeight`. Our ttf files encode the weight in the file name (…-Bold), and
 * if we also pass fontWeight Android tries to weight-match inside the family,
 * fails for single-weight ttf files, and silently falls back to the system
 * font. So we resolve the correct ttf from the weight, then strip fontWeight.
 *
 * A caller can still force a specific family by passing `fontFamily` in `style`
 * (e.g. the font-preview chips); that is left untouched.
 */
const AppText = React.forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({style, ...rest}, ref) => {
    const {settings} = useSettings();
    const flat = StyleSheet.flatten(style) || {};

    // Respect an explicit family (e.g. the preview chips).
    if (flat.fontFamily) {
      return <Text ref={ref} {...rest} style={style} />;
    }

    const {fontWeight, ...withoutWeight} = flat;
    const fontFamily = familyForWeight(getFont(settings.fontId), fontWeight);
    return <Text ref={ref} {...rest} style={[withoutWeight, {fontFamily}]} />;
  },
);

AppText.displayName = 'AppText';

export default AppText;
