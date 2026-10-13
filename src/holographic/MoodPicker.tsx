import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import AutoChangeSheet from './AutoChangeSheet';
import {hoursLabel, sameSource, useAutoWallpaper, type AutoSource} from './autoWallpaper';
import {toFa} from './date';
import {useStore} from './store/StoreContext';
import type {WallpaperCategory, WallpaperItem} from './store/types';
import {trackWallpaperDownload} from './store/wallpaperDownload';
import {trackPaywall} from './analytics';
import {toggleFavorite, useFavorites} from './favorites';
import {shareWallpaper} from './share';

/** Width of a mood card; the cover is a portrait 1:1.4 like a phone screen. */
const CARD_W = 68;

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Home-screen "mood" picker. Categories the admin marked as a mood (mood
 * emoji set) show up as cards with a real wallpaper cover and the name; tapping one opens a full-screen random wallpaper from that mood with
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
  // «تعویض خودکار» sheet for the open mood (null = closed).
  const [autoSource, setAutoSource] = useState<AutoSource | null>(null);
  const auto = useAutoWallpaper();
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

  const locked = current ? !isUnlocked(current) : false;
  const favorites = useFavorites();
  const liked = !!current && favorites.some(f => f.full === current.full);
  // A locked wallpaper on screen shows the unlock button: one paywall view.
  useEffect(() => {
    if (locked) trackPaywall('paywall_shown');
  }, [locked, current?.id]);

  if (moods.length === 0) return null;

  return (
    <>
      <View style={[styles.strip, {bottom}]} pointerEvents="box-none">
        <AppText style={styles.stripTitle}>امروز چه حالی داری؟</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {moods.map(c => {
            // Server-picked cover; fall back to the mood's first free
            // wallpaper for a catalog cached before covers existed.
            const pool = poolFor(c);
            const cover = c.cover ?? (pool.find(w => !w.premium) ?? pool[0])?.thumb;
            return (
              <Pressable
                key={c.id}
                style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => open(c)}
                accessibilityRole="button"
                accessibilityLabel={c.title}>
                <View style={styles.cardImageWrap}>
                  {cover ? (
                    <Image source={{uri: cover}} style={styles.cardImage} resizeMode="cover" />
                  ) : null}
                </View>
                <AppText style={styles.cardText} numberOfLines={1}>
                  {c.title}
                </AppText>
              </Pressable>
            );
          })}
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
          {current ? (
            <Pressable
              style={[styles.closeBtn, styles.shareBtn, {top: insets.top + 12}]}
              onPress={() => shareWallpaper(current)}
              hitSlop={12}
              accessibilityLabel="اشتراک‌گذاری">
              <AppText style={styles.closeText}>📤</AppText>
            </Pressable>
          ) : null}
          {current ? (
            <Pressable
              style={[styles.closeBtn, styles.heartBtn, {top: insets.top + 12}]}
              onPress={() => toggleFavorite(current)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'حذف از مجموعه‌ی من' : 'افزودن به مجموعه‌ی من'}>
              <AppText style={styles.closeText}>{liked ? '❤️' : '🤍'}</AppText>
            </Pressable>
          ) : null}

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
                {mood ? (
                  <Pressable
                    style={styles.dailyRow}
                    onPress={() => setAutoSource({kind: 'category', id: mood.id, title: mood.title})}
                    hitSlop={8}>
                    <AppText style={styles.dailyText}>
                      {auto && sameSource(auto.source, {kind: 'category', id: mood.id, title: ''})
                        ? `✅ ${hoursLabel(auto.hours, toFa)} خودش عوض می‌شه (برای تغییر بزن)`
                        : '🔁 تعویض خودکار از این مود'}
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
        <AutoChangeSheet source={autoSource} onClose={() => setAutoSource(null)} />
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
  chips: {flexGrow: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 16},
  card: {width: CARD_W, alignItems: 'center'},
  cardPressed: {opacity: 0.75, transform: [{scale: 0.96}]},
  cardImageWrap: {
    width: CARD_W,
    height: CARD_W * 1.4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(23,11,40,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cardImage: {width: '100%', height: '100%'},
  cardText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
  },
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
  shareBtn: {left: undefined, right: 16},
  heartBtn: {left: undefined, right: 68},
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
  dailyRow: {alignItems: 'center', paddingVertical: 6},
  dailyText: {color: '#fff', fontSize: 14, writingDirection: 'rtl', opacity: 0.9},
  secondaryText: {color: '#fff', fontSize: 16, fontWeight: '700', writingDirection: 'rtl'},
});
