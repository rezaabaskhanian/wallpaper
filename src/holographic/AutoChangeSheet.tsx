import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {toFa} from './date';
import {
  AUTO_HOURS,
  DEFAULT_HOURS,
  disableAutoWallpaper,
  enableAutoWallpaper,
  hoursLabel,
  sameSource,
  useAutoPool,
  useAutoWallpaper,
  type AutoSource,
} from './autoWallpaper';

type Props = {
  /** null = closed. */
  source: AutoSource | null;
  onClose: () => void;
};

/**
 * One small sheet for «تعویض خودکار» wherever it's offered (a gallery
 * category, «مجموعه‌ی من», a mood, settings): pick how often, turn it on —
 * or off when this source is the active one. Turning it on for another
 * source replaces the old one: there is only ever one auto-change.
 */
export default function AutoChangeSheet({source, onClose}: Props) {
  const insets = useSafeAreaInsets();
  const auto = useAutoWallpaper();
  const poolFor = useAutoPool();
  const isCurrent = !!source && sameSource(auto?.source, source);
  const [hours, setHours] = useState<number>(DEFAULT_HOURS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (source) setHours(isCurrent && auto ? auto.hours : DEFAULT_HOURS);
    // Reset only when the sheet opens for a source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (!source) return null;

  const turnOn = async () => {
    setBusy(true);
    try {
      await enableAutoWallpaper(source, hours, poolFor(source));
      onClose();
      showAlert(
        '🔁 تعویض خودکار روشن شد',
        `${hoursLabel(hours, toFa)} یه والپیپر تازه از «${source.title}» روی صفحه قفل و اصلی گوشیت میاد.`,
      );
    } catch (e) {
      showAlert('فعلاً نمی‌شه', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    await disableAutoWallpaper();
    setBusy(false);
    onClose();
  };

  const replacing = !!auto && !isCurrent;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, {paddingBottom: insets.bottom + 20}]}>
        <AppText style={styles.title}>تعویض خودکار از «{source.title}»</AppText>
        <AppText style={styles.sub}>
          والپیپر صفحه قفل و اصلی خودش عوض می‌شه، حتی وقتی اپ بسته‌ست. اینترنت لازمه.
        </AppText>

        <View style={styles.chips}>
          {AUTO_HOURS.map(h => {
            const active = h === hours;
            return (
              <Pressable
                key={h}
                onPress={() => setHours(h)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{selected: active}}>
                <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                  {hoursLabel(h, toFa)}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {replacing ? (
          <AppText style={styles.note}>
            الان از «{auto!.source.title || 'یه دسته‌ی دیگه'}» عوض می‌شه؛ با روشن کردن این، جایگزینش می‌شه.
          </AppText>
        ) : null}

        {busy ? (
          <ActivityIndicator color="#8b5cf6" size="large" style={styles.busy} />
        ) : (
          <>
            <Pressable style={styles.primary} onPress={turnOn} accessibilityRole="button">
              <AppText style={styles.primaryText}>{isCurrent ? 'ذخیره' : 'روشن کن'}</AppText>
            </Pressable>
            {isCurrent ? (
              <Pressable style={styles.secondary} onPress={turnOff} accessibilityRole="button">
                <AppText style={styles.secondaryText}>خاموش کن</AppText>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.55)'},
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#170b28',
    borderTopWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chips: {flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 18},
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  chipActive: {backgroundColor: 'rgba(139, 92, 246, 0.3)', borderColor: '#8b5cf6'},
  chipText: {color: 'rgba(255,255,255,0.75)', fontSize: 15, writingDirection: 'rtl'},
  chipTextActive: {color: '#ffffff', fontWeight: '700'},
  note: {
    color: '#fcd34d',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  busy: {marginTop: 20},
  primary: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
  },
  primaryText: {color: '#ffffff', fontSize: 17, fontWeight: '700'},
  secondary: {minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6},
  secondaryText: {color: '#fca5a5', fontSize: 15, fontWeight: '700'},
});
