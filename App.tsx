/**
 * Noor Launcher — Holographic home (prototype)
 *
 * @format
 */

import React from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppAlertHost from './src/holographic/AppAlert';
import HolographicHome from './src/holographic/HolographicHome';
import {SettingsProvider} from './src/holographic/SettingsContext';
import {StoreProvider} from './src/holographic/store/StoreContext';

/**
 * `mode` arrives as an initial prop from native. The Screen Saver
 * (HolographicDreamService) launches the same root with mode="dream" so the
 * scene can hide its interactive chrome while dreaming.
 */
function App({mode}: {mode?: string}) {
  const dream = mode === 'dream';
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <StoreProvider>
            <StatusBar hidden translucent backgroundColor="transparent" />
            <View style={styles.root}>
              <HolographicHome dream={dream} />
            </View>
            <AppAlertHost />
          </StoreProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
