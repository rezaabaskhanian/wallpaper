import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {setWallpaperFromUrl} from './lockWallpaper';
import type {WallpaperTarget} from './lockWallpaper';
import {useSettings} from './SettingsContext';
import {useStore} from './store/StoreContext';
import type {WallpaperItem} from './store/types';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Locked-wallpaper thumbnail with a slow Ken Burns zoom + a pulsing lock icon,
 * meant to tempt the purchase more than a flat static badge would. Toggled by
 * settings.animatedLockedPreview.
 */
function LockedThumb({uri}: {uri: string}) {
  const zoom = useSharedValue(1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    zoom.value = withRepeat(
      withSequence(
        withTiming(1.12, {duration: 4200, easing: Easing.inOut(Easing.sin)}),
        withTiming(1, {duration: 4200, easing: Easing.inOut(Easing.sin)}),
      ),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1100, easing: Easing.inOut(Easing.sin)}),
        withTiming(0, {duration: 1100, easing: Easing.inOut(Easing.sin)}),
      ),
      -1,
      true,
    );
  }, [zoom, pulse]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{scale: zoom.value}],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    transform: [{scale: 1 + pulse.value * 0.18}],
    opacity: 0.85 + pulse.value * 0.15,
  }));

  return (
    <>
      <Animated.Image
        source={{uri}}
        style={[styles.thumb, imageStyle]}
        resizeMode="cover"
      />
      <View style={styles.lockOverlay}>
        <Animated.Text style={[styles.lockIcon, lockStyle]}>🔒</Animated.Text>
      </View>
    </>
  );
}

/**
 * Downloadable-wallpaper gallery. Fetches the catalog from the backend, shows a
 * grid of thumbnails (premium items locked behind the "unlock all" purchase),
 * and lets the user apply a wallpaper as the app background or the device
 * lock/home wallpaper.
 */
