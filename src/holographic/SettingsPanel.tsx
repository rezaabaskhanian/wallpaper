import React, {useEffect, useRef, useState} from 'react';
import {
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
import AppText from './AppText';
import {showAlert} from './AppAlert';
// import {launchImageLibrary} from 'react-native-image-picker';
import {BIG_CLOCK_BASE_FONT_SIZE, bigClockMaxFontSize} from './ClockWidget';
import {BACKGROUNDS, MAX_ORBS, RINGS} from './config';
import {fontsForScript, getScriptFont} from './fonts';
import {setWidgetAutoRotateQuote} from './homeWidget';
import type {WallpaperTarget} from './lockWallpaper';
import {openLauncherSettings, openScreenSaverSettings} from './systemScreens';
import {useSettings} from './SettingsContext';
import SunDayPreview from './SunDayPreview';
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

/** Tabs that split the once-long settings list into focused categories. */
type TabId =
  | 'general'
  | 'sphere'
  | 'background'
  | 'effects'
  | 'fonts'
  | 'widgets'
  | 'device';
const TABS: {id: TabId; label: string}[] = [
  {id: 'general', label: 'عمومی'},
  {id: 'sphere', label: 'کره'},
  {id: 'background', label: 'پس‌زمینه'},
  {id: 'effects', label: 'جلوه‌ها'},
  {id: 'fonts', label: 'فونت'},
  {id: 'widgets', label: 'ویجت‌ها'},
  {id: 'device', label: 'دستگاه'},
];

/** Bottom-sheet style settings panel for the wallpaper. */
export default function SettingsPanel({
  visible,
  onClose,
  onSetWallpaper,
  onSetLiveWallpaper,
  onOpenGallery,
  onOpenHelp,
  // onOpenAIGenerate, // [AI disabled for this version]
}: Props) {
  // applyTheme از useSettings() اینجا موقتاً استفاده نمی‌شود چون بخش «تم
  // آماده» بالا کامنت شده — با برگرداندن آن UI، اینجا هم برگردانده شود.
  const {settings, update, userPresets, savePreset, applyPreset, deletePreset} =
    useSettings();
  const {premiumUnlocked, redeemCode, orbitItems, orbitCategories, quoteCategories} =
    useStore();
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
  const [tab, setTab] = useState<TabId>('general');
  // True while a finger is on a RowSlider, so the ScrollView doesn't take
  // over a horizontal drag partway through.
  const [sliderActive, setSliderActive] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [promoInput, setPromoInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

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
    showAlert('حذف پرست', `«${label}» حذف شود؟`, {
      confirmText: 'حذف',
      cancelText: 'انصراف',
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
        showAlert('خطا', 'باز کردن تلگرام ممکن نشد.'),
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
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* تب‌بار دسته‌ها: اولین چیزی که دیده می‌شود، بالای مودال. */}
        <View style={styles.tabBar}>
          {TABS.map(t => {
            const active = t.id === tab;
            return (
              <Pressable
                key={t.id}
                style={styles.tabBtn}
                onPress={() => selectTab(t.id)}>
                <AppText
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t.label}
                </AppText>
                <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.entryRow}>
          <Pressable
            style={[styles.galleryEntry, styles.entryRowItem]}
            onPress={() => onOpenGallery?.()}>
            <AppText style={styles.galleryEntryText}>🖼️ گالری والپیپرها</AppText>
          </Pressable>
          <Pressable
            style={[styles.helpEntry, styles.entryRowItem]}
            onPress={() => onOpenHelp?.()}>
            <AppText style={styles.helpEntryText}>📖 راهنمای کار با اپ</AppText>
          </Pressable>
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
          contentContainerStyle={styles.content}>
          {tab === 'general' ? (
            <>
              {!premiumUnlocked ? (
                <>
                  <AppText style={styles.sectionTitle}>کد تخفیف</AppText>
                  <View style={styles.promoRow}>
                    <TextInput
                      style={styles.promoInput}
                      value={promoInput}
                      onChangeText={setPromoInput}
                      placeholder="کد تخفیف را وارد کن"
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
                  <AppText style={styles.hint}>
                    با وارد کردن کد معتبر، همهٔ والپیپرهای پرمیوم باز می‌شوند.
                  </AppText>
                  <View style={styles.divider} />
                </>
              ) : null}

              {/* «تم آماده» فعلاً کامنت شده — نیاز به اصلاح دارد، شاید بعداً
                  برگردانده شود. See THEMES in ./themes.ts and applyTheme in
                  ./SettingsContext.tsx (هنوز موجودند، فقط UI‌اش مخفی است).
              <AppText style={styles.sectionTitle}>تم آماده</AppText>
              <View style={styles.chips}>
                {THEMES.map(t => {
                  const active = t.id === settings.themeId;
                  return (
                    <Pressable
                      key={t.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => applyTheme(t.id)}>
                      <AppText
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}>
                        {t.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              */}

              <AppText style={styles.sectionTitle}>پرست‌های من</AppText>
              {userPresets.length > 0 ? (
                <View style={styles.chips}>
                  {userPresets.map(p => (
                    <View key={p.id} style={styles.presetChipWrap}>
                      <Pressable style={styles.chip} onPress={() => applyPreset(p.id)}>
                        <AppText style={styles.chipText}>{p.label}</AppText>
                      </Pressable>
                      <Pressable
                        style={styles.presetDeleteBtn}
                        hitSlop={8}
                        onPress={() => confirmDeletePreset(p.id, p.label)}>
                        <AppText style={styles.presetDeleteText}>✕</AppText>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <AppText style={styles.hint}>هنوز پرستی ذخیره نکرده‌ای.</AppText>
              )}

              <View style={styles.promoRow}>
                <TextInput
                  style={styles.promoInput}
                  value={presetNameInput}
                  onChangeText={setPresetNameInput}
                  placeholder="نام پرست جدید"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
                <Pressable
                  style={[
                    styles.promoBtn,
                    !presetNameInput.trim() && styles.promoBtnDisabled,
                  ]}
                  disabled={!presetNameInput.trim()}
                  onPress={() => {
                    savePreset(presetNameInput.trim());
                    setPresetNameInput('');
                  }}>
                  <AppText style={styles.promoBtnText}>ذخیره</AppText>
                </Pressable>
              </View>
              <AppText style={styles.hint}>
                تنظیمات فعلی (رنگ، ذرات، چرخش، پس‌زمینه و…) را با یک نام
                دلخواه ذخیره کن تا بعداً با یک لمس به همین حالت برگردی.
              </AppText>

              <View style={styles.divider} />

              <RowSwitch
                label="پیش‌نمایش متحرک والپیپرهای قفل‌شده (گالری)"
                value={settings.animatedLockedPreview}
                onChange={v => update('animatedLockedPreview', v)}
              />

              <View style={styles.divider} />
              <AppText style={styles.sectionTitle}>ارتباط با سازنده</AppText>
              <Pressable style={styles.galleryBtn} onPress={openDeveloperTelegram}>
                <AppText style={styles.galleryBtnText}>
                  💬 تلگرام: @{DEVELOPER_TELEGRAM_USERNAME}
                </AppText>
              </Pressable>

              <View style={styles.divider} />
              <AppText style={styles.sectionTitle}>منبع محتوا</AppText>
              <AppText style={styles.hint}>
                جملات نمایش داده‌شده در برنامه برگرفته و خلاصه‌شده از پایگاه
                اطلاع‌رسانی دفتر حفظ و نشر آثار حضرت آیت‌الله العظمی
                خامنه‌ای (khamenei.ir) است.
              </AppText>
            </>
          ) : null}

          {tab === 'background' ? (
            <>
              <RowChoices
                label="پس‌زمینه"
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
                <AppText style={styles.hint}>
                  یک عکس از گالری انتخاب شده — گزینهٔ «گالری» را در بالا بزن.
                </AppText>
              ) : null}

              <View style={styles.divider} />
              <AppText style={styles.sectionTitle}>چرخش رندوم پس‌زمینه‌ها</AppText>

              <RowSwitch
                label="نمایش رندوم عکس‌های ستاره‌دار"
                value={settings.randomBackgroundEnabled}
                onChange={v => update('randomBackgroundEnabled', v)}
              />
              <AppText style={styles.hint}>
                هر بار که اپ باز می‌شود، یکی از عکس‌های زیر رندوم به‌عنوان
                پس‌زمینه انتخاب می‌شود. از «گالری والپیپر» یک عکس را باز کن و
                «☆ افزودن به چرخش رندوم» را بزن (حداکثر ۵ عکس).
              </AppText>

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
                        onPress={() =>
                          update(
                            'randomBackgroundUris',
                            settings.randomBackgroundUris.filter(u => u !== uri),
                          )
                        }>
                        <AppText style={styles.randomBgRemoveText}>×</AppText>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <AppText style={styles.hint}>هنوز عکسی اضافه نشده.</AppText>
              )}

              <View style={styles.divider} />

              <AppText style={styles.sectionTitle}>حرکت و لمس</AppText>
              <RowSwitch
                label="زنده‌سازی پس‌زمینه (حرکت آرام)"
                value={settings.livingWallpaper}
                onChange={v => update('livingWallpaper', v)}
              />
              <AppText style={styles.hint}>
                عکس پس‌زمینه به‌آرامی زوم و جابه‌جا می‌شود؛ هر بار که اپ باز
                می‌شود هم یک حرکت شروع (بیدار شدن) دارد.
              </AppText>

              {settings.livingWallpaper ? (
                <>
                  <RowSwitch
                    label="لرزش آرام پس‌زمینه"
                    value={settings.wallpaperShake}
                    onChange={v => update('wallpaperShake', v)}
                  />
                  <AppText style={styles.hint}>
                    یک لرزش بسیار ریز و ملایم روی حرکت آرام بالا اضافه می‌شود.
                  </AppText>
                </>
              ) : null}

              <RowSwitch
                label="موج آب با لمس صفحه"
                value={settings.waterRipple}
                onChange={v => update('waterRipple', v)}
              />
              <AppText style={styles.hint}>
                با هر لمس، مثل افتادن سنگ در آب، موج روی خودِ عکس پخش می‌شود؛
                هر بار که اپ باز می‌شود هم یک موج از وسط صفحه شروع می‌شود.
                اگر لایو ولپیپر را هم ست کرده باشید، روی صفحهٔ اصلی گوشی هم کار
                می‌کند (اندروید ۱۳ به بالا). ⚡ با این قابلیت مصرف باتری کمی
                بیشتر می‌شود.
              </AppText>

              {settings.waterRipple ? (
                <>
                  <RowSwitch
                    label="موج خودکار (هر ۱۰ ثانیه)"
                    value={settings.waterRippleAuto}
                    onChange={v => update('waterRippleAuto', v)}
                  />
                  <AppText style={styles.hint}>
                    بدون لمس هم هر ۱۰ ثانیه یک موج از یک نقطهٔ تصادفی شروع
                    می‌شود. فقط وقتی اپ باز است اجرا می‌شود تا باتری مصرف نکند.
                  </AppText>
                </>
              ) : null}


              <RowSwitch
                label="پارالاکس با حرکت گوشی (ژیروسکوپ)"
                value={settings.gyroParallax}
                onChange={v => update('gyroParallax', v)}
              />
              <AppText style={styles.hint}>
                با کج‌کردن گوشی، پس‌زمینه و گوی‌ها کمی جابه‌جا می‌شوند — علاوه
                بر کشیدن با انگشت.
              </AppText>

              <RowSwitch
                label="پارالاکس سه‌بعدی (شبیه‌سازی عمق)"
                value={settings.depthParallax}
                onChange={v => update('depthParallax', v)}
              />
              <AppText style={styles.hint}>
                عکس پس‌زمینه مثل یک صفحهٔ سه‌بعدی با کج‌شدن گوشی می‌چرخد؛
                نیاز به روشن‌بودن «پارالاکس با حرکت گوشی» دارد. توجه: این
                جداسازی واقعیِ سوژه از پس‌زمینه (که به هوش‌مصنوعی نیاز دارد)
                نیست، فقط شبیه‌سازی بصری عمق است.
              </AppText>

              <RowSwitch
                label="واکنش لمسی (حلقهٔ نور روی ضربه)"
                value={settings.touchRipple}
                onChange={v => update('touchRipple', v)}
              />
              <AppText style={styles.hint}>
                با هر ضربه روی صفحه، یک حلقهٔ نور کوتاه از همان نقطه باز
                می‌شود و محو می‌شود.
              </AppText>

            </>
          ) : null}

          {tab === 'sphere' ? (
            <>
              <RowSwitch
                label="چرخش خودکار"
                value={settings.autoRotate}
                onChange={v => update('autoRotate', v)}
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
                  label="تم اوربیت (شهدا/طبیعت/...)"
                  options={orbitCategories.map(c => ({id: c.id, label: c.title}))}
                  selected={settings.orbitCategoryId}
                  onSelect={id => update('orbitCategoryId', id)}
                />
              ) : null}

              <RowChoices
                label="حالت نمایش گوی‌ها"
                options={[
                  {id: 'steady', label: 'ثابت'},
                  {id: 'flicker', label: '✨ پیدا و پنهان'},
                ]}
                selected={settings.orbVisibility}
                onSelect={id =>
                  update('orbVisibility', id as 'steady' | 'flicker')
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

              <RowChoices
                label="محور چرخش"
                options={[
                  {id: 'x', label: 'محور X'},
                  {id: 'y', label: 'محور Y'},
                  {id: 'z', label: 'محور Z'},
                  {id: 'mixed', label: 'ناهمگون (اتمی)'},
                ]}
                selected={settings.rotationAxis}
                onSelect={id =>
                  update('rotationAxis', id as 'x' | 'y' | 'z' | 'mixed')
                }
              />
            </>
          ) : null}

          {tab === 'effects' ? (
            <>
              <RowChoices
                label="حالت روز/شب"
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
                label="نور خورشید (Lens Flare)"
                value={settings.sunFlare}
                onChange={v => update('sunFlare', v)}
              />
              <AppText style={styles.hint}>
                یک هالهٔ نور شبیه خورشید که همراه با ساعت واقعی روز روی آسمان
                حرکت می‌کند و نورش عوض می‌شود: صبح از سمت چپ و پایین با نور
                نارنجی طلوع می‌کند، ظهر بالای صفحه و سفید و ملایم است، و عصر
                سمت راست با نور نارنجی غروب می‌کند؛ شب خاموش است. زمان طلوع و
                غروب از موقعیت مکانی شما گرفته می‌شود.
              </AppText>
              {settings.sunFlare ? (
                <>
                  <SunDayPreview />
                  <AppText style={styles.hint}>
                    پیش‌نمایش: یک روز کامل در چند ثانیه. نقطهٔ سفید جای خورشید
                    در همین لحظه است.
                  </AppText>
                  {settings.dayNightMode !== 'auto' ? (
                    <AppText style={styles.hint}>
                      ⚠️ برای اینکه نور خورشید روی صفحه با ساعت روز حرکت کند،
                      «حالت روز/شب» را روی «خودکار» بگذار.
                    </AppText>
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
                  {id: 'dot', label: '✦ نقطه'},
                  {id: 'heart', label: '♥ قلب'},
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
              />
              <AppText style={styles.hint}>
                هرچه شدت بیشتر باشد، هم تعداد ذرات نور بیشتر می‌شود و هم
                سرعت حرکتشان.
              </AppText>

              <RowSwitch
                label="رنگ پویا از عکس پس‌زمینه"
                value={settings.dynamicColor}
                onChange={v => update('dynamicColor', v)}
              />
              <AppText style={styles.hint}>
                به‌جای رنگ دستی زیر، رنگ ذرات نور از خودِ عکس پس‌زمینهٔ فعلی
                استخراج می‌شود.
              </AppText>


              <RowColors
                label="رنگ نور"
                colors={GLOW_COLORS}
                selected={settings.glowColor}
                onSelect={c => update('glowColor', c)}
              />
              {settings.dynamicColor ? (
                <AppText style={styles.hint}>
                  تا وقتی «رنگ پویا» روشن است، این انتخاب نادیده گرفته
                  می‌شود.
                </AppText>
              ) : null}

              <RowSwitch
                label="افکت سینمایی (تیرگی لبه‌ها)"
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
                label="جلوه‌های آب‌وهوا (باران/برف)"
                options={[
                  {id: 'off', label: 'خاموش'},
                  {id: 'rain', label: '🌧️ باران'},
                  {id: 'snow', label: '❄️ برف'},
                  {id: 'auto', label: 'خودکار (بر اساس هوا)'},
                ]}
                selected={settings.weatherEffects}
                onSelect={id =>
                  update('weatherEffects', id as 'off' | 'rain' | 'snow' | 'auto')
                }
              />
              {settings.weatherEffects === 'auto' ? (
                <AppText style={styles.hint}>
                  حالت خودکار به گرفتن موفق وضعیت هوا از GPS و API نیاز دارد؛
                  اگر دسترسی موقعیت مکانی داده نشود یا اینترنت نباشد، فعال
                  نمی‌شود.
                </AppText>
              ) : null}

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
                <AppText style={styles.hint}>
                  مه و متن پایین صفحه خاموش می‌شود و هر ۸ ثانیه یک موشک یا
                  پهباد از یک گوشهٔ صفحه رد می‌شود.
                </AppText>
              ) : null} */}
            </>
          ) : null}

          {tab === 'fonts' ? (
            <>
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
            </>
          ) : null}

          {tab === 'widgets' ? (
            <>
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
                label="حالت نمایش ساعت"
                options={[
                  {id: '12', label: '۱۲ ساعته'},
                  {id: '24', label: '۲۴ ساعته'},
                ]}
                selected={settings.hourFormat}
                onSelect={id => update('hourFormat', id as '12' | '24')}
              />

              {settings.hourFormat === '12' ? (
                <RowSwitch
                  label="نمایش قبل‌ازظهر/بعدازظهر"
                  value={settings.showAmPm}
                  onChange={v => update('showAmPm', v)}
                />
              ) : null}

              <RowChoices
                label="ارقام ساعت"
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
                  {id: 'inline', label: 'بالا (کنار تاریخ)'},
                  {id: 'bigCentered', label: 'وسط صفحه (بزرگ)'},
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
              />
              {settings.clockLayout === 'bigCentered' ? (
                <AppText style={styles.hint}>
                  در این حالت فقط ساعت وسط صفحه و بزرگ نمایش داده می‌شود —
                  ساعت‌شمار بالا، دقیقه پایین — و تاریخ زیر آن نشان داده
                  نمی‌شود.
                </AppText>
              ) : null}

              <RowSlider
                label="اندازه فونت ساعت"
                value={Math.min(settings.clockFontScale, maxClockScale)}
                min={0.7}
                max={maxClockScale}
                step={0.1}
                format={v => `${v.toFixed(1)}×`}
                onChange={v => update('clockFontScale', v)}
                onDragActive={setSliderActive}
              />

              <RowColors
                label="رنگ فونت ساعت"
                colors={TEXT_COLORS}
                selected={settings.clockTextColor}
                onSelect={c => update('clockTextColor', c)}
              />
              <RowColors
                label="رنگ تاریخ (متن کوچک)"
                colors={TEXT_COLORS}
                selected={settings.clockSmallTextColor}
                onSelect={c => update('clockSmallTextColor', c)}
              />

              <RowSwitch
                label="نمایش هوا"
                value={settings.showWeather}
                onChange={v => update('showWeather', v)}
              />
              <AppText style={styles.hint}>
                دما همیشه زنده از طریق GPS و API آب‌وهوا گرفته می‌شود؛ تا وقتی
                گرفتن آن موفق نشود چیزی نمایش داده نمی‌شود.
              </AppText>

              <View style={styles.divider} />
              <AppText style={styles.sectionTitle}>چیدمان صفحه</AppText>

              <RowSwitch
                label="جابجایی ساعت و متن (کشیدن)"
                value={settings.editLayout}
                onChange={v => {
                  update('editLayout', v);
                  if (v) {
                    onClose();
                  }
                }}
              />
              <AppText style={styles.hint}>
                روشن کن و پنجره را ببند، سپس ساعت، دما یا متن پایین را با انگشت
                بکش تا جابه‌جا شود.
              </AppText>
              <Pressable
                style={styles.galleryBtn}
                onPress={() => {
                  update('clockOffset', {x: 0, y: 0});
                  update('weatherOffset', {x: 0, y: 0});
                  update('quoteOffset', {x: 0, y: 0});
                }}>
                <AppText style={styles.galleryBtnText}>
                  ↺ بازنشانی موقعیت‌ها
                </AppText>
              </Pressable>

              <View style={styles.divider} />
              <AppText style={styles.sectionTitle}>متن پایین صفحه</AppText>

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
              />
              <AppText style={styles.hint}>
                هر روز یک جملهٔ تازه (ساخته‌شده با هوش مصنوعی) به‌جای دسته‌ی
                زیر نمایش داده می‌شود. اگر این فیچر روی سرور فعال نباشد،
                خودکار به دسته‌ی انتخابی برمی‌گردد.
              </AppText> */}

              {quoteCategories.length > 1 ? (
                <RowChoices
                  label="دسته‌ی نقل‌قول‌ها"
                  options={quoteCategories.map(c => ({id: c.id, label: c.title}))}
                  selected={settings.quoteCategoryId || quoteCategories[0].id}
                  onSelect={id => update('quoteCategoryId', id)}
                />
              ) : null}

              <RowSlider
                label="اندازه فونت متن پایین"
                value={settings.quoteFontScale}
                min={0.7}
                max={1.6}
                step={0.1}
                format={v => `${v.toFixed(1)}×`}
                onChange={v => update('quoteFontScale', v)}
                onDragActive={setSliderActive}
              />

              <RowColors
                label="رنگ فونت متن پایین"
                colors={TEXT_COLORS}
                selected={settings.quoteTextColor}
                onSelect={c => update('quoteTextColor', c)}
              />
              <RowColors
                label="رنگ خط کوچک متن پایین"
                colors={TEXT_COLORS}
                selected={settings.quoteSmallTextColor}
                onSelect={c => update('quoteSmallTextColor', c)}
              />

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
              <AppText style={styles.hint}>
                نمونه: ۲۰۴۰-۰۱-۰۱T۰۰:۰۰:۰۰ — تاریخ و عنوان دلخواه خودت را وارد کن.
              </AppText>
              ------------------------------------------------------------------ */}
            </>
          ) : null}

          {tab === 'device' ? (
            <>
              <AppText style={styles.sectionTitle}>نمایش روی گوشی</AppText>

              <AppText style={styles.fieldLabel}>
                والپیپر (تصویر ثابت از پس‌زمینهٔ فعلی)
              </AppText>
              <View style={styles.btnRow}>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => onSetWallpaper?.('lock')}>
                  <AppText style={styles.smallBtnText}>🔒 قفل</AppText>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => onSetWallpaper?.('home')}>
                  <AppText style={styles.smallBtnText}>🏠 اصلی</AppText>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => onSetWallpaper?.('both')}>
                  <AppText style={styles.smallBtnText}>🔒🏠 هردو</AppText>
                </Pressable>
              </View>
              <AppText style={styles.hint}>
                ساعت و متن حذف می‌شوند و فقط پس‌زمینه ذخیره می‌شود. تصویر ثابت
                است (اندروید انیمیشن زنده روی صفحهٔ قفل نمی‌دهد).
              </AppText>

              <Pressable
                style={styles.galleryBtn}
                onPress={() => onSetLiveWallpaper?.()}>
                <AppText style={styles.galleryBtnText}>
                  ✨ ست کردن لایو ولپیپر (فقط صفحهٔ اصلی)
                </AppText>
              </Pressable>
              <AppText style={styles.hint}>
                این یکی واقعاً زنده است — عکس فعلی ذخیره و صفحهٔ «تنظیم ولپیپر
                زنده» اندروید باز می‌شود؛ آنجا «Set wallpaper» را بزن. پشت
                آیکون‌های صفحهٔ اصلی اجرا می‌شود، نه پشت صفحهٔ قفل (محدودیت
                خودِ اندروید از نسخهٔ ۷ به بعد).
              </AppText>

              <Pressable
                style={styles.galleryBtn}
                onPress={openScreenSaverSettings}>
                <AppText style={styles.galleryBtnText}>
                  🖥️ انتخاب به‌عنوان محافظ صفحه
                </AppText>
              </Pressable>
              <AppText style={styles.hint}>
                هنگام بی‌کاری یا شارژ، صحنهٔ زنده به‌جای محافظ صفحه اجرا می‌شود.
              </AppText>

              <Pressable style={styles.galleryBtn} onPress={openLauncherSettings}>
                <AppText style={styles.galleryBtnText}>
                  🏠 تنظیم به‌عنوان صفحهٔ خانه (لانچر)
                </AppText>
              </Pressable>
              <AppText style={styles.hint}>
                صحنهٔ زنده پشت آیکون‌های خانه اجرا می‌شود. توجه: این اپ فعلاً
                مدیریت اپ‌ها/آیکون‌ها را ندارد؛ برای بازگشت، لانچر پیش‌فرض گوشی
                را عوض کن.
              </AppText>

              <View style={styles.divider} />
              <AppText style={styles.sectionTitle}>ویجت صفحهٔ اصلی</AppText>

              <RowSwitch
                label="چرخش خودکار نقل‌قول ویجت"
                value={settings.widgetAutoRotateQuote}
                onChange={v => {
                  update('widgetAutoRotateQuote', v);
                  setWidgetAutoRotateQuote(v).catch(() => {});
                }}
              />
              <AppText style={styles.hint}>
                ویجت ساعت و نقل‌قول را با انگشت روی صفحهٔ اصلی نگه‌دار و از
                فهرست ویجت‌ها، «Wallpaper» را اضافه کن. این سوییچ مشخص می‌کند
                نقل‌قول هر بار تغییر کند یا ثابت بماند.
              </AppText>
            </>
          ) : null}
        </ScrollView>

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <AppText style={styles.closeText}>بستن</AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

function RowSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{true: '#8b5cf6', false: '#334155'}}
        thumbColor="#eafffb"
      />
      <AppText style={styles.rowLabel}>{label}</AppText>
    </View>
  );
}

function RowStepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={onDec}>
          <AppText style={styles.stepText}>−</AppText>
        </Pressable>
        <AppText style={styles.stepValue}>{value}</AppText>
        <Pressable style={styles.stepBtn} onPress={onInc}>
          <AppText style={styles.stepText}>+</AppText>
        </Pressable>
      </View>
      <AppText style={styles.rowLabel}>{label}</AppText>
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
}: {
  label: string;
  options: {id: string; label: string}[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.choicesRow}>
      <AppText style={styles.rowLabel}>{label}</AppText>
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
}: {
  label: string;
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <View style={styles.choicesRow}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <View style={styles.chips}>
        {colors.map(c => {
          const active = c.toLowerCase() === selected.toLowerCase();
          return (
            <Pressable
              key={c}
              onPress={() => onSelect(c)}
              style={[
                styles.swatch,
                {backgroundColor: c},
                // The settings sheet is near-black, so a black swatch needs a
                // visible ring to be found at all.
                luminance(c) < 40 && styles.swatchOnDark,
                active && styles.swatchActive,
              ]}>
              {active ? (
                <AppText
                  style={[
                    styles.swatchCheck,
                    // near-white swatches (white, the pale gold) would hide a white tick
                    luminance(c) > 220 && styles.swatchCheckDark,
                  ]}>
                  ✓
                </AppText>
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
    paddingBottom: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row-reverse',
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  tabBtnText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  tabBtnTextActive: {
    color: '#eafffb',
    fontWeight: '700',
  },
  tabIndicator: {
    height: 3,
    width: '70%',
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
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLabel: {
    color: '#d6f5ee',
    fontSize: 16,
    writingDirection: 'rtl',
  },
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
  stepText: {
    color: '#eafffb',
    fontSize: 20,
    lineHeight: 22,
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
  presetChipWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  presetDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  presetDeleteText: {
    color: '#fca5a5',
    fontSize: 12,
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
  swatchCheck: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    includeFontPadding: false,
  },
  swatchCheckDark: {color: '#000000'},
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
  randomBgRemoveText: {
    color: '#eafffb',
    fontSize: 13,
    lineHeight: 14,
  },
  entryRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 10,
  },
  entryRowItem: {
    flex: 1,
    marginBottom: 0,
  },
  galleryEntry: {
    backgroundColor: 'rgba(245,196,81,0.15)',
    borderColor: 'rgba(245,196,81,0.5)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  galleryEntryText: {
    color: '#f5e6b3',
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  helpEntry: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  helpEntryText: {
    color: '#c4b5fd',
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
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
  btnRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  smallBtnText: {
    color: '#eafffb',
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
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  closeBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: {
    color: '#eafffb',
    fontSize: 16,
    fontWeight: '700',
  },
});
