module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // react-native-worklets/plugin (Reanimated 4) must be listed last.
    'react-native-worklets/plugin',
  ],
};