export default function WallpaperGallery({visible, onClose}: Props) {
  const {width} = useWindowDimensions();
  const {settings, update} = useSettings();
  const {
    catalog,
    loading,
    error,
    premiumUnlocked,
    billingAvailable,
    reload,
    buyUnlock,
    isUnlocked,
  } = useStore();

  const [activeCat, setActiveCat] = useState<string>('all');
  const [selected, setSelected] = useState<WallpaperItem | null>(null);
  const [busy, setBusy] = useState(false);

  const columns = 3;
  const gap = 10;
  const cellWidth = (width - gap * (columns + 1)) / columns;

  const items = useMemo(() => {
    const all = catalog?.wallpapers ?? [];
    return activeCat === 'all'
      ? all
      : all.filter(w => w.category === activeCat);
  }, [catalog, activeCat]);

  const startPurchase = async () => {
    try {
      const ok = await buyUnlock();
      if (ok) {
        showAlert('باز شد', 'همهٔ والپیپرها باز شدند. لذت ببر!');
      }
    } catch (e: any) {
      showAlert(
        'پرداخت',
        e?.message === 'BILLING_UNAVAILABLE'
          ? 'پرداخت کافه‌بازار هنوز روی این نسخه فعال نیست.'
          : 'خرید انجام نشد.',
      );
    }
  };

  const onPressItem = (item: WallpaperItem) => {
    if (!isUnlocked(item)) {
      showAlert(
        'والپیپر ویژه 🔒',
        'برای دسترسی به همهٔ والپیپرها، بستهٔ کامل را باز کن.',
        {confirmText: 'باز کردن همه', onConfirm: startPurchase},
      );
      return;
    }
    setSelected(item);
  };

  const applyInApp = (item: WallpaperItem) => {
    update('customBackgroundUri', item.full);
    update('backgroundId', 'custom');
    setSelected(null);
    onClose();
    showAlert('انجام شد', 'به‌عنوان پس‌زمینهٔ اپ تنظیم شد.');
  };

  const applyToDevice = async (item: WallpaperItem, target: WallpaperTarget) => {
    setBusy(true);
    try {
      await setWallpaperFromUrl(item.full, target);
      const where =
        target === 'home' ? 'صفحهٔ اصلی' : target === 'both' ? 'اصلی و قفل' : 'صفحهٔ قفل';
      showAlert('انجام شد', `والپیپر ${where} تنظیم شد.`);
      setSelected(null);
    } catch {
      showAlert('خطا', 'تنظیم والپیپر ممکن نشد. (اپ را rebuild کرده‌ای؟)');
    } finally {
      setBusy(false);
    }
  };

  const categories = [
    {id: 'all', title: 'همه'},
    ...(catalog?.categories ?? []),
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <AppText style={styles.headerBtnText}>بستن</AppText>
          </Pressable>
          <AppText style={styles.title}>گالری والپیپر</AppText>
          <Pressable onPress={reload} hitSlop={12} style={styles.headerBtn}>
            <AppText style={styles.headerBtnText}>↻</AppText>
          </Pressable>
        </View>

        {/* Unlock banner */}
        {!premiumUnlocked ? (
          <Pressable
            style={styles.unlockBanner}
            onPress={startPurchase}
            disabled={!billingAvailable}>
            <AppText style={styles.unlockText}>
              {billingAvailable
                ? '🔓 باز کردن همهٔ والپیپرها (خرید یک‌باره)'
                : '🔒 والپیپرهای ویژه — پرداخت به‌زودی فعال می‌شود'}
            </AppText>
          </Pressable>
        ) : null}

        {/* Categories */}
        <View style={styles.cats}>
          {categories.map(c => {
            const active = c.id === activeCat;
            return (
              <Pressable
                key={c.id}
                onPress={() => setActiveCat(c.id)}
                style={[styles.cat, active && styles.catActive]}>
                <AppText style={[styles.catText, active && styles.catTextActive]}>
                  {c.title}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#2dd4bf" size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>خطا: {error}</AppText>
            <Pressable style={styles.retry} onPress={reload}>
              <AppText style={styles.retryText}>تلاش دوباره</AppText>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>هنوز والپیپری نیست.</AppText>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            numColumns={columns}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            renderItem={({item}) => {
              const locked = !isUnlocked(item);
              return (
                <Pressable
                  onPress={() => onPressItem(item)}
                  style={[styles.cell, {width: cellWidth}]}>
                  {locked && settings.animatedLockedPreview ? (
                    <LockedThumb uri={item.thumb} />
                  ) : (
                    <>
                      <Image
                        source={{uri: item.thumb}}
                        style={styles.thumb}
                        resizeMode="cover"
                      />
                      {locked ? (
                        <View style={styles.lockOverlay}>
                          <AppText style={styles.lockIcon}>🔒</AppText>
                        </View>
                      ) : null}
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        )}

        {/* Preview + actions */}
        <Modal
          visible={!!selected}
          transparent
          animationType="fade"
          onRequestClose={() => setSelected(null)}>
          <Pressable style={styles.previewBackdrop} onPress={() => setSelected(null)} />
          <View style={styles.previewSheet}>
            {selected ? (
              <>
                <Image
                  source={{uri: selected.full}}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <AppText style={styles.previewTitle}>{selected.title}</AppText>
                {busy ? (
                  <ActivityIndicator color="#2dd4bf" style={styles.busySpinner} />
                ) : (
                  <>
                    <Pressable
                      style={styles.action}
                      onPress={() => applyInApp(selected)}>
                      <AppText style={styles.actionText}>
                        🖼️ پس‌زمینهٔ اپ
                      </AppText>
                    </Pressable>
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.action, styles.actionHalf]}
                        onPress={() => applyToDevice(selected, 'lock')}>
                        <AppText style={styles.actionText}>🔒 قفل</AppText>
                      </Pressable>
                      <Pressable
                        style={[styles.action, styles.actionHalf]}
                        onPress={() => applyToDevice(selected, 'home')}>
                        <AppText style={styles.actionText}>🏠 اصلی</AppText>
                      </Pressable>
                      <Pressable
                        style={[styles.action, styles.actionHalf]}
                        onPress={() => applyToDevice(selected, 'both')}>
                        <AppText style={styles.actionText}>هردو</AppText>
                      </Pressable>
                    </View>
                  </>
                )}
                <Pressable
                  style={styles.previewClose}
                  onPress={() => setSelected(null)}>
                  <AppText style={styles.previewCloseText}>بستن</AppText>
                </Pressable>
              </>
            ) : null}
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#08201f'},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {color: '#eafffb', fontSize: 18, fontWeight: '700', writingDirection: 'rtl'},
  headerBtn: {paddingHorizontal: 8, paddingVertical: 4},
  headerBtnText: {color: '#9be7d8', fontSize: 16},
  unlockBanner: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: 'rgba(245,196,81,0.15)',
    borderColor: 'rgba(245,196,81,0.5)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  unlockText: {color: '#f5e6b3', fontSize: 14, fontWeight: '700', writingDirection: 'rtl'},
  cats: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  cat: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.2)',
  },
  catActive: {backgroundColor: 'rgba(64,224,208,0.22)', borderColor: '#2dd4bf'},
  catText: {color: 'rgba(255,255,255,0.7)', fontSize: 13, writingDirection: 'rtl'},
  catTextActive: {color: '#eafffb', fontWeight: '700'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  muted: {color: 'rgba(255,255,255,0.6)', fontSize: 15, writingDirection: 'rtl'},
  retry: {
    backgroundColor: 'rgba(64,224,208,0.2)',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {color: '#eafffb', fontWeight: '700'},
  gridContent: {padding: 10},
  gridRow: {gap: 10, marginBottom: 10},
  busySpinner: {marginVertical: 12},
  cell: {
    aspectRatio: 0.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  thumb: {width: '100%', height: '100%'},
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {fontSize: 26},
  previewBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  previewSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#08201f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(64,224,208,0.25)',
    alignItems: 'stretch',
  },
  previewImage: {
    width: '60%',
    aspectRatio: 0.5,
    alignSelf: 'center',
    borderRadius: 16,
    marginBottom: 12,
  },
  previewTitle: {
    color: '#eafffb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    writingDirection: 'rtl',
  },
  action: {
    backgroundColor: 'rgba(64,224,208,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.3)',
    marginTop: 8,
  },
  actionRow: {flexDirection: 'row-reverse', gap: 8},
  actionHalf: {flex: 1},
  actionText: {color: '#eafffb', fontSize: 15, fontWeight: '700', writingDirection: 'rtl'},
  previewClose: {alignItems: 'center', paddingVertical: 12, marginTop: 6},
  previewCloseText: {color: '#9be7d8', fontSize: 15},
});
