import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Image,
  Modal,
  Pressable,
  ScrollView,
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
import type {WallpaperCategory, WallpaperItem} from './store/types';
import {trackWallpaperDownload} from './store/wallpaperDownload';
import {toFa} from './date';
import {occasionDay} from './occasionReminders';
import {trackPaywall} from './analytics';
import {useMarkWallpapersSeen} from './newWallpapers';
import {toggleFavorite, useFavorites} from './favorites';
import {shareWallpaper} from './share';
import {PollCard, RequestCard} from './FeedbackCards';
import AutoChangeSheet from './AutoChangeSheet';
import {hoursLabel, sameSource, useAutoWallpaper, type AutoSource} from './autoWallpaper';
import {announceWallpaperSet} from './oneTapWallpaper';

/** Width ÷ height of a category card (and of the showcase's small ones). */
const CARD_ASPECT = 0.8;

/** How many wallpapers the «تازه‌ها» / «محبوب‌ها» rows show. */
const ROW_SIZE = 15;
/** Thumbnail width in those rows. */
const ROW_THUMB_W = 104;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Open straight into this category (e.g. from an occasion reminder). */
  initialCategoryId?: string | null;
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
 * One horizontally-scrolling row of category chips, right-to-left ("همه" at the
 * right edge). On an RTL device the native layout already flips the row and
 * starts the scroll at the right; on an LTR device we reverse it ourselves and
 * jump to the end so the first chip is the one visible.
 */
function ChipRow({children, style}: {children: React.ReactNode; style?: any}) {
  const ref = useRef<ScrollView>(null);
  return (
    <View style={style}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.chipRow,
          !I18nManager.isRTL && styles.chipRowReverse,
        ]}
        onContentSizeChange={() => {
          if (!I18nManager.isRTL) {
            ref.current?.scrollToEnd({animated: false});
          }
        }}>
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Downloadable-wallpaper gallery. Fetches the catalog from the backend, shows a
 * grid of thumbnails (premium items locked behind the "unlock all" purchase),
 * and lets the user apply a wallpaper as the app background or the device
 * lock/home wallpaper.
 */
