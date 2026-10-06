import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {setWallpaperFromUrl} from './lockWallpaper';
import {announceWallpaperSet} from './oneTapWallpaper';
import {useStore} from './store/StoreContext';
import type {WallpaperCategory, WallpaperItem} from './store/types';
import {trackWallpaperDownload} from './store/wallpaperDownload';

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Home-screen "mood" picker. Categories the admin gave a mood emoji show up as
 * chips; tapping one opens a full-screen random wallpaper from that mood with
 * two actions only — set it, or show another. Premium wallpapers are included
 * (locked ones offer the unlock instead of "set").
 */
export default function MoodPicker({bottom}: {bottom: number}) {
  const insets = useSafeAreaInsets();
  const {catalog, isUnlocked, buyUnlock} = useStore();
  const [mood, setMood] = useState<WallpaperCategory | null>(null);
  const [current, setCurrent] = useState<WallpaperItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  // Shuffled queue per open mood, so "another one" doesn't repeat until the
  // whole mood has been seen.
  const queueRef = useRef<WallpaperItem[]>([]);
  const posRef = useRef(0);

  const moods = useMemo(
    () => (catalog?.categories ?? []).filter(c => !!c.mood),
    [catalog],
  );

  const poolFor = useCallback(
    (cat: WallpaperCategory) =>
      (catalog?.wallpapers ?? []).filter(
        w => w.category === cat.id || catalogParent(catalog, w.category) === cat.id,
      ),
    [catalog],
  );

  const show = (item: WallpaperItem) => {
    setImgLoading(true);
    setCurrent(item);
    const next = queueRef.current[(posRef.current + 1) % queueRef.current.length];
    if (next) Image.prefetch(next.full).catch(() => {});
  };

  const open = (cat: WallpaperCategory) => {
    const pool = poolFor(cat);
    if (pool.length === 0) return;
    queueRef.current = shuffled(pool);
    posRef.current = 0;
    setMood(cat);
    show(queueRef.current[0]);
  };

  const another = () => {
    const q = queueRef.current;
    if (q.length === 0) return;
    posRef.current += 1;
    if (posRef.current >= q.length) {
      // Reshuffle, and don't repeat the one just shown at the seam.
      const last = current;
      queueRef.current = shuffled(q);
      if (q.length > 1 && queueRef.current[0].id === last?.id) {
        queueRef.current.push(queueRef.current.shift()!);
      }
      posRef.current = 0;
    }
    show(queueRef.current[posRef.current]);
  };

  const close = () => {
    setMood(null);
    setCurrent(null);
  };

  const apply = async (item: WallpaperItem) => {
    setBusy(true);
    try {
      await setWallpaperFromUrl(item.full, 'both');
      trackWallpaperDownload(item.id);
      announceWallpaperSet('both', 'mood');
      close();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAlert('خطا', `تنظیم والپیپر ممکن نشد: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const unlock = async () => {
    try {
      if (await buyUnlock()) {
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

  if (moods.length === 0) return null;

  const locked = current ? !isUnlocked(current) : false;

  return (
    <>
      <View style={[styles.strip, {bottom}]} pointerEvents="box-none">
        <AppText style={styles.stripTitle}>امروز چه حالی داری؟</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {moods.map(c => (
            <Pressable
              key={c.id}
              style={({pressed}) => [styles.chip, pressed && styles.chipPressed]}
              onPress={() => open(c)}
              accessibilityRole="button">
              <AppText style={styles.chipEmoji}>{c.mood}</AppText>
              <AppText style={styles.chipText}>{c.title}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Modal visible={!!mood} animationType="fade" onRequestClose={close}>
        <View style={styles.full}>
          {current ? (
            <Image
              source={{uri: current.full}}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onLoadEnd={() => setImgLoading(false)}
            />
          ) : null}
          {imgLoading ? (
            <ActivityIndicator style={styles.spinner} color="#fff" size="large" />
          ) : null}
          {locked ? <View style={styles.lockedShade} pointerEvents="none" /> : null}

          <Pressable
            style={[styles.closeBtn, {top: insets.top + 12}]}
            onPress={close}
            hitSlop={12}>
            <AppText style={styles.closeText}>✕</AppText>
          </Pressable>

          <View style={[styles.actions, {paddingBottom: insets.bottom + 20}]}>
            {busy ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Pressable
                  style={styles.primary}
                  onPress={() => (current && !locked ? apply(current) : unlock())}>
                  <AppText style={styles.primaryText}>
                    {locked ? '🔒 باز کردن همهٔ والپیپرها' : '✨ بذار روی گوشیم'}
                  </AppText>
                </Pressable>
                <Pressable style={styles.secondary} onPress={another}>
                  <AppText style={styles.secondaryText}>🔄 یکی دیگه</AppText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function catalogParent(
  catalog: {categories: WallpaperCategory[]} | null,
  id: string,
): string | null | undefined {
  return catalog?.categories.find(c => c.id === id)?.parentId;
}

const styles = StyleSheet.create({
  strip: {position: 'absolute', left: 0, right: 0, zIndex: 320},
  stripTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 6,
  },
  chips: {flexGrow: 1, justifyContent: 'center', gap: 10, paddingHorizontal: 14},
  chip: {
    alignItems: 'center',
    minWidth: 76,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(23,11,40,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
  },
  chipPressed: {backgroundColor: 'rgba(139,92,246,0.5)'},
  chipEmoji: {fontSize: 26},
  chipText: {color: '#eafffb', fontSize: 13, marginTop: 2, writingDirection: 'rtl'},
  full: {flex: 1, backgroundColor: '#000'},
  spinner: {...(StyleSheet.absoluteFill as object)},
  lockedShade: {...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.45)'},
  closeBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {color: '#fff', fontSize: 18},
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 40,
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  primary: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: {color: '#fff', fontSize: 17, fontWeight: '800', writingDirection: 'rtl'},
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {color: '#fff', fontSize: 16, fontWeight: '700', writingDirection: 'rtl'},
});
