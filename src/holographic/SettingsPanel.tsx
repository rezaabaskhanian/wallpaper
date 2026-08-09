import React, {useEffect, useRef, useState} from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {launchImageLibrary} from 'react-native-image-picker';
import {BACKGROUNDS, RINGS} from './config';
import {FONTS} from './fonts';
import {setWidgetAutoRotateQuote} from './homeWidget';
import type {WallpaperTarget} from './lockWallpaper';
import {openLauncherSettings, openScreenSaverSettings} from './systemScreens';
import {useSettings} from './SettingsContext';
import {useStore} from './store/StoreContext';
import {THEMES} from './themes';

/** Telegram handle of the app's developer, shown in Settings ▸ عمومی. */
const DEVELOPER_TELEGRAM_USERNAME = 'RezaAbaskhanian';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Capture the current background and set it as the device wallpaper. */
  onSetWallpaper?: (target: WallpaperTarget) => void;
  /** Open the downloadable-wallpaper gallery. */
  onOpenGallery?: () => void;
};

/** Glow/accent colour swatches offered in settings. */
const GLOW_COLORS = [
  '#5eead4', // teal
  '#f5c451', // gold
  '#ffffff', // white
  '#6ee7b7', // green
  '#f87171', // red
  '#7dd3fc', // blue
];

/** Tabs that split the once-long settings list into focused categories. */
type TabId = 'general' | 'background' | 'fonts' | 'widgets' | 'device';
const TABS: {id: TabId; label: string}[] = [
  {id: 'general', label: 'عمومی'},
  {id: 'background', label: 'پس‌زمینه'},
  {id: 'fonts', label: 'فونت'},
  {id: 'widgets', label: 'ویجت‌ها'},
  {id: 'device', label: 'دستگاه'},
];

/** Bottom-sheet style settings panel for the wallpaper. */
export default function SettingsPanel({
  visible,
  onClose,
  onSetWallpaper,
  onOpenGallery,
}: Props) {
  const {settings, update, applyTheme} = useSettings();
  const {premiumUnlocked, redeemCode} = useStore();
  // Persists across opens/closes (the panel stays mounted, only `visible`
  // toggles) so reopening Settings picks up on the same tab the user left.
  const [tab, setTab] = useState<TabId>('general');
  const scrollRef = useRef<ScrollView>(null);
  const [promoInput, setPromoInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);

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

  const pickFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 1,
      });
      if (result.didCancel) {
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        update('customBackgroundUri', uri);
        update('backgroundId', 'custom');
      }
    } catch {
      showAlert('خطا', 'انتخاب عکس ممکن نشد.');
    }
  };

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
                  style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t.label}
                </AppText>
                <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.galleryEntry} onPress={() => onOpenGallery?.()}>
          <AppText style={styles.galleryEntryText}>🖼️ گالری والپیپرها</AppText>
        </Pressable>

        <ScrollView
          ref={scrollRef}
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

              <RowColors
                label="رنگ نور"
                colors={GLOW_COLORS}
                selected={settings.glowColor}
                onSelect={c => update('glowColor', c)}
              />

              <View style={styles.divider} />

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

              <RowChoices
                label="شکل مدار (گوی / فرشته)"
                options={[
                  {id: 'orb', label: '⚪ گوی'},
                  {id: 'angel', label: '👼 فرشته'},
                ]}
                selected={settings.orbShape}
                onSelect={id => update('orbShape', id as 'orb' | 'angel')}
              />

              <RowStepper
                label="تعداد گوی‌ها"
                value={`${settings.ballCount}`}
                onDec={() =>
                  update('ballCount', Math.max(4, settings.ballCount - 2))
                }
                onInc={() =>
                  update('ballCount', Math.min(40, settings.ballCount + 2))
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

              <View style={styles.divider} />

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
                label="شدت ذرات"
                options={[
                  {id: 'low', label: 'کم'},
                  {id: 'medium', label: 'متوسط'},
                  {id: 'high', label: 'زیاد'},
                ]}
                selected={settings.particleIntensity}
                onSelect={id =>
                  update('particleIntensity', id as 'low' | 'medium' | 'high')
                }
              />

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

              <RowSwitch
                label="جلوه‌های آب‌وهوا (باران/برف)"
                value={settings.weatherEffects}
                onChange={v => update('weatherEffects', v)}
              />
              {settings.weatherEffects && !settings.liveWeather ? (
                <AppText style={styles.hint}>
                  برای این جلوه، «دمای زنده» باید روشن باشد تا وضعیت هوا
                  مشخص شود.
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
              <AppText style={styles.sectionTitle}>فونت نوشته‌ها</AppText>
              <View style={styles.fontList}>
                {FONTS.map(f => {
                  const active = f.id === settings.fontId;
                  return (
                    <Pressable
                      key={f.id}
                      style={[styles.fontChip, active && styles.fontChipActive]}
                      onPress={() => update('fontId', f.id)}>
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

              <RowSwitch
                label="نمایش هوا"
                value={settings.showWeather}
                onChange={v => update('showWeather', v)}
              />

              <RowSwitch
                label="هوای زنده (GPS)"
                value={settings.liveWeather}
                onChange={v => update('liveWeather', v)}
              />

              <RowStepper
                label="دمای دستی"
                value={`${settings.manualTemp}°`}
                onDec={() => update('manualTemp', settings.manualTemp - 1)}
                onInc={() => update('manualTemp', settings.manualTemp + 1)}
              />

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
        trackColor={{true: '#2dd4bf', false: '#334155'}}
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
        {colors.map(c => (
          <Pressable
            key={c}
            onPress={() => onSelect(c)}
            style={[
              styles.swatch,
              {backgroundColor: c},
              c.toLowerCase() === selected.toLowerCase() && styles.swatchActive,
            ]}
          />
        ))}
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
    backgroundColor: '#08201f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(64,224,208,0.25)',
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
    backgroundColor: '#2dd4bf',
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
  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(64,224,208,0.15)',
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
    borderColor: 'rgba(64,224,208,0.2)',
  },
  chipActive: {
    backgroundColor: 'rgba(64,224,208,0.22)',
    borderColor: '#2dd4bf',
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
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  swatchActive: {
    borderColor: '#eafffb',
    borderWidth: 3,
  },
  galleryBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(64,224,208,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.3)',
  },
  galleryEntry: {
    backgroundColor: 'rgba(245,196,81,0.15)',
    borderColor: 'rgba(245,196,81,0.5)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  galleryEntryText: {
    color: '#f5e6b3',
    fontSize: 16,
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
    borderColor: 'rgba(64,224,208,0.2)',
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
    backgroundColor: 'rgba(64,224,208,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.3)',
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
    backgroundColor: 'rgba(64,224,208,0.2)',
    marginVertical: 14,
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
    borderColor: 'rgba(64,224,208,0.2)',
    alignItems: 'center',
  },
  fontChipActive: {
    backgroundColor: 'rgba(64,224,208,0.18)',
    borderColor: '#2dd4bf',
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
    color: '#9be7d8',
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
    borderColor: 'rgba(64,224,208,0.2)',
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
    backgroundColor: 'rgba(64,224,208,0.2)',
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
