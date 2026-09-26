/**
 * Applies the user-selected font everywhere.
 *
 * React Native has no global font setting, and on Android each weight is a
 * separate font file — so we patch <Text>/<TextInput> to inject the ttf that
 * matches each element's fontWeight (unless it already sets its own
 * fontFamily). The active font is read from a mutable module variable that the
 * settings layer keeps in sync via `setAppFont`, so switching fonts in the UI
 * updates every re-rendered piece of text. Import/patch this once, before the
 * app renders.
 */
import React from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';
import {
  DEFAULT_EN_FONT_ID,
  DEFAULT_FA_FONT_ID,
  familyForWeight,
  getScriptFont,
  splitByScript,
} from './fonts';

let currentFaFontId = DEFAULT_FA_FONT_ID;
let currentEnFontId = DEFAULT_EN_FONT_ID;

/** Switch the app-wide fonts. Newly rendered text picks them up immediately. */
export function setAppFonts(faFontId: string, enFontId: string): void {
  currentFaFontId = faFontId;
  currentEnFontId = enFontId;
}

/** Font for the element's weight, picked by the script its text starts in. */
function fontForWeight(text: unknown, weight?: string | number): string {
  const script =
    typeof text === 'string' || typeof text === 'number'
      ? splitByScript(String(text))[0].script
      : 'fa';
  return familyForWeight(
    getScriptFont(script, script === 'en' ? currentEnFontId : currentFaFontId),
    weight,
  );
}

let patched = false;

export function setupFonts(): void {
  if (patched) {
    return;
  }
  patched = true;

  [Text, TextInput].forEach((Comp: any) => {
    const original = Comp.render;
    if (typeof original !== 'function') {
      return;
    }
    Comp.render = function patchedRender(...args: any[]) {
      const element = original.apply(this, args);
      const flat = StyleSheet.flatten(element.props.style) || {};
      // Respect any component that opts into its own font family.
      if (flat.fontFamily) {
        return element;
      }
      const {children, value, placeholder} = element.props;
      const fontFamily = fontForWeight(
        children ?? value ?? placeholder,
        flat.fontWeight,
      );
      return React.cloneElement(element, {
        style: [{fontFamily}, element.props.style],
      });
    };
  });
}
