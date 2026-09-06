import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import AppText from './AppText';
import {useActiveOrbitCategory} from './data';
import {useSettings} from './SettingsContext';
import {useStore} from './store/StoreContext';

/**
 * Small pill row letting the user switch which orbit theme (e.g. "شهدا" vs
 * "طبیعت") populates the rotating logos — and, when a theme defines its own
 * centerImage, the central portrait too. Hidden entirely when the backend
 * only has one theme, so it never shows up as clutter for the common case.
 */
export default function OrbitThemeSwitcher() {
  const {orbitCategories} = useStore();
  const {update} = useSettings();
  const active = useActiveOrbitCategory();

  if (orbitCategories.length < 2) {
    return null;
  }

  return (
    <View style={styles.row} pointerEvents="box-none">
      {orbitCategories.map(c => {
        const isActive = c.id === active?.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => update('orbitCategoryId', c.id)}
            style={[styles.pill, isActive && styles.pillActive]}>
            <AppText style={[styles.pillText, isActive && styles.pillTextActive]}>
              {c.title}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 96,
    left: 20,
    right: 20,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    zIndex: 300,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(8,32,31,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.25)',
  },
  pillActive: {
    backgroundColor: 'rgba(64,224,208,0.28)',
    borderColor: '#2dd4bf',
  },
  pillText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    writingDirection: 'rtl',
  },
  pillTextActive: {
    color: '#eafffb',
    fontWeight: '700',
  },
});
