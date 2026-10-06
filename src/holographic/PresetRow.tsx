import React, {useRef, useState} from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Svg, {Circle, Line} from 'react-native-svg';
import {Bookmark, Plus, X} from 'lucide-react-native';
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
const TILE_W = 72;
const TILE_H = 52;

/** Tiny picture of each built-in look, drawn on its tile. */
function PresetArt({id}: {id: string}) {
  switch (id) {
    case 'calm':
      return (
        <Svg width={TILE_W} height={TILE_H}>
          {[
            [20, 14],
            [52, 12],
            [38, 24],
            [26, 38],
            [50, 36],
          ].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={2.5} fill="#ffffff" />
          ))}
        </Svg>
      );
    case 'rainy':
      return (
        <Svg width={TILE_W} height={TILE_H}>
          {[
            [16, 8],
            [34, 6],
            [52, 10],
            [22, 28],
            [40, 26],
            [58, 28],
          ].map(([x, y]) => (
            <Line
              key={`${x}-${y}`}
              x1={x + 5}
              y1={y}
              x2={x}
              y2={y + 14}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      );
    case 'night':
      return (
        <Svg width={TILE_W} height={TILE_H}>
          <Circle cx={46} cy={22} r={10} fill="#e5e7eb" />
          <Circle cx={18} cy={14} r={2} fill="#ffffff" />
          <Circle cx={24} cy={36} r={2} fill="#ffffff" />
        </Svg>
      );
    case 'smart':
      return (
        <Svg width={TILE_W} height={TILE_H}>
          <Circle cx={22} cy={26} r={11} fill="#f4b46a" />
        </Svg>
      );
    default:
      return null;
  }
}

const TILE_BG: Record<string, string> = {
  simple: '#2b3a46',
  calm: '#2b3a46',
  rainy: '#2b3a46',
  night: '#0f1720',
  smart: '#33475a',
};

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
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              accessibilityState={{selected: active}}
              onPress={() => applyBuiltin(p.id)}>
              <View
                style={[
                  styles.tile,
                  {backgroundColor: TILE_BG[p.id]},
                  active && styles.tileActive,
                ]}>
                <PresetArt id={p.id} />
              </View>
              <AppText style={[styles.itemText, active && styles.itemTextActive]}>
                {p.label}
              </AppText>
            </Pressable>
          );
        })}
        {userPresets.map(p => (
          <View key={p.id}>
            <Pressable
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              onPress={() => applyUser(p.id, p.label)}>
              <View style={[styles.tile, styles.userTile]}>
                <Bookmark size={22} color="#c4b5fd" />
              </View>
              <AppText style={styles.itemText} numberOfLines={1}>
                {p.label}
              </AppText>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              hitSlop={13}
              accessibilityRole="button"
              accessibilityLabel={`حذف ${p.label}`}
              onPress={() => onDeleteUserPreset(p.id, p.label)}>
              <X size={12} color="#fca5a5" />
            </Pressable>
          </View>
        ))}
        <Pressable
          style={styles.item}
          accessibilityRole="button"
          accessibilityState={{expanded: saving}}
          onPress={() => setSaving(v => !v)}>
          <View style={[styles.tile, styles.saveTile, saving && styles.tileActive]}>
            <Plus size={22} color="#c4b5fd" />
          </View>
          <AppText style={styles.itemText} numberOfLines={1}>
            ذخیره حالت فعلی
          </AppText>
        </Pressable>
      </ScrollView>

      {saving ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="اسم این حالت"
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
            <AppText style={styles.saveBtnText}>ذخیره حالت فعلی</AppText>
          </Pressable>
        </View>
      ) : null}
      {saving ? (
        <AppText style={styles.formHint}>بعداً با یک لمس به همین ظاهر برمی‌گردی</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexGrow: 1, flexDirection: 'row', gap: 12, paddingVertical: 12},
  rowReverse: {flexDirection: 'row-reverse'},
  item: {width: TILE_W, alignItems: 'center'},
  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileActive: {borderColor: '#8b5cf6'},
  userTile: {backgroundColor: 'rgba(139, 92, 246, 0.18)'},
  saveTile: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  itemText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    marginTop: 8,
    writingDirection: 'rtl',
  },
  itemTextActive: {color: '#ffffff', fontWeight: '700'},
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
  formHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  saveBtnText: {color: '#f5e6b3', fontSize: 14, fontWeight: '700', writingDirection: 'rtl'},
});
