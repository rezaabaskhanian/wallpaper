import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {formatJalali, toFa} from '../date';
import type {AppTheme} from '../store/types';

/**
 * The four theme widgets drawn as plain React Native views — used for the
 * preview on the theme detail screen and (later) on Reyhan's own launcher
 * home, where Android's widget limits don't apply. The real home-screen
 * widgets (native, RemoteViews) mirror these layouts.
 *
 * `unit` is the size of one widget cell in dp: a 2×2 widget is 2·unit square,
 * a 4×2 one is 4·unit wide. The look comes from the theme's background image;
 * we only lay text/photos on top in its colours.
 */
export type WidgetSize = 'small' | 'wide';

/** Widget text always uses Vazirmatn, the same font the native widgets use. */
const FONT = 'Vazirmatn-Regular';
const FONT_BOLD = 'Vazirmatn-Bold';

type BaseProps = {
  theme: AppTheme;
  size: WidgetSize;
  unit: number;
  style?: StyleProp<ViewStyle>;
};

function Frame({theme, size, unit, style, children}: BaseProps & {children: React.ReactNode}) {
  const w = (size === 'wide' ? 4 : 2) * unit;
  const h = 2 * unit;
  const bg = size === 'wide' ? theme.widgetBgWide : theme.widgetBgSmall;
  return (
    <View style={[styles.frame, {width: w, height: h, borderRadius: unit * 0.28}, style]}>
      {bg ? (
        <Image source={{uri: bg}} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.plainBg]} />
      )}
      <View style={[styles.content, {padding: unit * 0.18}]}>{children}</View>
    </View>
  );
}

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** ۱. ساعت و تاریخ شمسی */
export function ClockWidget(props: BaseProps) {
  const {theme, size, unit} = props;
  const now = useNow(15_000);
  const hh = toFa(String(now.getHours()).padStart(2, '0'));
  const mm = toFa(String(now.getMinutes()).padStart(2, '0'));
  return (
    <Frame {...props}>
      <Text
        style={[styles.text, {color: theme.textColor, fontFamily: FONT_BOLD, fontSize: unit * (size === 'wide' ? 0.62 : 0.5)}]}>
        {hh}:{mm}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.text, {color: theme.accentColor, fontFamily: FONT, fontSize: unit * 0.17}]}>
        {formatJalali(now)}
      </Text>
    </Frame>
  );
}

/** ۲. پیام روز */
export function MessageWidget(props: BaseProps & {message: string}) {
  const {theme, unit, message} = props;
  return (
    <Frame {...props}>
      <Text style={[styles.text, {color: theme.accentColor, fontFamily: FONT, fontSize: unit * 0.15}]}>
        پیام امروز
      </Text>
      <Text
        numberOfLines={3}
        style={[styles.text, {color: theme.textColor, fontFamily: FONT_BOLD, fontSize: unit * 0.2, marginTop: unit * 0.06}]}>
        {message}
      </Text>
    </Frame>
  );
}

/** ۳. قاب عکس — without a photo it shows a hint instead. */
export function PhotoWidget(props: BaseProps & {photoUri?: string | null}) {
  const {theme, unit, photoUri} = props;
  return (
    <Frame {...props}>
      {photoUri ? (
        <Image
          source={{uri: photoUri}}
          style={[styles.photo, {borderRadius: unit * 0.16}]}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.text, {color: theme.textColor, fontFamily: FONT, fontSize: unit * 0.16}]}>
          عکس خودت اینجا
        </Text>
      )}
    </Frame>
  );
}

/** ۴. شمارش معکوس — whole days from today to `target`. */
export function CountdownWidget(props: BaseProps & {title: string; target: Date}) {
  const {theme, unit, title, target} = props;
  const now = useNow(60 * 60_000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(0, Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000));
  return (
    <Frame {...props}>
      <Text numberOfLines={1} style={[styles.text, {color: theme.accentColor, fontFamily: FONT, fontSize: unit * 0.17}]}>
        تا {title}
      </Text>
      <Text style={[styles.text, {color: theme.textColor, fontFamily: FONT_BOLD, fontSize: unit * 0.5}]}>
        {toFa(days)}
      </Text>
      <Text style={[styles.text, {color: theme.textColor, fontFamily: FONT, fontSize: unit * 0.15}]}>
        روز مانده
      </Text>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: {overflow: 'hidden'},
  plainBg: {backgroundColor: 'rgba(20,12,40,0.85)'},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  text: {textAlign: 'center', writingDirection: 'rtl', includeFontPadding: false},
  photo: {width: '100%', height: '100%'},
});
