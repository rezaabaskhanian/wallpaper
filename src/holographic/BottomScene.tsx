import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

// Full-screen scene image (e.g. a lantern-lit road toward a sunrise).
// Drop your PNG at src/holographic/assets/bottom.png to replace the placeholder.
const BOTTOM_IMAGE = require('./assets/bottom.png');

/**
 * The scene image, stretched to fill the whole screen behind the sphere.
 */
export default function BottomScene() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={BOTTOM_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
      />
    </View>
  );
}
