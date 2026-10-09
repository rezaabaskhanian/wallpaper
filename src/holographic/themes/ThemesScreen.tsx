import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ChevronRight} from 'lucide-react-native';
import AppText from '../AppText';
import {showAlert} from '../AppAlert';
import {setWallpaperFromUrl} from '../lockWallpaper';
import {useStore} from '../store/StoreContext';
import type {AppTheme} from '../store/types';
import {setActiveTheme, useActiveTheme} from './activeTheme';
import {messageOfToday} from './dailyMessages';
import {SAMPLE_THEME} from './sampleTheme';
import {ClockWidget, CountdownWidget, MessageWidget, PhotoWidget} from './ThemeWidgets';

type Props = {visible: boolean; onClose: () => void};

/** Example countdown for the preview only («کنکور», 60 days out). */
const PREVIEW_COUNTDOWN = {
  title: 'کنکور',
  target: new Date(Date.now() + 60 * 86_400_000),
};

/**
 * Theme list → theme detail (phone mockup with the wallpaper and the four
 * widgets) → «اعمال تم». Shows the built-in sample theme while the server has
 * none yet.
 */
export default function ThemesScreen({visible, onClose}: Props) {
  const {themes: serverThemes} = useStore();
  const themes = serverThemes.length > 0 ? serverThemes : [SAMPLE_THEME];
  const active = useActiveTheme();
  const [selected, setSelected] = useState<AppTheme | null>(null);
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();

  const close = () => {
    setSelected(null);
    onClose();
  };
  const back = () => (selected ? setSelected(null) : close());

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={back}>
      <View style={[styles.root, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <Pressable
            onPress={back}
            hitSlop={12}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={selected ? 'برگشت' : 'بستن'}>
            {selected ? (
              <ChevronRight size={24} color="#c4b5fd" />
            ) : (
              <AppText style={styles.headerBtnText}>بستن</AppText>
            )}
          </Pressable>
          <AppText style={styles.title}>{selected ? selected.title : 'تم‌ها'}</AppText>
          <View style={styles.headerBtn} />
        </View>

        {selected ? (
          <ThemeDetail
            theme={selected}
            isActive={active?.id === selected.id}
            width={width}
            bottomInset={insets.bottom}
          />
        ) : (
          <FlatList
            data={themes}
            keyExtractor={t => t.id}
            numColumns={2}
            contentContainerStyle={[styles.grid, {paddingBottom: insets.bottom + 24}]}
            columnWrapperStyle={styles.gridRow}
            ListHeaderComponent={
              <AppText style={styles.intro}>
                هر تم یه والپیپر با ویجت‌های هماهنگ صفحه‌ی اصلیه.
              </AppText>
            }
            renderItem={({item}) => (
              <ThemeCard
                theme={item}
                isActive={active?.id === item.id}
                width={(width - 16 * 3) / 2}
                onPress={() => setSelected(item)}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function ThemeCard({
  theme,
  isActive,
  width,
  onPress,
}: {
  theme: AppTheme;
  isActive: boolean;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.card, {width}, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={theme.title}>
      <View style={[styles.cardImage, isActive && styles.cardImageActive]}>
        <Image source={{uri: theme.wallpaperUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {theme.widgetBgWide ? (
          <Image source={{uri: theme.widgetBgWide}} style={styles.cardWidget} resizeMode="cover" />
        ) : null}
        <View style={styles.badges}>
          {isActive ? <Badge text="فعال" strong /> : null}
          {theme.isPremium ? <Badge text="ویژه" /> : null}
        </View>
      </View>
      <AppText style={styles.cardTitle} numberOfLines={1}>
        {theme.title}
      </AppText>
    </Pressable>
  );
}

function Badge({text, strong}: {text: string; strong?: boolean}) {
  return (
    <View style={[styles.badge, strong && styles.badgeStrong]}>
      <AppText style={styles.badgeText}>{text}</AppText>
    </View>
  );
}

function ThemeDetail({
  theme,
  isActive,
  width,
  bottomInset,
}: {
  theme: AppTheme;
  isActive: boolean;
  width: number;
  bottomInset: number;
}) {
  const [busy, setBusy] = useState(false);
  const message = useMemo(() => messageOfToday(), []);
  // Phone mockup: ~70% of the screen width, a 9:19.5 screen; widgets are
  // laid out on a 4-column cell grid like a real launcher.
  const phoneW = Math.min(width * 0.7, 320);
  const phoneH = phoneW * (19.5 / 9);
  const pad = phoneW * 0.06;
  const unit = (phoneW - pad * 2 - phoneW * 0.04) / 4;
  const gap = phoneW * 0.04;

  const apply = async () => {
    setBusy(true);
    try {
      if (!theme.isSample) {
        await setWallpaperFromUrl(theme.wallpaperUrl, 'both');
      }
      await setActiveTheme(theme);
      showAlert(
        'تم فعال شد',
        theme.isSample
          ? 'این تم نمونه‌ست؛ والپیپرش روی گوشی گذاشته نمی‌شه، فقط فعال شد.'
          : `والپیپر «${theme.title}» روی صفحه قفل و اصلی گذاشته شد.`,
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAlert('خطا', `اعمال تم ممکن نشد: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.detail, {paddingBottom: bottomInset + 24}]}>
      <View style={[styles.phone, {width: phoneW, height: phoneH, borderRadius: phoneW * 0.11}]}>
        <Image source={{uri: theme.wallpaperUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={{padding: pad, paddingTop: pad * 2, gap}}>
          <ClockWidget theme={theme} size="wide" unit={unit} />
          <View style={[styles.widgetRow, {gap}]}>
            <PhotoWidget theme={theme} size="small" unit={unit} />
            <CountdownWidget
              theme={theme}
              size="small"
              unit={unit}
              title={PREVIEW_COUNTDOWN.title}
              target={PREVIEW_COUNTDOWN.target}
            />
          </View>
          <MessageWidget theme={theme} size="wide" unit={unit} message={message} />
        </View>
      </View>

      {theme.isPremium ? <AppText style={styles.note}>این تم ویژه‌ست.</AppText> : null}

      {busy ? (
        <ActivityIndicator color="#8b5cf6" size="large" style={styles.busy} />
      ) : (
        <Pressable
          style={({pressed}) => [styles.applyBtn, pressed && styles.pressed]}
          onPress={apply}
          accessibilityRole="button">
          <AppText style={styles.applyText}>{isActive ? 'اعمال دوباره‌ی تم' : 'اعمال تم'}</AppText>
        </Pressable>
      )}
      <AppText style={styles.note}>
        والپیپر روی گوشیت گذاشته می‌شه و ویجت‌ها رنگ و طرح همین تم رو می‌گیرن.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#150c28'},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  headerBtn: {minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center'},
  headerBtnText: {color: '#c4b5fd', fontSize: 16},
  title: {color: '#ffffff', fontSize: 18, fontWeight: '700', writingDirection: 'rtl'},
  intro: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  grid: {paddingHorizontal: 16},
  gridRow: {flexDirection: 'row-reverse', gap: 16, marginBottom: 18},
  card: {},
  pressed: {opacity: 0.8},
  cardImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardImageActive: {borderColor: '#8b5cf6'},
  cardWidget: {
    position: 'absolute',
    top: '12%',
    left: '10%',
    width: '80%',
    aspectRatio: 2,
    borderRadius: 10,
  },
  badges: {position: 'absolute', bottom: 8, right: 8, flexDirection: 'row-reverse', gap: 6},
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeStrong: {backgroundColor: '#7c3aed'},
  badgeText: {color: '#ffffff', fontSize: 12, fontWeight: '700'},
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 8,
    writingDirection: 'rtl',
  },
  detail: {alignItems: 'center', paddingHorizontal: 20, paddingTop: 8},
  phone: {
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#0b0614',
    backgroundColor: '#000',
  },
  widgetRow: {flexDirection: 'row-reverse'},
  applyBtn: {
    alignSelf: 'stretch',
    marginTop: 24,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {color: '#ffffff', fontSize: 17, fontWeight: '700'},
  busy: {marginTop: 24},
  note: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    writingDirection: 'rtl',
  },
});
