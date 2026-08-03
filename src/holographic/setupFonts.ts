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
import {DEFAULT_FONT_ID, familyForWeight, getFont} from './fonts';

let currentFontId = DEFAULT_FONT_ID;

/** Switch the app-wide font. Newly rendered text picks it up immediately. */
export function setAppFont(fontId: string): void {
  currentFontId = fontId;
}

function fontForWeight(weight?: string | number): string {
  return familyForWeight(getFont(currentFontId), weight);
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
      const fontFamily = fontForWeight(flat.fontWeight);
      return React.cloneElement(element, {
        style: [{fontFamily}, element.props.style],
      });
    };
  });
}
