import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  BatteryCharging,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CirclePlay,
  House,
  ImageIcon,
  Info,
  Lock,
  MessageSquare,
  Minus,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import AppText from './AppText';
import {showAlert} from './AppAlert';
// import {launchImageLibrary} from 'react-native-image-picker';
import {BIG_CLOCK_BASE_FONT_SIZE, bigClockMaxFontSize} from './ClockWidget';
import {BACKGROUNDS, MAX_ORBS, RINGS} from './config';
import {fontsForScript, getScriptFont} from './fonts';
import {setWidgetAutoRotateQuote} from './homeWidget';
import type {WallpaperTarget} from './lockWallpaper';
import {isDefaultLauncher} from './installedApps';
import {openLauncherSettings, openScreenSaverSettings} from './systemScreens';
import {useSettings} from './SettingsContext';
import SunDayPreview from './SunDayPreview';
import PresetRow from './PresetRow';
import type {WallpaperSettings} from './SettingsContext';
import {useStore} from './store/StoreContext';
// «تم آماده» فعلاً از UI کامنت شده — این ایمپورت هم موقتاً غیرفعال است.
// import {THEMES} from './themes';

/** Telegram handle of the app's developer, shown in Settings ▸ عمومی. */
const DEVELOPER_TELEGRAM_USERNAME = 'RezaAbaskhanian';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Capture the current background and set it as the device wallpaper. */
  onSetWallpaper?: (target: WallpaperTarget) => void;
  /** Save the current background as the source photo for the real system
   * live wallpaper and open Android's "set live wallpaper" screen for it. */
  onSetLiveWallpaper?: () => void;
  /** Open the downloadable-wallpaper gallery. */
  onOpenGallery?: () => void;
  /** Open the in-app "how to use the app" guide. */
  onOpenHelp?: () => void;
  /** Open the themes screen (wallpaper + matching home-screen widgets). */
  onOpenThemes?: () => void;
  // /** Open the "generate wallpaper from text with AI" screen. */
  // onOpenAIGenerate?: () => void; // [AI disabled for this version]
};

/** Glow/accent colour swatches offered in settings. */
const GLOW_COLORS = [
  '#5eead4', // teal
  '#f5c451', // gold
  '#ffffff', // white
  '#6ee7b7', // green
  '#f87171', // red
  '#7dd3fc', // blue
  '#000000', // black
];

/** Font colour swatches for the clock/quote text (Settings ▸ ویجت‌ها).
 * Starts with the app's original gold so the default shows as selected. */
const TEXT_COLORS = [
  '#f5e6b3', // classic gold (default)
  '#ffffff', // white
  '#5eead4', // teal
  '#6ee7b7', // green
  '#f87171', // red
  '#7dd3fc', // blue
  '#000000', // black
];

/** Shown from Settings ▸ بیشتر ▸ منبع محتوا. */
const CONTENT_SOURCE =
  'جملات نمایش داده‌شده در برنامه برگرفته و خلاصه‌شده از پایگاه اطلاع‌رسانی دفتر حفظ و نشر آثار حضرت آیت‌الله العظمی خامنه‌ای (khamenei.ir) است.';

/** Stroke colour of the row icons. */
const ICON_COLOR = '#c4b5fd';
const MUTED_ICON = 'rgba(255,255,255,0.55)';

/** How long the «برگردان» bar stays after applying a preset. */
const UNDO_MS = 5000;

/** How far (dp) the handle must be dragged down to close the sheet. */
const CLOSE_DRAG = 120;

/** Four tabs, always visible; the sheet always opens on «خانه». */
type TabId = 'home' | 'look' | 'text' | 'more';
const TABS: {id: TabId; label: string}[] = [
  {id: 'home', label: 'خانه'},
  {id: 'look', label: 'ظاهر'},
  {id: 'text', label: 'ساعت و متن'},
  {id: 'more', label: 'بیشتر'},
];