export default function WallpaperGallery({visible, onClose, initialCategoryId}: Props) {
  const {width} = useWindowDimensions();
  const {settings, update} = useSettings();
  const {
    catalog,
    loading,
    error,
    premiumUnlocked,
    hasPremiumWallpapers,
    billingAvailable,
    reload,
    buyUnlock,
    isUnlocked,
    occasions,
  } = useStore();

  // null = the gallery's front page (rows + category cards); otherwise the
  // id of the top-level category being browsed.
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<WallpaperItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeSubCat, setActiveSubCat] = useState<string>('all');

  const columns = 3;
  const gap = 10;
  const cellWidth = (width - gap * (columns + 1)) / columns;

  const allWallpapers = useMemo(() => catalog?.wallpapers ?? [], [catalog]);

  // Wallpapers of a top-level category, including all its subcategories.
  // Catalog order is already the server's ranking, so [0] is its best pick.
  const itemsByTopCat = useMemo(() => {
    const parentOf = new Map<string, string>();
    for (const c of catalog?.categories ?? []) {
      parentOf.set(c.id, c.parentId || c.id);
    }
    const map = new Map<string, WallpaperItem[]>();
    for (const w of allWallpapers) {
      const top = parentOf.get(w.category) ?? w.category;
      map.set(top, [...(map.get(top) ?? []), w]);
    }
    return map;
  }, [catalog, allWallpapers]);

  const topCategories = useMemo(
    () =>
      (catalog?.categories ?? []).filter(
        c => !c.parentId && (itemsByTopCat.get(c.id)?.length ?? 0) > 0,
      ),
    [catalog, itemsByTopCat],
  );

  const subCategories = useMemo(
    () => (catalog?.categories ?? []).filter(c => activeCat && c.parentId === activeCat),
    [catalog, activeCat],
  );

  const newest = useMemo(
    () =>
      allWallpapers.some(w => w.createdAt)
        ? [...allWallpapers]
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
            .slice(0, ROW_SIZE)
        : [],
    [allWallpapers],
  );

  const popular = useMemo(
    () =>
      allWallpapers.some(w => (w.downloadCount ?? 0) > 0)
        ? [...allWallpapers]
            .sort((a, b) => (b.downloadCount ?? 0) - (a.downloadCount ?? 0))
            .slice(0, ROW_SIZE)
        : [],
    [allWallpapers],
  );

  const items = useMemo(() => {
    if (!activeCat) return [];
    if (activeSubCat !== 'all') {
      return allWallpapers.filter(w => w.category === activeSubCat);
    }
    return itemsByTopCat.get(activeCat) ?? [];
  }, [allWallpapers, itemsByTopCat, activeCat, activeSubCat]);

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
      trackPaywall('paywall_shown');
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
    trackWallpaperDownload(item.id);
    setSelected(null);
    onClose();
    showAlert('انجام شد', 'به‌عنوان پس‌زمینهٔ اپ تنظیم شد.');
  };

  const applyToDevice = async (item: WallpaperItem, target: WallpaperTarget) => {
    setBusy(true);
    try {
      await setWallpaperFromUrl(item.full, target);
      trackWallpaperDownload(item.id);
      announceWallpaperSet(target, 'gallery');
      setSelected(null);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAlert('خطا', `تنظیم والپیپر ممکن نشد: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const openCategory = (id: string) => {
    setActiveCat(id);
    setActiveSubCat('all');
  };
  const favorites = useFavorites();

  // Opening the gallery clears the «تازه» dot.
  useMarkWallpapersSeen(visible);

  // The unlock banner counts as one paywall view per gallery opening.
  const bannerShown = !premiumUnlocked && hasPremiumWallpapers;
  useEffect(() => {
    if (visible && bannerShown) trackPaywall('paywall_shown');
  }, [visible, bannerShown]);

  /** Opens any category, top-level or sub (then its parent with it selected). */
  const openCategoryById = (id: string) => {
    const cat = catalog?.categories.find(c => c.id === id);
    if (!cat) return;
    setActiveCat(cat.parentId || cat.id);
    setActiveSubCat(cat.parentId ? cat.id : 'all');
  };

  // Jump into the requested category whenever the gallery is opened for one.
  useEffect(() => {
    if (visible && initialCategoryId && catalog) openCategoryById(initialCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialCategoryId, catalog]);

  const backToFront = () => {
    setActiveCat(null);
    setActiveSubCat('all');
  };
  // Android back inside a category returns to the front page first.
  const handleBack = () => (activeCat ? backToFront() : onClose());
  const activeTitle = topCategories.find(c => c.id === activeCat)?.title ?? '';

  /** One thumbnail (grid cell or row item), locked look for premium. */
  const renderThumb = (item: WallpaperItem, cellW: number) => {
    const locked = !isUnlocked(item);
    return (
      <Pressable
        key={item.id}
        onPress={() => onPressItem(item)}
        accessibilityRole="imagebutton"
        accessibilityLabel={item.title}
        style={[styles.cell, {width: cellW}]}>
        {locked && settings.animatedLockedPreview ? (
          <LockedThumb uri={item.thumb} />
        ) : (
          <>
            <Image source={{uri: item.thumb}} style={styles.thumb} resizeMode="cover" />
            {locked ? (
              <View style={styles.lockOverlay}>
                <AppText style={styles.lockIcon}>🔒</AppText>
              </View>
            ) : null}
          </>
        )}
      </Pressable>
    );
  };

  /** A titled, horizontally scrolling row of thumbnails. */
  // «تعویض خودکار» sheet (null = closed) and the one currently running.
  const [autoSource, setAutoSource] = useState<AutoSource | null>(null);
  const auto = useAutoWallpaper();

  /** «🔁 تعویض خودکار» link for a source, showing its interval when it's the
   * active one. */
  const renderAutoLink = (source: AutoSource) => {
    const on = !!auto && sameSource(auto.source, source);
    return (
      <Pressable onPress={() => setAutoSource(source)} hitSlop={10} style={styles.autoLink}>
        <AppText style={[styles.autoLinkText, on && styles.autoLinkOn]}>
          {on ? `🔁 ${hoursLabel(auto!.hours, toFa)}` : '🔁 تعویض خودکار'}
        </AppText>
      </Pressable>
    );
  };

  const renderRow = (title: string, list: WallpaperItem[], action?: React.ReactNode) =>
    list.length === 0 ? null : (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>{title}</AppText>
          {action}
        </View>
        <ChipRow>{list.map(w => renderThumb(w, ROW_THUMB_W))}</ChipRow>
      </View>
    );

  /** Category card: cover photo, name, count, and the mood emoji if any. */
  // Showcase at the top of the category list: one big card — the occasion
  // whose reminder window is open (from its reminder day to two days after),
  // else the most-set category — beside two smaller ones stacked, then the
  // rest in the regular 3-column grid.
  const showcase = useMemo(() => {
    if (topCategories.length < 4) return null;
    const topOf = (id: string) => {
      const c = catalog?.categories.find(x => x.id === id);
      return c?.parentId || c?.id;
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const live = occasions.find(o => {
      const day = occasionDay(o.date);
      if (!day || !o.categoryId) return false;
      const from = new Date(day);
      from.setDate(from.getDate() - o.daysBefore);
      const to = new Date(day);
      to.setDate(to.getDate() + 2);
      return today >= from && today <= to && topCategories.some(c => c.id === topOf(o.categoryId));
    });
    const sets = (c: WallpaperCategory) =>
      (itemsByTopCat.get(c.id) ?? []).reduce((n, w) => n + (w.downloadCount ?? 0), 0);
    const byPopularity = [...topCategories].sort((a, b) => sets(b) - sets(a));
    const big = live
      ? topCategories.find(c => c.id === topOf(live.categoryId))!
      : byPopularity[0];
    const small = byPopularity.filter(c => c.id !== big.id).slice(0, 2);
    return {big, small, occasion: live ?? null};
  }, [topCategories, occasions, itemsByTopCat, catalog]);

  const restCategories = showcase
    ? topCategories.filter(c => c.id !== showcase.big.id && !showcase.small.some(s => s.id === c.id))
    : topCategories;
  // Rows of `columns` cards; the last row's 1–2 cards stretch to fill it.
  const categoryRows: WallpaperCategory[][] = [];
  for (let i = 0; i < restCategories.length; i += columns) {
    categoryRows.push(restCategories.slice(i, i + columns));
  }

  const renderCategoryCard = (
    c: WallpaperCategory,
    opts: {width?: number; height?: number; badge?: string; openId?: string} = {},
  ) => {
    const list = itemsByTopCat.get(c.id) ?? [];
    // Server-picked cover (most-set, free first); fall back to the same rule
    // locally for a catalog cached before covers existed.
    const cover = c.cover ?? (list.find(w => !w.premium) ?? list[0])?.thumb;
    return (
      <Pressable
        key={c.id}
        onPress={() => (opts.openId ? openCategoryById(opts.openId) : openCategory(c.id))}
        accessibilityRole="button"
        accessibilityLabel={opts.badge ? `${opts.badge}: ${c.title}` : c.title}
        style={({pressed}) => [
          styles.catCard,
          {width: opts.width ?? cellWidth},
          opts.height ? {height: opts.height, aspectRatio: undefined} : null,
          pressed && styles.catCardPressed,
        ]}>
        {cover ? (
          <Image source={{uri: cover}} style={styles.thumb} resizeMode="cover" />
        ) : null}
        <View style={styles.catShade} />
        {c.mood ? <AppText style={styles.catMood}>{c.mood}</AppText> : null}
        {opts.badge ? (
          <View style={styles.catBadge}>
            <AppText style={styles.catBadgeText}>{opts.badge}</AppText>
          </View>
        ) : null}
        <View style={styles.catLabel}>
          <AppText style={styles.catTitle} numberOfLines={1}>
            {c.title}
          </AppText>
          <AppText style={styles.catCount}>{toFa(list.length)} عکس</AppText>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleBack}>
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

        {/* Unlock banner — hidden while every wallpaper is free. */}
        {!premiumUnlocked && hasPremiumWallpapers ? (
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

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#8b5cf6" size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>خطا: {error}</AppText>
            <Pressable style={styles.retry} onPress={reload}>
              <AppText style={styles.retryText}>تلاش دوباره</AppText>
            </Pressable>
          </View>
        ) : allWallpapers.length === 0 ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>هنوز والپیپری نیست.</AppText>
          </View>
        ) : !activeCat ? (
          // Front page: newest + most-set rows, then every category as a card.
          <ScrollView contentContainerStyle={styles.frontContent}>
            {renderRow(
              'مجموعه‌ی من ❤️',
              favorites as WallpaperItem[],
              renderAutoLink({kind: 'favorites', title: 'مجموعه‌ی من'}),
            )}
            {renderRow('تازه‌ها', newest)}
            {renderRow('محبوب‌ها', popular)}
            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>دسته‌ها</AppText>
              {showcase ? (
                <View style={styles.showcase}>
                  {renderCategoryCard(showcase.big, {
                    width: cellWidth * 2 + gap,
                    height: (cellWidth / CARD_ASPECT) * 2 + gap,
                    badge: showcase.occasion ? `مناسبت ${showcase.occasion.title}` : 'محبوب‌ترین',
                    openId: showcase.occasion?.categoryId,
                  })}
                  <View style={styles.showcaseColumn}>
                    {showcase.small.map(c => renderCategoryCard(c))}
                  </View>
                </View>
              ) : null}
              <View style={styles.catGrid}>
                {categoryRows.map(row => (
                  <View key={row[0].id} style={styles.catRow}>
                    {row.map(c =>
                      renderCategoryCard(c, {
                        // A short last row shares the full width instead of
                        // leaving a gap; every card keeps the same height.
                        width: (width - 20 - gap * (row.length - 1)) / row.length,
                        height: cellWidth / CARD_ASPECT,
                      }),
                    )}
                  </View>
                ))}
              </View>
            </View>
            <PollCard />
            <RequestCard />
          </ScrollView>
        ) : (
          // Inside one category: its subcategories (if any) and the grid.
          <>
            <Pressable style={styles.backRow} onPress={backToFront} hitSlop={8}>
              <AppText style={styles.backText}>‹ همه دسته‌ها</AppText>
              <AppText style={styles.catHeading}>{activeTitle}</AppText>
            </Pressable>
            <View style={styles.autoRow}>
              {renderAutoLink(
                activeSubCat !== 'all'
                  ? {
                      kind: 'category',
                      id: activeSubCat,
                      title: subCategories.find(c => c.id === activeSubCat)?.title ?? activeTitle,
                    }
                  : {kind: 'category', id: activeCat, title: activeTitle},
              )}
            </View>
            {subCategories.length > 0 ? (
              <ChipRow style={styles.subCats}>
                {[{id: 'all', title: 'همه'}, ...subCategories].map(c => {
                  const active = c.id === activeSubCat;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setActiveSubCat(c.id)}
                      style={[styles.subCat, active && styles.subCatActive]}>
                      <AppText style={[styles.subCatText, active && styles.subCatTextActive]}>
                        {c.title}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ChipRow>
            ) : null}
            {items.length === 0 ? (
              <View style={styles.center}>
                <AppText style={styles.muted}>اینجا هنوز والپیپری نیست.</AppText>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={i => i.id}
                numColumns={columns}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.gridRow}
                renderItem={({item}) => renderThumb(item, cellWidth)}
              />
            )}
          </>
        )}

        <AutoChangeSheet source={autoSource} onClose={() => setAutoSource(null)} />

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
                  <ActivityIndicator color="#8b5cf6" style={styles.busySpinner} />
                ) : (
                  <>
                    <Pressable
                      style={styles.action}
                      onPress={() => applyInApp(selected)}>
                      <AppText style={styles.actionText}>
                        🖼️ پس‌زمینهٔ اپ
                      </AppText>
                    </Pressable>
                    <Pressable
                      style={styles.action}
                      onPress={() => toggleFavorite(selected)}>
                      <AppText style={styles.actionText}>
                        {favorites.some(f => f.full === selected.full)
                          ? '💔 حذف از مجموعه‌ی من'
                          : '❤️ افزودن به مجموعه‌ی من'}
                      </AppText>
                    </Pressable>
                    <Pressable style={styles.action} onPress={() => shareWallpaper(selected)}>
                      <AppText style={styles.actionText}>📤 ارسال برای دوستان</AppText>
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
  root: {flex: 1, backgroundColor: '#170b28'},
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
  headerBtnText: {color: '#c4b5fd', fontSize: 16},
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
  frontContent: {paddingBottom: 32},
  section: {paddingTop: 16},
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
  },
  autoRow: {flexDirection: 'row-reverse', paddingHorizontal: 14, paddingTop: 4},
  autoLink: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  autoLinkText: {color: '#c4b5fd', fontSize: 13, fontWeight: '700', writingDirection: 'rtl'},
  autoLinkOn: {color: '#ffffff'},
  sectionTitle: {
    color: '#eafffb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    paddingHorizontal: 12,
    marginBottom: 10,
    writingDirection: 'rtl',
  },
  showcase: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  showcaseColumn: {gap: 10},
  catBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
  },
  catBadgeText: {color: '#ffffff', fontSize: 12, fontWeight: '700', writingDirection: 'rtl'},
  catGrid: {gap: 10, paddingHorizontal: 10},
  catRow: {flexDirection: 'row-reverse', gap: 10},
  catCard: {
    aspectRatio: CARD_ASPECT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  catCardPressed: {opacity: 0.8},
  catShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  catMood: {position: 'absolute', top: 6, right: 8, fontSize: 20},
  catLabel: {position: 'absolute', left: 8, right: 8, bottom: 8},
  catTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  catCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backRow: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  backText: {color: '#c4b5fd', fontSize: 15, writingDirection: 'rtl'},
  catHeading: {color: '#eafffb', fontSize: 17, fontWeight: '700', writingDirection: 'rtl'},
  chipRow: {flexGrow: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12},
  chipRowReverse: {flexDirection: 'row-reverse'},
  subCats: {paddingTop: 6},
  subCat: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.12)',
  },
  subCatActive: {backgroundColor: 'rgba(139, 92, 246, 0.16)', borderColor: '#8b5cf6'},
  subCatText: {color: 'rgba(255,255,255,0.55)', fontSize: 12, writingDirection: 'rtl'},
  subCatTextActive: {color: '#eafffb', fontWeight: '700'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  muted: {color: 'rgba(255,255,255,0.6)', fontSize: 15, writingDirection: 'rtl'},
  retry: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
    backgroundColor: '#170b28',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
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
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginTop: 8,
  },
  actionRow: {flexDirection: 'row-reverse', gap: 8},
  actionHalf: {flex: 1},
  actionText: {color: '#eafffb', fontSize: 15, fontWeight: '700', writingDirection: 'rtl'},
  previewClose: {alignItems: 'center', paddingVertical: 12, marginTop: 6},
  previewCloseText: {color: '#c4b5fd', fontSize: 15},
});
