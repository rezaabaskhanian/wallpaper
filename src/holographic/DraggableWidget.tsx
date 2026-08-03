import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import AppText from './AppText';
import type {LayoutOffset} from './SettingsContext';

type Props = {
  /** Current saved offset from the widget's default anchor. */
  offset: LayoutOffset;
  /** When true the widget can be dragged and shows an edit outline. */
  editing: boolean;
  /** Called with the new offset when a drag ends. */
  onCommit: (offset: LayoutOffset) => void;
  /** Short label shown while editing. */
  label: string;
  /** The anchor style (usually an absolutely-positioned wrap). */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Wraps a widget so the user can drag it to a new position while "edit layout"
 * mode is on. The position is stored as an (x, y) offset from the widget's
 * default anchor, so turning edit mode off keeps it exactly where it was left.
 * Outside edit mode it's inert (pointerEvents: none), just like before.
 */
export default function DraggableWidget({
  offset,
  editing,
  onCommit,
  label,
  style,
  children,
}: Props) {
  const tx = useSharedValue(offset.x);
  const ty = useSharedValue(offset.y);

  // Keep the animated position in sync when the offset changes from outside
  // (e.g. a "reset positions" action) rather than from a local drag.
  useEffect(() => {
    tx.value = offset.x;
    ty.value = offset.y;
  }, [offset.x, offset.y, tx, ty]);

  const pan = Gesture.Pan()
    .enabled(editing)
    .onChange(e => {
      'worklet';
      tx.value += e.changeX;
      ty.value += e.changeY;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onCommit)({x: tx.value, y: ty.value});
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: tx.value}, {translateY: ty.value}],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        pointerEvents={editing ? 'box-only' : 'none'}
        style={[style, animatedStyle]}>
        {children}
        {editing ? (
          <>
            <View pointerEvents="none" style={styles.outline} />
            <View pointerEvents="none" style={styles.badge}>
              <AppText style={styles.badgeText}>⇅ {label}</AppText>
            </View>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  outline: {
    position: 'absolute',
    top: -8,
    left: -10,
    right: -10,
    bottom: -8,
    borderWidth: 1.5,
    borderColor: 'rgba(64,224,208,0.9)',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'rgba(64,224,208,0.08)',
  },
  badge: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    backgroundColor: 'rgba(8,32,31,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.5)',
  },
  badgeText: {
    color: '#eafffb',
    fontSize: 12,
    writingDirection: 'rtl',
  },
});
