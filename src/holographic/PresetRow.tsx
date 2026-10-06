import React, {useRef, useState} from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import AppText from './AppText';
import {useSettings, type WallpaperSettings} from './SettingsContext';
import {BUILTIN_PRESETS, presetMatches} from './settingsPresets';

type Props = {
  /** Called after a preset is applied, with the settings from just before,
   * so the caller can offer «برگردان». */
  onApplied: (label: string, previous: WallpaperSettings) => void;
  /** Ask before deleting one of the user's own presets. */
  onDeleteUserPreset: (id: string, label: string) => void;
};

/**
 * Settings ▸ خانه presets row: the five built-in looks, then the user's own
 * saved presets, then a «ذخیره حالت فعلی» card that opens the naming form.
 * Scrolls horizontally, right to left.
 */
export default function PresetRow({onApplied, onDeleteUserPreset}: Props) {
  const {settings, update, userPresets, savePreset, applyPreset} = useSettings();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const applyBuiltin = (id: string) => {
    const preset = BUILTIN_PRESETS.find(p => p.id === id);
    if (!preset) return;
    const previous = settings;
    (Object.keys(preset.patch) as (keyof WallpaperSettings)[]).forEach(k =>
      update(k, preset.patch[k] as never),
    );
    onApplied(preset.label, previous);
  };

  const applyUser = (id: string, label: string) => {
    const previous = settings;
    applyPreset(id);
    onApplied(label, previous);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, !I18nManager.isRTL && styles.rowReverse]}
        onContentSizeChange={() => {
          // On an LTR device the reversed row starts at the far end; jump
          // there so the first card is the one in view.
          if (!I18nManager.isRTL) scrollRef.current?.scrollToEnd({animated: false});
        }}>
        {BUILTIN_PRESETS.map(p => {
          const active = presetMatches(p, settings);
          return (
            <Pressable
              key={p.id}
              style={[styles.card, active && styles.cardActive]}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              onPress={() => applyBuiltin(p.id)}>
              <AppText style={[styles.cardText, active && styles.cardTextActive]}>
                {p.label}
              </AppText>
            </Pressable>
          );
        })}
        {userPresets.map(p => (
          <View key={p.id} style={styles.userWrap}>
            <Pressable
              style={styles.card}
              accessibilityRole="button"
              onPress={() => applyUser(p.id, p.label)}>
              <AppText style={styles.cardText}>{p.label}</AppText>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`حذف ${p.label}`}
              onPress={() => onDeleteUserPreset(p.id, p.label)}>
              <AppText style={styles.deleteText}>✕</AppText>
            </Pressable>
          </View>
        ))}
        <Pressable
          style={[styles.card, styles.saveCard, saving && styles.cardActive]}
          accessibilityRole="button"
          onPress={() => setSaving(v => !v)}>
          <AppText style={styles.cardText}>+ ذخیره حالت فعلی</AppText>
        </Pressable>
      </ScrollView>

      {saving ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="نام پرست جدید"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoFocus
          />
          <Pressable
            style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
            disabled={!name.trim()}
            onPress={() => {
              savePreset(name.trim());
              setName('');
              setSaving(false);
            }}>
            <AppText style={styles.saveBtnText}>ذخیره</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexGrow: 1, flexDirection: 'row', gap: 8, paddingVertical: 8},
  rowReverse: {flexDirection: 'row-reverse'},
  card: {
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  cardActive: {backgroundColor: 'rgba(139, 92, 246, 0.22)', borderColor: '#8b5cf6', borderWidth: 2},
  saveCard: {borderStyle: 'dashed'},
  cardText: {color: 'rgba(255,255,255,0.8)', fontSize: 14, writingDirection: 'rtl'},
  cardTextActive: {color: '#eafffb', fontWeight: '700'},
  userWrap: {justifyContent: 'center'},
  deleteBtn: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(40,20,40,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {color: '#fca5a5', fontSize: 11, fontWeight: '700'},
  form: {flexDirection: 'row-reverse', gap: 8, marginTop: 8},
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#eafffb',
    fontSize: 15,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  saveBtn: {
    minHeight: 48,
    backgroundColor: 'rgba(245,196,81,0.22)',
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,196,81,0.5)',
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnText: {color: '#f5e6b3', fontSize: 14, fontWeight: '700', writingDirection: 'rtl'},
});
