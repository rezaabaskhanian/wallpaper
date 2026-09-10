import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSettings} from './SettingsContext';

export type TouchRippleHandle = {
  addRipple: (x: number, y: number) => void;
};

type RippleData = {id: number; x: number; y: number};

const RIPPLE_SIZE = 120;
/** Caps ripples kept alive at once if the user taps faster than they fade. */
const MAX_RIPPLES = 6;

function Ripple({
  data,
  color,
  onDone,
}: {
  data: RippleData;
  color: string;
  onDone: (id: number) => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(
      1,
      {duration: 650, easing: Easing.out(Easing.quad)},
      finished => {
        'worklet';
        if (finished) {
          runOnJS(onDone)(data.id);
        }
      },
    );
  }, [progress, data.id, onDone]);

  const style = useAnimatedStyle(() => ({
    transform: [{scale: 0.2 + progress.value * 0.8}],
    opacity: (1 - progress.value) * 0.55,
  }));

  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          left: data.x - RIPPLE_SIZE / 2,
          top: data.y - RIPPLE_SIZE / 2,
          borderColor: color,
          shadowColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * Expanding glow ring at each tap point on the wallpaper — see Settings ▸
 * عمومی ▸ واکنش لمسی. Imperative (via ref) rather than props so a fast burst
 * of taps only re-renders this layer, not the whole screen.
 */
const TouchRippleLayer = forwardRef<TouchRippleHandle>((_props, ref) => {
  const {resolvedGlowColor} = useSettings();
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const nextId = useRef(0);

  const addRipple = useCallback((x: number, y: number) => {
    const id = nextId.current++;
    setRipples(prev => [...prev.slice(-(MAX_RIPPLES - 1)), {id, x, y}]);
  }, []);

  const removeRipple = useCallback((id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({addRipple}), [addRipple]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ripples.map(r => (
        <Ripple
          key={r.id}
          data={r}
          color={resolvedGlowColor}
          onDone={removeRipple}
        />
      ))}
    </View>
  );
});

export default TouchRippleLayer;

const styles = StyleSheet.create({
  ripple: {
    position: 'absolute',
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
    borderWidth: 1.5,
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
});