/** Bottom-sheet style settings panel for the wallpaper. */
export default function SettingsPanel({
  visible,
  onClose,
  onSetWallpaper,
  onSetLiveWallpaper,
  onOpenGallery,
  onOpenHelp,
  onOpenThemes,
  // onOpenAIGenerate, // [AI disabled for this version]
}: Props) {
  // applyTheme از useSettings() اینجا موقتاً استفاده نمی‌شود چون بخش «تم
  // آماده» بالا کامنت شده — با برگرداندن آن UI، اینجا هم برگردانده شود.
  const {settings, update, deletePreset} = useSettings();
  const {
    premiumUnlocked,
    hasPremiumWallpapers,
    redeemCode,
    orbitItems,
    orbitCategories,
    quoteCategories,
  } = useStore();
  // Upper bound for the ballCount stepper: never more than MAX_ORBS, and
  // never more than the active orbit theme actually has (so the user can
  // only dial the count *down* from its natural size, not pad it out).
  const categoryItemCount = settings.orbitCategoryId
    ? orbitItems.filter(it => it.categoryId === settings.orbitCategoryId).length
    : orbitItems.length;
  const maxBallCount = Math.max(
    1,
    Math.min(MAX_ORBS, categoryItemCount || MAX_ORBS),
  );
  // Switching the orbit theme (via the home screen's own switcher) resets
  // ballCount to the new theme's natural size (capped at MAX_ORBS) — e.g.
  // going from a 5-item theme to a 20-item one should show 20, not stay
  // stuck at 5. Manual decreases via the stepper still work afterward; they
  // just get reset again on the next switch. If the item list itself changes
  // (e.g. loads in later) without a theme switch, only clamp down so an
  // in-progress manual choice isn't overridden.
  const prevCategoryRef = useRef(settings.orbitCategoryId);
  useEffect(() => {
    if (prevCategoryRef.current !== settings.orbitCategoryId) {
      prevCategoryRef.current = settings.orbitCategoryId;
      update('ballCount', maxBallCount);
    } else if (settings.ballCount > maxBallCount) {
      update('ballCount', maxBallCount);
    }
  }, [settings.orbitCategoryId, maxBallCount, settings.ballCount, update]);
  // Persists across opens/closes (the panel stays mounted, only `visible`
  // toggles) so reopening Settings picks up on the same tab the user left.
  const [tab, setTab] = useState<TabId>('home');
  const insets = useSafeAreaInsets();
  const [moreAdvancedOpen, setMoreAdvancedOpen] = useState(false);
  // One open group per tab at a time; the first group starts open.
  const [openGroup, setOpenGroup] = useState<{look: string; text: string}>({
    look: 'background',
    text: 'clock',
  });
  const toggleGroup = (t: 'look' | 'text', id: string) =>
    setOpenGroup(prev => ({...prev, [t]: prev[t] === id ? '' : id}));
  // True while a finger is on a RowSlider, so the ScrollView doesn't take
  // over a horizontal drag partway through.
  const [sliderActive, setSliderActive] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [promoInput, setPromoInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  // Re-checked on every open: the user may have switched launchers in
  // Android's settings since the panel was last shown.
  const [isLauncher, setIsLauncher] = useState(false);
  useEffect(() => {
    if (visible) {
      isDefaultLauncher().then(setIsLauncher);
      setTab('home');
    }
  }, [visible]);
  // «حالت X فعال شد / برگردان» bar shown for UNDO_MS after a preset is applied.
  const [undo, setUndo] = useState<{label: string; previous: WallpaperSettings} | null>(
    null,
  );
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(t);
  }, [undo]);
  useEffect(() => {
    if (!visible) setUndo(null);
  }, [visible]);
  const revertPreset = () => {
    if (!undo) return;
    (Object.keys(undo.previous) as (keyof WallpaperSettings)[]).forEach(k => {
      if (settings[k] !== undo.previous[k]) update(k, undo.previous[k] as never);
    });
    setUndo(null);
  };

  // Drag the handle down to close. The sheet follows the finger; past
  // CLOSE_DRAG (or on a quick flick) it closes, otherwise it springs back.
  const dragY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible, dragY]);
  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
      onPanResponderMove: (_e, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > CLOSE_DRAG || g.vy > 1) {
          onCloseRef.current();
        } else {
          Animated.spring(dragY, {toValue: 0, useNativeDriver: true}).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(dragY, {toValue: 0, useNativeDriver: true}).start(),
    }),
  ).current;

  // In the "وسط صفحه" clock layout the clock can grow until it fills the
  // screen; the slider stops exactly there (same limit ClockWidget renders
  // with), so every position along it visibly changes the size.
  const {width: screenW, height: screenH} = useWindowDimensions();
  const maxClockScale =
    settings.clockLayout === 'bigCentered'
      ? Math.floor(
          (bigClockMaxFontSize(
            screenW,
            screenH,
            settings.hourFormat === '12' && settings.showAmPm,
          ) /
            BIG_CLOCK_BASE_FONT_SIZE) *
            10,
        ) / 10
      : 1.6;

  const confirmDeletePreset = (id: string, label: string) => {
    showAlert('حذف حالت', `«${label}» حذف بشه؟`, {
      confirmText: 'حذف',
      cancelText: 'نه',
      onConfirm: () => deletePreset(id),
    });
  };

  const submitPromoCode = async () => {
    if (!promoInput.trim() || redeeming) {
      return;
    }
    setRedeeming(true);
    const result = await redeemCode(promoInput.trim());
    setRedeeming(false);
    if (result.success) {
      setPromoInput('');
    }
    showAlert(result.success ? 'کد تخفیف' : 'خطا', result.message);
  };

  const openDeveloperTelegram = () => {
    const username = DEVELOPER_TELEGRAM_USERNAME;
    Linking.openURL(`tg://resolve?domain=${username}`).catch(() =>
      Linking.openURL(`https://t.me/${username}`).catch(() =>
        showAlert('خطا', 'تلگرام باز نشد.'),
      ),
    );
  };

  const selectTab = (id: TabId) => {
    setTab(id);
    scrollRef.current?.scrollTo({y: 0, animated: false});
  };

  // Bundled backgrounds + a "gallery" entry once the user has picked a photo.
  const backgroundOptions = [
    ...BACKGROUNDS.map(b => ({id: b.id, label: b.label})),
    ...(settings.customBackgroundUri
      ? [{id: 'custom', label: 'گالری'}]
      : []),
  ];

  // const pickFromGallery = async () => {
  //   try {
  //     const result = await launchImageLibrary({
  //       mediaType: 'photo',
  //       selectionLimit: 1,
  //       quality: 1,
  //     });
  //     if (result.didCancel) {
  //       return;
  //     }
  //     const uri = result.assets?.[0]?.uri;
  //     if (uri) {
  //       update('customBackgroundUri', uri);
  //       update('backgroundId', 'custom');
  //     }
  //   } catch {
  //     showAlert('خطا', 'انتخاب عکس ممکن نشد.');
  //   }
  // };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, {transform: [{translateY: dragY}]}]}>
        <View
          style={styles.handleZone}
          accessibilityRole="adjustable"
          accessibilityLabel="برای بستن به پایین بکش"
          {...handlePan.panHandlers}>
          <View style={styles.handle} />
        </View>

        {/* تب‌بار دسته‌ها: اولین چیزی که دیده می‌شود، بالای مودال. */}
        <View style={styles.tabBar}>
          {TABS.map(t => {
            const active = t.id === tab;
            return (
              <Pressable
                key={t.id}
                style={styles.tabBtn}
                accessibilityRole="tab"
                accessibilityState={{selected: active}}
                onPress={() => selectTab(t.id)}>
                <AppText
                  numberOfLines={1}
                  style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t.label}
                </AppText>
                <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
              </Pressable>
            );
          })}
        </View>

        {/* [AI disabled for this version] entry point for AI wallpaper
            generation — styles.aiEntry/aiEntryText are kept below.
        <View style={styles.entryRow}>
          <Pressable
            style={[styles.aiEntry, styles.entryRowItem]}
            onPress={() => onOpenAIGenerate?.()}>
            <AppText style={styles.aiEntryText}>🎨 ساخت والپیپر با AI</AppText>
          </Pressable>
        </View> */}

        <ScrollView
          ref={scrollRef}
          scrollEnabled={!sliderActive}
          style={styles.scroll}
          contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + 24}]}>
          {tab === 'more' ? (
            <>
              {/* Both open Android's own "Home app" chooser — the only place a
                  launcher can be switched — so the way back is always one tap. */}
              {isLauncher ? (
                <ListRow
                  icon={Redo2}
                  title="بازگشت به لانچر قبلی"
                  subtitle="در صفحه بعد، لانچر قبلی گوشیت رو انتخاب کن"
                  onPress={openLauncherSettings}
                />
              ) : (
                <ListRow
                  icon={House}
                  title="تنظیم به‌عنوان لانچر"
                  subtitle="صحنه زنده می‌شه صفحه اصلی گوشیت"
                  info="صحنه زنده می‌شه صفحه اصلی گوشیت؛ هر وقت خواستی، از همین‌جا به لانچر قبلی برمی‌گردی."
                  onPress={openLauncherSettings}
                />
              )}
              <ListRow icon={BookOpen} title="راهنمای کار با اپ" onPress={() => onOpenHelp?.()} />
              <ListRow
                icon={CirclePlay}
                title="پیش‌نمایش متحرک در گالری"
                right={
                  <SettingSwitch
                    value={settings.animatedLockedPreview}
                    onChange={v => update('animatedLockedPreview', v)}
                  />
                }
              />
              <ListRow
                icon={MessageSquare}
                title="ارتباط با سازنده"
                subtitle="در تلگرام پیام بده"
                onPress={openDeveloperTelegram}
              />
              <ListRow
                icon={Info}
                title="منبع محتوا"
                onPress={() => showAlert('منبع محتوا', CONTENT_SOURCE)}
                last={!(!premiumUnlocked && hasPremiumWallpapers)}
              />

              {/* «تم آماده» فعلاً کامنت شده — نیاز به اصلاح دارد، شاید بعداً
                  برگردانده شود. See THEMES in ./themes.ts and applyTheme in
                  ./SettingsContext.tsx (هنوز موجودند، فقط UI‌اش مخفی است). */}

              {/* Rarely needed: kept last, behind a closed row. */}
              {!premiumUnlocked && hasPremiumWallpapers ? (
                <>
                  <ListRow
                    icon={SlidersHorizontal}
                    title="پیشرفته"
                    onPress={() => setMoreAdvancedOpen(o => !o)}
                    expanded={moreAdvancedOpen}
                    last={!moreAdvancedOpen}
                  />
                  {moreAdvancedOpen ? (
                    <View style={styles.groupBody}>
                      <AppText style={styles.sectionTitle}>کد تخفیف</AppText>
                      <View style={styles.promoRow}>
                        <TextInput
                          style={styles.promoInput}
                          value={promoInput}
                          onChangeText={setPromoInput}
                          placeholder="کد تخفیف رو بنویس"
                          placeholderTextColor="rgba(255,255,255,0.35)"
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                        <Pressable
                          style={[styles.promoBtn, redeeming && styles.promoBtnDisabled]}
                          disabled={redeeming}
                          onPress={submitPromoCode}>
                          <AppText style={styles.promoBtnText}>
                            {redeeming ? '...' : 'فعال‌سازی'}
                          </AppText>
                        </Pressable>
                      </View>
                      <HintLine>با کد معتبر، همه والپیپرهای ویژه باز می‌شه</HintLine>
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {tab === 'look' ? (
            <>
              <SettingsGroup
                title="پس‌زمینه"
                open={openGroup.look === 'background'}
                onToggle={() => toggleGroup('look', 'background')}>
                <RowChoices
                  label="عکس پس‌زمینه"
                  options={backgroundOptions}
                  selected={settings.backgroundId}
                  onSelect={id => update('backgroundId', id)}
                />

                {/* <Pressable style={styles.galleryBtn} onPress={pickFromGallery}>
                  <AppText style={styles.galleryBtnText}>
                    📷 انتخاب عکس از گالری
                  </AppText>
                </Pressable> */}
                {settings.customBackgroundUri ? (
                  <HintLine>عکس گالری رو از گزینه «گالری» بالا انتخاب کن</HintLine>
                ) : null}

                <View style={styles.divider} />
                <AppText style={styles.sectionTitle}>چرخش رندوم پس‌زمینه‌ها</AppText>

                <RowSwitch
                  label="چرخش بین عکس‌های ستاره‌دار"
                  hint="هر بار یکی از عکس‌های ستاره‌دارت می‌اد"
                  value={settings.randomBackgroundEnabled}
                  onChange={v => update('randomBackgroundEnabled', v)}
                  info="هر بار که اپ باز می‌شه، یکی از عکس‌های زیر رندوم پس‌زمینه می‌شه. از «گالری والپیپرها» یه عکس رو باز کن و «افزودن به چرخش رندوم» رو بزن (حداکثر ۵ عکس)."
                />

                {settings.randomBackgroundUris.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.randomBgRow}>
                    {settings.randomBackgroundUris.map(uri => (
                      <View key={uri} style={styles.randomBgThumbWrap}>
                        <Image source={{uri}} style={styles.randomBgThumb} />
                        <Pressable
                          style={styles.randomBgRemove}
                        hitSlop={14}
                        accessibilityRole="button"
                        accessibilityLabel="حذف از چرخش"
                          onPress={() =>
                            update(
                              'randomBackgroundUris',
                              settings.randomBackgroundUris.filter(u => u !== uri),
                            )
                          }>
                          <X size={12} color="#eafffb" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <HintLine>هنوز عکسی اضافه نکردی</HintLine>
                )}
              </SettingsGroup>
              <SettingsGroup
                title="جلوه‌ها"
                open={openGroup.look === 'effects'}
                onToggle={() => toggleGroup('look', 'effects')}>
                <RowChoices
                  label="حالت روز و شب"
                  options={[
                    {id: 'auto', label: 'خودکار'},
                    {id: 'day', label: 'روز'},
                    {id: 'night', label: 'شب'},
                    {id: 'off', label: 'خاموش'},
                  ]}
                  selected={settings.dayNightMode}
                  onSelect={id =>
                    update('dayNightMode', id as 'auto' | 'day' | 'night' | 'off')
                  }
                />

                <RowSwitch
                  label="نور خورشید"
                  hint="نور با ساعت روز حرکت می‌کنه"
                  value={settings.sunFlare}
                  onChange={v => update('sunFlare', v)}
                  info="یه هاله نور شبیه خورشید که با ساعت واقعی روز روی آسمون حرکت می‌کنه و نورش عوض می‌شه: صبح از سمت چپ و پایین با نور نارنجی طلوع می‌کنه، ظهر بالای صفحه سفید و ملایمه، و عصر سمت راست با نور نارنجی غروب می‌کنه؛ شب خاموشه. زمان طلوع و غروب از موقعیت گوشیت گرفته می‌شه."
                />
                {settings.sunFlare ? (
                  <>
                    <SunDayPreview />
                    <HintLine info="یه روز کامل توی چند ثانیه. نقطه سفید جای خورشید توی همین لحظه‌ست.">
                      پیش‌نمایش یه روز کامل
                    </HintLine>
                    {settings.dayNightMode !== 'auto' ? (
                      <HintLine info="برای اینکه نور خورشید با ساعت روز روی صفحه حرکت کنه، «حالت روز و شب» رو روی «خودکار» بذار.">
                        حالت روز و شب رو روی «خودکار» بذار
                      </HintLine>
                    ) : null}
                  </>
                ) : null}

                <RowChoices
                  label="ذرات نور"
                  options={[
                    {id: 'off', label: 'خاموش'},
                    {id: 'on', label: 'روشن'},
                    {id: 'auto', label: 'خودکار'},
                  ]}
                  selected={settings.particleMode}
                  onSelect={id =>
                    update('particleMode', id as 'off' | 'on' | 'auto')
                  }
                />

                <RowChoices
                  label="شکل ذرات"
                  options={[
                    {id: 'dot', label: 'نقطه'},
                    {id: 'heart', label: 'قلب'},
                  ]}
                  selected={settings.particleShape}
                  onSelect={id => update('particleShape', id as 'dot' | 'heart')}
                />

                <RowChoices
                  label="شدت ذرات"
                  options={[
                    {id: 'low', label: 'کم'},
                    {id: 'medium', label: 'متوسط'},
                    {id: 'high', label: 'زیاد'},
                    {id: 'extreme', label: 'خیلی زیاد'},
                  ]}
                  selected={settings.particleIntensity}
                  onSelect={id =>
                    update(
                      'particleIntensity',
                      id as 'low' | 'medium' | 'high' | 'extreme',
                    )
                  }
                  info="هرچی شدت بیشتر باشه، هم تعداد ذرات نور بیشتر می‌شه هم سرعتشون."
                />

                <RowSwitch
                  label="رنگ خودکار از عکس"
                  hint="رنگ ذرات از خود عکس گرفته می‌شه"
                  value={settings.dynamicColor}
                  onChange={v => update('dynamicColor', v)}
                  info="به‌جای رنگ دستی، رنگ ذرات نور از خود عکس پس‌زمینه فعلی گرفته می‌شه."                />

                {/* The manual colour is ignored while dynamicColor is on. */}
                {!settings.dynamicColor ? (
                  <RowColors
                    label="رنگ نور"
                    colors={GLOW_COLORS}
                    selected={settings.glowColor}
                    onSelect={c => update('glowColor', c)}
                  />
                ) : null}

                <RowSwitch
                  label="تیرگی لبه‌ها"
                  value={settings.vignette}
                  onChange={v => update('vignette', v)}
                />

                <RowChoices
                  label="مه"
                  options={[
                    {id: 'off', label: 'خاموش'},
                    {id: 'bottom', label: 'از پایین'},
                    {id: 'top', label: 'از بالا'},
                    {id: 'both', label: 'هر دو'},
                  ]}
                  selected={settings.fogMode}
                  onSelect={id =>
                    update('fogMode', id as 'off' | 'bottom' | 'top' | 'both')
                  }
                />

                <RowChoices
                  label="باران و برف"
                  options={[
                    {id: 'off', label: 'خاموش'},
                    {id: 'rain', label: 'باران'},
                    {id: 'snow', label: 'برف'},
                    {id: 'auto', label: 'خودکار'},
                  ]}
                  selected={settings.weatherEffects}
                  onSelect={id =>
                    update('weatherEffects', id as 'off' | 'rain' | 'snow' | 'auto')
                  }
                  info="حالت خودکار باید وضعیت هوا رو از موقعیت گوشی و اینترنت بگیره؛ اگه اجازه موقعیت ندی یا اینترنت نباشه، فعال نمی‌شه."
                />

                {/* [combat mode disabled for now — planned for a future
                    version] Re-enable by uncommenting this switch + the
                    `combatMode` field in SettingsContext.tsx, and the
                    ProjectileLayer wiring in HolographicHome.tsx. */}
                {/* <RowSwitch
                  label="حالت رزمی (موشک و پهباد)"
                  value={settings.combatMode}
                  onChange={v => update('combatMode', v)}
                />
                {settings.combatMode ? (
                  <HintLine>مه و متن پایین صفحه خاموش می‌شود و هر ۸ ثانیه یک موشک یا پهباد از یک گوشهٔ صفحه رد می‌شود.</HintLine>
                ) : null} */}
              </SettingsGroup>
              <SettingsGroup
                title="حرکت و لمس"
                open={openGroup.look === 'motion'}
                onToggle={() => toggleGroup('look', 'motion')}>
                <RowSwitch
                  label="حرکت آرام پس‌زمینه"
                  hint="عکس آروم زوم و جابه‌جا می‌شه"
                  value={settings.livingWallpaper}
                  onChange={v => update('livingWallpaper', v)}
                  info="عکس پس‌زمینه آروم زوم و جابه‌جا می‌شه؛ هر بار که اپ باز می‌شه هم یه حرکت شروع (بیدار شدن) داره."
                />

                {settings.livingWallpaper ? (
                  <>
                    <RowSwitch
                      label="لرزش آرام"
                      hint="یه لرزش خیلی ریز روی حرکت آرام"
                      value={settings.wallpaperShake}
                      onChange={v => update('wallpaperShake', v)}
                      info="یه لرزش خیلی ریز و ملایم روی حرکت آرام اضافه می‌شه."                    />
                  </>
                ) : null}

                <RowSwitch
                  label="موج آب با لمس"
                  hint="باتری کمی بیشتر مصرف می‌شه"
                  value={settings.waterRipple}
                  onChange={v => update('waterRipple', v)}
                  info="با هر لمس، مثل افتادن سنگ توی آب، موج روی خود عکس پخش می‌شه؛ هر بار که اپ باز می‌شه هم یه موج از وسط صفحه شروع می‌شه. اگه والپیپر زنده رو هم گذاشته باشی، روی صفحه اصلی گوشی هم کار می‌کنه (اندروید ۱۳ به بالا). باتری کمی بیشتر مصرف می‌شه."                />

                {settings.waterRipple ? (
                  <>
                    <RowSwitch
                      label="موج خودکار"
                      hint="هر ۱۰ ثانیه یه موج، حتی بدون لمس"
                      value={settings.waterRippleAuto}
                      onChange={v => update('waterRippleAuto', v)}
                      info="بدون لمس هم هر ۱۰ ثانیه یه موج از یه نقطه تصادفی شروع می‌شه. فقط وقتی اپ بازه اجرا می‌شه تا باتری مصرف نکنه."                    />
                  </>
                ) : null}

                <RowSwitch
                  label="حرکت با کج‌کردن گوشی"
                  hint="با کج‌کردن گوشی، عکس کمی جابه‌جا می‌شه"
                  value={settings.gyroParallax}
                  onChange={v => update('gyroParallax', v)}
                  info="با کج‌کردن گوشی، پس‌زمینه و گوی‌ها کمی جابه‌جا می‌شن — علاوه بر کشیدن با انگشت."                />

                <RowSwitch
                  label="حلقه نور با لمس"
                  hint="هر جا بزنی یه حلقه نور باز می‌شه"
                  value={settings.touchRipple}
                  onChange={v => update('touchRipple', v)}
                  info="با هر ضربه روی صفحه، یه حلقه نور کوتاه از همون نقطه باز می‌شه و محو می‌شه."                />
                <Disclosure title="پیشرفته" summary="عمق سه‌بعدی">
                  <RowSwitch
                    label="عمق سه‌بعدی"
                    hint="عکس مثل یه صفحه سه‌بعدی می‌چرخه"
                    value={settings.depthParallax}
                    onChange={v => update('depthParallax', v)}
                    info="عکس پس‌زمینه مثل یه صفحه سه‌بعدی با کج‌شدن گوشی می‌چرخه؛ «حرکت با کج‌کردن گوشی» باید روشن باشه. این جداکردن واقعی سوژه از پس‌زمینه نیست، فقط شبیه‌سازی عمقه."                />
                </Disclosure>
              </SettingsGroup>
              <SettingsGroup
                title="کره و گوی‌ها"
                open={openGroup.look === 'sphere'}
                onToggle={() => toggleGroup('look', 'sphere')}>
                <RowSwitch
                  label="چرخش خودکار"
                  value={settings.autoRotate}
                  onChange={v => update('autoRotate', v)}
                />

                <RowStepper
                  label="اندازه کره"
                  value={`${settings.ringCount}`}
                  onDec={() =>
                    update('ringCount', Math.max(1, settings.ringCount - 1))
                  }
                  onInc={() =>
                    update(
                      'ringCount',
                      Math.min(RINGS.length, settings.ringCount + 1),
                    )
                  }
                />

                <RowSwitch
                  label="نمایش گوی‌ها"
                  value={settings.showOrbs}
                  onChange={v => update('showOrbs', v)}
                />

                {orbitCategories.length >= 2 ? (
                  <RowChoices
                    label="تم گوی‌ها"
                    options={orbitCategories.map(c => ({id: c.id, label: c.title}))}
                    selected={settings.orbitCategoryId}
                    onSelect={id => update('orbitCategoryId', id)}
                  />
                ) : null}

                <RowChoices
                  label="حالت نمایش گوی‌ها"
                  options={[
                    {id: 'steady', label: 'ثابت'},
                    {id: 'flicker', label: 'پیدا و پنهان'},
                  ]}
                  selected={settings.orbVisibility}
                  onSelect={id =>
                    update('orbVisibility', id as 'steady' | 'flicker')
                  }
                />

                <Disclosure title="پیشرفته" summary="محور، سرعت و تعداد گوی‌ها">
                  <RowChoices
                    label="محور چرخش"
                    options={[
                      {id: 'x', label: 'عمودی'},
                      {id: 'y', label: 'افقی'},
                      {id: 'z', label: 'مثل عقربه'},
                      {id: 'mixed', label: 'آزاد'},
                    ]}
                    selected={settings.rotationAxis}
                    onSelect={id =>
                      update('rotationAxis', id as 'x' | 'y' | 'z' | 'mixed')
                    }
                  />
                  <RowStepper
                    label="سرعت چرخش"
                    value={`${settings.speed.toFixed(2)}×`}
                    onDec={() =>
                      update(
                        'speed',
                        Math.max(0.25, +(settings.speed - 0.25).toFixed(2)),
                      )
                    }
                    onInc={() =>
                      update(
                        'speed',
                        Math.min(3, +(settings.speed + 0.25).toFixed(2)),
                      )
                    }
                  />
                  <RowStepper
                    label="تعداد گوی‌ها"
                    value={`${settings.ballCount}`}
                    onDec={() =>
                      update('ballCount', Math.max(1, settings.ballCount - 2))
                    }
                    onInc={() =>
                      update(
                        'ballCount',
                        Math.min(maxBallCount, settings.ballCount + 2),
                      )
                    }
                  />
                </Disclosure>
              </SettingsGroup>
            </>
          ) : null}

          {tab === 'text' ? (
            <>
              <SettingsGroup
                title="ساعت و تاریخ"
                open={openGroup.text === 'clock'}
                onToggle={() => toggleGroup('text', 'clock')}>
                <RowSwitch
                  label="نمایش ساعت"
                  value={settings.showClock}
                  onChange={v => update('showClock', v)}
                />

                <RowSwitch
                  label="نمایش تاریخ"
                  value={settings.showDate}
                  onChange={v => update('showDate', v)}
                />

                <RowChoices
                  label="۱۲ یا ۲۴ ساعته"
                  options={[
                    {id: '12', label: '۱۲ ساعته'},
                    {id: '24', label: '۲۴ ساعته'},
                  ]}
                  selected={settings.hourFormat}
                  onSelect={id => update('hourFormat', id as '12' | '24')}
                />

                {settings.hourFormat === '12' ? (
                  <RowSwitch
                    label="نمایش قبل‌ازظهر و بعدازظهر"
                    value={settings.showAmPm}
                    onChange={v => update('showAmPm', v)}
                  />
                ) : null}

                <RowChoices
                  label="ارقام"
                  options={[
                    {id: 'fa', label: 'فارسی'},
                    {id: 'en', label: 'انگلیسی'},
                  ]}
                  selected={settings.clockDigits}
                  onSelect={id => update('clockDigits', id as 'fa' | 'en')}
                />

                <RowChoices
                  label="چیدمان ساعت"
                  options={[
                    {id: 'inline', label: 'بالا، کنار تاریخ'},
                    {id: 'bigCentered', label: 'وسط صفحه، بزرگ'},
                  ]}
                  selected={settings.clockLayout}
                  onSelect={id => {
                    update('clockLayout', id as 'inline' | 'bigCentered');
                    // The inline clock tops out at 1.6× (the big layout goes
                    // much higher), so don't carry a huge scale back into it.
                    if (id === 'inline' && settings.clockFontScale > 1.6) {
                      update('clockFontScale', 1.6);
                    }
                  }}
                  info="در حالت «وسط صفحه» فقط ساعت، بزرگ و وسط صفحه نشون داده می‌شه — ساعت بالا، دقیقه پایین — و تاریخ زیرش نمیاد."
                />

                <RowSlider
                  label="اندازه ساعت"
                  value={Math.min(settings.clockFontScale, maxClockScale)}
                  min={0.7}
                  max={maxClockScale}
                  step={0.1}
                  format={v => `${v.toFixed(1)}×`}
                  onChange={v => update('clockFontScale', v)}
                  onDragActive={setSliderActive}
                />

                <RowColors
                  label="رنگ ساعت"
                  colors={TEXT_COLORS}
                  selected={settings.clockTextColor}
                  onSelect={c => update('clockTextColor', c)}
                />
                <Disclosure title="رنگ‌های بیشتر">
                  <RowColors
                    label="رنگ تاریخ"
                    colors={TEXT_COLORS}
                    selected={settings.clockSmallTextColor}
                    onSelect={c => update('clockSmallTextColor', c)}
                  />
                </Disclosure>
              </SettingsGroup>
              <SettingsGroup
                title="فونت"
                open={openGroup.text === 'fonts'}
                onToggle={() => toggleGroup('text', 'fonts')}>
                {(
                  [
                    {script: 'fa', title: 'فونت فارسی', key: 'fontIdFa'},
                    {script: 'en', title: 'فونت انگلیسی', key: 'fontIdEn'},
                  ] as const
                ).map(group => (
                  <React.Fragment key={group.script}>
                    <AppText
                      style={[
                        styles.sectionTitle,
                        group.script === 'en' && styles.fontGroupGap,
                      ]}>
                      {group.title}
                    </AppText>
                    <View style={styles.fontList}>
                      {fontsForScript(group.script).map(f => {
                        const active =
                          f.id === getScriptFont(group.script, settings[group.key]).id;
                        return (
                          <Pressable
                            key={f.id}
                            style={[styles.fontChip, active && styles.fontChipActive]}
                            onPress={() => update(group.key, f.id)}>
                            <AppText
                              style={[
                                styles.fontSample,
                                {fontFamily: f.families.regular},
                              ]}>
                              {f.sample}
                            </AppText>
                            <AppText
                              style={[
                                styles.fontName,
                                active && styles.fontNameActive,
                              ]}>
                              {f.label}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </React.Fragment>
                ))}
              </SettingsGroup>
              <SettingsGroup
                title="متن پایین صفحه"
                open={openGroup.text === 'quote'}
                onToggle={() => toggleGroup('text', 'quote')}>
                <RowSwitch
                  label="نمایش متن پایین"
                  value={settings.showQuote}
                  onChange={v => update('showQuote', v)}
                />

                {/* [AI disabled for this version] daily AI-generated quote —
                    re-enable with dailyAiQuote in SettingsContext.tsx and the
                    fetch block in QuoteWidget.tsx.
                <RowSwitch
                  label="جملهٔ روزانه با هوش مصنوعی ✨"
                  value={settings.dailyAiQuote}
                  onChange={v => update('dailyAiQuote', v)}
                  info="هر روز یک جملهٔ تازه (ساخته‌شده با هوش مصنوعی) به‌جای دسته‌ی زیر نمایش داده می‌شود. اگر این فیچر روی سرور فعال نباشد، خودکار به دسته‌ی انتخابی برمی‌گردد."
                /> */}

                {quoteCategories.length > 1 ? (
                  <RowChoices
                    label="دسته جمله‌ها"
                    options={quoteCategories.map(c => ({id: c.id, label: c.title}))}
                    selected={settings.quoteCategoryId || quoteCategories[0].id}
                    onSelect={id => update('quoteCategoryId', id)}
                  />
                ) : null}

                <RowSlider
                  label="اندازه متن"
                  value={settings.quoteFontScale}
                  min={0.7}
                  max={1.6}
                  step={0.1}
                  format={v => `${v.toFixed(1)}×`}
                  onChange={v => update('quoteFontScale', v)}
                  onDragActive={setSliderActive}
                />

                <RowColors
                  label="رنگ متن"
                  colors={TEXT_COLORS}
                  selected={settings.quoteTextColor}
                  onSelect={c => update('quoteTextColor', c)}
                />
                <Disclosure title="رنگ‌های بیشتر">
                  <RowColors
                    label="رنگ خط کوچک"
                    colors={TEXT_COLORS}
                    selected={settings.quoteSmallTextColor}
                    onSelect={c => update('quoteSmallTextColor', c)}
                  />
                </Disclosure>

                {/* <AppText style={styles.fieldLabel}>خط اول (کوچک)</AppText>
                <TextInput
                  style={styles.input}
                  value={settings.quoteLine1}
                  onChangeText={t => update('quoteLine1', t)}
                  placeholder="ما با این جوان‌ها"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />

                <AppText style={styles.fieldLabel}>خط دوم (بزرگ طلایی)</AppText>
                <TextInput
                  style={styles.input}
                  value={settings.quoteLine2}
                  onChangeText={t => update('quoteLine2', t)}
                  placeholder="به جایی خواهیم رسید"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                /> */}

                {/* --- COUNTDOWN FEATURE (disabled) ---------------------------------
                <View style={styles.divider} />
                <AppText style={styles.sectionTitle}>شمارش معکوس</AppText>

                <AppText style={styles.fieldLabel}>عنوان</AppText>
                <TextInput
                  style={styles.input}
                  value={settings.countdownLabel}
                  onChangeText={t => update('countdownLabel', t)}
                  placeholder="عنوان شمارش معکوس"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />

                <AppText style={styles.fieldLabel}>تاریخ مقصد (ISO)</AppText>
                <TextInput
                  style={styles.input}
                  value={settings.countdownTargetISO}
                  onChangeText={t => update('countdownTargetISO', t)}
                  placeholder="2040-01-01T00:00:00"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                />
                <HintLine>نمونه: ۲۰۴۰-۰۱-۰۱T۰۰:۰۰:۰۰ — تاریخ و عنوان دلخواه خودت را وارد کن.</HintLine>
                ------------------------------------------------------------------ */}

                <View style={styles.divider} />
                <AppText style={styles.sectionTitle}>ویجت صفحهٔ اصلی</AppText>

                <RowSwitch
                  label="چرخش خودکار جمله‌های ویجت"
                  value={settings.widgetAutoRotateQuote}
                  onChange={v => {
                    update('widgetAutoRotateQuote', v);
                    setWidgetAutoRotateQuote(v).catch(() => {});
                  }}
                  info="روی صفحه اصلی گوشی انگشت نگه دار و ویجت «Wallpaper» رو اضافه کن."                />
              </SettingsGroup>
              <SettingsGroup
                title="هوا و چیدمان"
                open={openGroup.text === 'layout'}
                onToggle={() => toggleGroup('text', 'layout')}>
                <RowSwitch
                  label="نمایش هوا"
                  hint="دما از موقعیت گوشی گرفته می‌شه"
                  value={settings.showWeather}
                  onChange={v => update('showWeather', v)}
                  info="دما همیشه زنده از موقعیت گوشی و سرویس هواشناسی گرفته می‌شه؛ تا وقتی گرفتنش موفق نشه چیزی نشون داده نمی‌شه."                />

                <RowSwitch
                  label="جابه‌جایی ساعت و متن"
                  hint="روشن کن و با انگشت بکششون"
                  value={settings.editLayout}
                  onChange={v => {
                    update('editLayout', v);
                    if (v) {
                      onClose();
                    }
                  }}
                  info="روشن کن و پنجره رو ببند، بعد ساعت، دما یا متن پایین رو با انگشت بکش تا جابه‌جا بشه."                />
                <Pressable
                  style={styles.galleryBtn}
                  onPress={() => {
                    update('clockOffset', {x: 0, y: 0});
                    update('weatherOffset', {x: 0, y: 0});
                    update('quoteOffset', {x: 0, y: 0});
                  }}>
                  <View style={styles.btnInner}>
                    <AppText style={styles.galleryBtnText}>بازنشانی موقعیت‌ها</AppText>
                    <RotateCcw size={18} color={ICON_COLOR} />
                  </View>
                </Pressable>
              </SettingsGroup>
            </>
          ) : null}

          {tab === 'home' ? (
            <>
              <Pressable
                style={({pressed}) => [styles.liveBtn, pressed && styles.liveBtnPressed]}
                onPress={() => onSetLiveWallpaper?.()}>
                <AppText style={styles.liveBtnTitle}>والپیپر زنده روی گوشیم</AppText>
                <AppText style={styles.liveBtnSub}>صفحه اصلی گوشیت زنده می‌شه</AppText>
              </Pressable>

              <View style={styles.homeSection}>
                <AppText style={styles.homeSectionTitle}>حالت‌های آماده</AppText>
                <PresetRow
                  onApplied={(label, previous) => setUndo({label, previous})}
                  onDeleteUserPreset={confirmDeletePreset}
                />
              </View>

              <Pressable
                style={({pressed}) => [styles.outlineBtn, pressed && styles.liveBtnPressed]}
                onPress={() => onOpenGallery?.()}>
                <AppText style={styles.outlineBtnText}>گالری والپیپرها</AppText>
                <ImageIcon size={22} color={ICON_COLOR} />
              </Pressable>

              <ListRow
                icon={Palette}
                title="تم‌ها"
                subtitle="والپیپر با ویجت‌های هماهنگ"
                onPress={() => onOpenThemes?.()}
              />
              <ListRow
                icon={Lock}
                title="عکس صفحه قفل"
                subtitle="اندروید روی صفحه قفل فقط عکس ثابت می‌ذاره"
                info="اندروید اجازه والپیپر زنده روی صفحه قفل نمی‌ده، برای همین اینجا عکس ثابت گذاشته می‌شه."
                onPress={() => onSetWallpaper?.('lock')}
              />
              <ListRow
                icon={BatteryCharging}
                title="نمایش موقع شارژ"
                subtitle="موقع شارژ، صحنه زنده پخش می‌شه"
                onPress={openScreenSaverSettings}
                last
              />
            </>
          ) : null}
        </ScrollView>

        {undo ? (
          <View style={[styles.undoBar, {bottom: insets.bottom + 12}]}>
            <AppText style={styles.undoText} numberOfLines={1}>
              حالت {undo.label} فعال شد
            </AppText>
            <Pressable style={styles.undoBtn} onPress={revertPreset} hitSlop={6}>
              <AppText style={styles.undoBtnText}>برگردان</AppText>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

type IconType = React.ComponentType<{size?: number; color?: string}>;

/** Tappable list row (home/more tabs): icon on the right, title + optional
 * one-line subtitle, and a left chevron — or a custom control in `right`. */
function ListRow({
  icon: Icon,
  title,
  subtitle,
  info,
  onPress,
  right,
  expanded,
  last,
}: {
  icon: IconType;
  title: string;
  subtitle?: string;
  info?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  expanded?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({pressed}) => [
        styles.listRow,
        !last && styles.listRowDivider,
        pressed && onPress && styles.listRowPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}>
      <Icon size={24} color={ICON_COLOR} />
      <View style={styles.listRowText}>
        <AppText style={styles.listRowTitle}>{title}</AppText>
        {subtitle ? (
          <AppText style={styles.listRowSub} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {info ? <InfoButton title={title} info={info} /> : null}
      {right ??
        (expanded ? (
          <ChevronDown size={20} color={MUTED_ICON} />
        ) : (
          <ChevronLeft size={20} color={MUTED_ICON} />
        ))}
    </Pressable>
  );
}

/** The sheet's on/off switch. Off shows a grey thumb on a dark track so it
 * can't be mistaken for on (white thumb on purple). */
function SettingSwitch({value, onChange}: {value: boolean; onChange: (v: boolean) => void}) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{true: '#7c3aed', false: '#3b3150'}}
      thumbColor={value ? '#ffffff' : '#9a93ad'}
      ios_backgroundColor="#3b3150"
    />
  );
}

/** «؟» next to a setting: shows the full explanation on tap. */
function InfoButton({title, info}: {title: string; info: string}) {
  return (
    <Pressable
      style={styles.infoBtn}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={`توضیح ${title}`}
      onPress={() => showAlert(title, info)}>
      <AppText style={styles.infoBtnText}>؟</AppText>
    </Pressable>
  );
}

/** Setting label, with a «؟» when there is a longer explanation. */
function RowLabel({label, hint, info}: {label: string; hint?: string; info?: string}) {
  return (
    <View style={styles.labelWrap}>
      <View style={styles.labelText}>
        <AppText style={styles.rowLabel}>{label}</AppText>
        {hint ? (
          <AppText style={styles.rowHint} numberOfLines={1}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {info ? <InfoButton title={label} info={info} /> : null}
    </View>
  );
}

/** At most one line of explanation under a setting; anything longer goes
 * behind the «؟» via `info`. */
function HintLine({children, info}: {children: React.ReactNode; info?: string}) {
  return (
    <View style={styles.hintRow}>
      <AppText style={[styles.hint, styles.hintText]} numberOfLines={1}>
        {children}
      </AppText>
      {info ? <InfoButton title="توضیح" info={info} /> : null}
    </View>
  );
}

/** A closed-by-default row inside a group («رنگ‌های بیشتر», «پیشرفته»)
 * that tucks away settings most people never need. */
function Disclosure({
  title,
  summary,
  children,
}: {
  title: string;
  /** What's inside, shown after the title while closed: «پیشرفته: عمق سه‌بعدی». */
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        style={styles.disclosureHeader}
        onPress={() => setOpen(o => !o)}
        accessibilityRole="button"
        accessibilityState={{expanded: open}}>
        <AppText style={styles.disclosureTitle}>
          {summary ? `${title}: ${summary}` : title}
        </AppText>
        {open ? (
          <ChevronDown size={20} color={MUTED_ICON} />
        ) : (
          <ChevronLeft size={20} color={MUTED_ICON} />
        )}
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** Collapsible section in «ظاهر» / «ساعت و متن»: a 56dp header row with the
 * group name and an arrow; the body renders only while open. */
function SettingsGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Pressable
        style={styles.groupHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{expanded: open}}>
        <AppText style={[styles.groupTitle, open && styles.groupTitleOpen]}>{title}</AppText>
        {open ? (
          <ChevronUp size={22} color={ICON_COLOR} />
        ) : (
          <ChevronDown size={22} color={MUTED_ICON} />
        )}
      </Pressable>
      {open ? <View style={styles.groupBody}>{children}</View> : null}
    </View>
  );
}

function RowSwitch({
  label,
  value,
  onChange,
  info,
  hint,
}: {
  label: string;
  /** Full explanation shown behind a «؟» next to the label. */
  info?: string;
  /** One line under the label. */
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.labelText}>
        <AppText style={styles.rowLabel}>{label}</AppText>
        {hint ? (
          <AppText style={styles.rowHint} numberOfLines={1}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {info ? <InfoButton title={label} info={info} /> : null}
      <SettingSwitch value={value} onChange={onChange} />
    </View>
  );
}

function RowStepper({
  label,
  value,
  onDec,
  onInc,
  info,
  hint,
}: {
  label: string;
  /** Full explanation shown behind a «؟» next to the label. */
  info?: string;
  /** One line under the label. */
  hint?: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepBtn}
          onPress={onDec}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`کم کردن ${label}`}>
          <Minus size={18} color="#eafffb" />
        </Pressable>
        <AppText style={styles.stepValue}>{value}</AppText>
        <Pressable
          style={styles.stepBtn}
          onPress={onInc}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`زیاد کردن ${label}`}>
          <Plus size={18} color="#eafffb" />
        </Pressable>
      </View>
      <RowLabel label={label} hint={hint} info={info} />
    </View>
  );
}

/**
 * Drag (or tap) along the track to pick a value; smaller on the left, bigger
 * on the right, with a small and a big "A" at the ends to make that obvious.
 * While dragging only the slider itself re-renders; the value is committed
 * via onChange once on release, because every settings update re-renders the
 * whole wallpaper and doing that per move made the drag lag badly.
 */
function RowSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  onDragActive,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  /** Called with true when a finger lands on the slider and false when it
   * lifts, so the parent can stop its ScrollView from stealing the drag. */
  onDragActive?: (active: boolean) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  // The responder is created once, so it reads the latest props via a ref.
  const latest = useRef({value, min, max, step, onChange, onDragActive, trackWidth});
  latest.current = {value, min, max, step, onChange, onDragActive, trackWidth};
  const startX = useRef(0);
  const dragRef = useRef<number | null>(null);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the drag even if the parent ScrollView wants to scroll.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: e => {
        startX.current = e.nativeEvent.locationX;
        setFromX(startX.current);
      },
      onPanResponderMove: (_e, g) => setFromX(startX.current + g.dx),
      onPanResponderRelease: commit,
      onPanResponderTerminate: commit,
    }),
  ).current;

  function setFromX(x: number) {
    const cur = latest.current;
    if (cur.trackWidth <= 0 || cur.max <= cur.min) return;
    const ratio = Math.min(1, Math.max(0, x / cur.trackWidth));
    const raw = cur.min + ratio * (cur.max - cur.min);
    const next = +(
      Math.min(cur.max, Math.max(cur.min, Math.round(raw / cur.step) * cur.step))
    ).toFixed(2);
    if (next !== dragRef.current) {
      dragRef.current = next;
      setDragValue(next);
    }
  }

  function commit() {
    const final = dragRef.current;
    dragRef.current = null;
    setDragValue(null);
    latest.current.onDragActive?.(false);
    if (final !== null && final !== latest.current.value) {
      latest.current.onChange(final);
    }
  }

  const shown = dragValue ?? value;
  const ratio =
    max > min ? Math.min(1, Math.max(0, (shown - min) / (max - min))) : 0;

  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <AppText style={styles.rowLabel}>{label}</AppText>
        <AppText style={styles.stepValue}>{format(shown)}</AppText>
      </View>
      <View style={styles.sliderBody}>
        <AppText style={styles.sliderIconSmall}>A</AppText>
        <View
          style={styles.sliderTouch}
          onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          // Fires on touch-down, before the ScrollView could claim the move.
          onTouchStart={() => onDragActive?.(true)}
          {...responder.panHandlers}>
          <View style={styles.sliderTrack} pointerEvents="none">
            <View style={[styles.sliderFill, {width: `${ratio * 100}%`}]} />
          </View>
          <View
            pointerEvents="none"
            style={[styles.sliderThumb, {left: `${ratio * 100}%`}]}
          />
        </View>
        <AppText style={styles.sliderIconBig}>A</AppText>
      </View>
    </View>
  );
}

function RowChoices({
  label,
  options,
  selected,
  onSelect,
  info,
  hint,
}: {
  label: string;
  /** Full explanation shown behind a «؟» next to the label. */
  info?: string;
  /** One line under the label. */
  hint?: string;
  options: {id: string; label: string}[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.choicesRow}>
      <RowLabel label={label} hint={hint} info={info} />
      <View style={styles.chips}>
        {options.map(opt => {
          const active = opt.id === selected;
          return (
            <Pressable
              key={opt.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt.id)}>
              <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Perceived brightness 0..255 of a #rrggbb colour (mid-grey for anything else). */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) {
    return 128;
  }
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function RowColors({
  label,
  colors,
  selected,
  onSelect,
  info,
  hint,
}: {
  label: string;
  /** Full explanation shown behind a «؟» next to the label. */
  info?: string;
  /** One line under the label. */
  hint?: string;
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <View style={styles.choicesRow}>
      <RowLabel label={label} hint={hint} info={info} />
      <View style={styles.chips}>
        {colors.map(c => {
          const active = c.toLowerCase() === selected.toLowerCase();
          return (
            <Pressable
              key={c}
              onPress={() => onSelect(c)}
              hitSlop={9}
              accessibilityRole="button"
              accessibilityLabel={`رنگ ${c}`}
              accessibilityState={{selected: active}}
              style={[
                styles.swatch,
                {backgroundColor: c},
                // The settings sheet is near-black, so a black swatch needs a
                // visible ring to be found at all.
                luminance(c) < 40 && styles.swatchOnDark,
                active && styles.swatchActive,
              ]}>
              {active ? (
                <Check size={16} strokeWidth={3} color={luminance(c) > 220 ? '#000000' : '#ffffff'} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '82%',
    backgroundColor: '#170b28',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  handleZone: {
    // Full-width 32dp strip: an easy target for the drag-to-close gesture.
    height: 32,
    marginTop: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBar: {
    flexDirection: 'row-reverse',
    // Bleed past the sheet's side padding so the divider spans the sheet.
    marginHorizontal: -20,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 10,
    gap: 8,
  },
  tabBtnText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  tabBtnTextActive: {
    color: '#eafffb',
  },
  tabIndicator: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: '#8b5cf6',
  },
  scroll: {
    flex: 1,
    alignSelf: 'stretch',
  },
  content: {
    // Each tab scrolls on its own below the fixed tab bar; the top gap keeps
    // the first row clear of the bar, bottom padding comes from the safe area.
    paddingTop: 12,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  labelText: {flex: 1},
  sliderRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sliderHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  sliderIconSmall: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  sliderIconBig: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 22,
  },
  // Taller than the visible track so the thumb is easy to grab.
  sliderTouch: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  sliderThumb: {
    position: 'absolute',
    marginLeft: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#eafffb',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    color: '#f5e6b3',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 56,
    textAlign: 'center',
  },
  choicesRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  chipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    borderColor: '#8b5cf6',
  },
  chipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    writingDirection: 'rtl',
  },
  chipTextActive: {
    color: '#eafffb',
    fontWeight: '700',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  swatchOnDark: {borderColor: 'rgba(255,255,255,0.6)'},
  swatchActive: {
    borderColor: '#eafffb',
    borderWidth: 3,
  },
  liveBtn: {
    marginTop: 4,
    backgroundColor: '#7c3aed',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  liveBtnPressed: {
    opacity: 0.85,
  },
  liveBtnTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  liveBtnSub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    writingDirection: 'rtl',
  },
  disclosureHeader: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  disclosureTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    writingDirection: 'rtl',
  },
  listRow: {
    minHeight: 64,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  listRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  listRowPressed: {opacity: 0.7},
  listRowText: {flex: 1},
  listRowTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listRowSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  outlineBtn: {
    marginTop: 20,
    minHeight: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  outlineBtnText: {color: '#ffffff', fontSize: 17, fontWeight: '700'},
  homeSectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  btnInner: {flexDirection: 'row-reverse', alignItems: 'center', gap: 8},
  group: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(139, 92, 246, 0.25)',
  },
  groupHeader: {
    height: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  groupTitleOpen: {color: '#c4b5fd'},
  groupBody: {paddingBottom: 12},
  undoBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 52,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#2a1748',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  undoText: {color: '#eafffb', fontSize: 14, flex: 1, writingDirection: 'rtl'},
  undoBtn: {minHeight: 48, justifyContent: 'center', paddingHorizontal: 8},
  undoBtnText: {color: '#c4b5fd', fontSize: 15, fontWeight: '700'},
  homeSection: {
    marginTop: 24,
  },
  galleryBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  randomBgRow: {
    gap: 10,
    paddingVertical: 6,
  },
  randomBgThumbWrap: {
    width: 64,
    height: 64,
  },
  randomBgThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  randomBgRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(20,10,30,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiEntry: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderColor: 'rgba(94, 234, 212, 0.5)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  aiEntryText: {
    color: '#5eead4',
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  promoRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  promoInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#eafffb',
    fontSize: 15,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  promoBtn: {
    backgroundColor: 'rgba(245,196,81,0.22)',
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,196,81,0.5)',
  },
  promoBtnDisabled: {
    opacity: 0.5,
  },
  promoBtnText: {
    color: '#f5e6b3',
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  galleryBtnText: {
    color: '#eafffb',
    fontSize: 15,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    marginVertical: 14,
  },
  fontGroupGap: {
    marginTop: 18,
  },
  fontList: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  fontChip: {
    minWidth: '30%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
  },
  fontChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: '#8b5cf6',
  },
  fontSample: {
    color: '#f5e6b3',
    fontSize: 20,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  fontName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
    writingDirection: 'rtl',
  },
  fontNameActive: {
    color: '#eafffb',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#c4b5fd',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#eafffb',
    fontSize: 15,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  labelWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: {color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700'},
  hintRow: {flexDirection: 'row-reverse', alignItems: 'center', gap: 8},
  hintText: {flexShrink: 1},
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
