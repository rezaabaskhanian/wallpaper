import React from 'react';
import {StyleSheet, Text} from 'react-native';
import type {TextProps} from 'react-native';
import {
  familyForWeight,
  getScriptFont,
  splitByScript,
  type ScriptRun,
  type TextScript,
} from './fonts';
import {useSettings} from './SettingsContext';

/**
 * Drop-in replacement for React Native's <Text> that applies the user-selected
 * fonts (matched to the element's fontWeight). There are two selections — one
 * for Persian/Arabic script and one for Latin — and each run of text gets the
 * font for its own script: a fully Persian or fully English string just sets
 * the family, while mixed text ("Good Morning علی") is split into nested
 * <Text> spans. Because it reads the fonts from settings context, every
 * AppText re-renders the moment the user picks a different font.
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
  ({style, children, ...rest}, ref) => {
    const {settings} = useSettings();
    const flat = StyleSheet.flatten(style) || {};

    // Respect an explicit family (e.g. the preview chips).
    if (flat.fontFamily) {
      return (
        <Text ref={ref} {...rest} style={style}>
          {children}
        </Text>
      );
    }

    const {fontWeight, ...withoutWeight} = flat;
    const familyFor = (script: TextScript) =>
      familyForWeight(
        getScriptFont(
          script,
          script === 'en' ? settings.fontIdEn : settings.fontIdFa,
        ),
        fontWeight,
      );

    // Split every plain-string child into script runs; nested elements
    // (e.g. an inner AppText) resolve their own font.
    const parts = React.Children.toArray(children).map(child =>
      typeof child === 'string' || typeof child === 'number'
        ? splitByScript(String(child))
        : child,
    );
    const firstRun = parts.find(Array.isArray) as ScriptRun[] | undefined;
    const outerScript: TextScript = firstRun?.[0].script ?? 'fa';

    const content = parts.flatMap<React.ReactNode>((part, i) =>
      Array.isArray(part)
        ? part.map((run, j) =>
            run.script === outerScript ? (
              run.text
            ) : (
              <Text key={`${i}-${j}`} style={{fontFamily: familyFor(run.script)}}>
                {run.text}
              </Text>
            ),
          )
        : [part],
    );

    return (
      <Text
        ref={ref}
        {...rest}
        style={[withoutWeight, {fontFamily: familyFor(outerScript)}]}>
        {content.length === 1 ? content[0] : content}
      </Text>
    );
  },
);

AppText.displayName = 'AppText';

export default AppText;
