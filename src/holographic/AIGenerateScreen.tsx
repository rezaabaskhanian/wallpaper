import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {setWallpaperFromUrl} from './lockWallpaper';
import type {WallpaperTarget} from './lockWallpaper';
import {NoCreditsError, generateWallpaperFromText} from './store/aiGenerate';
import {useStore} from './store/StoreContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Modal: describe a wallpaper in text, generate it with AI, apply it. */
export default function AIGenerateScreen({visible, onClose}: Props) {
  const {buyAICredits} = useStore();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [noCredits, setNoCredits] = useState(false);
  const [buying, setBuying] = useState(false);

  const reset = () => {
    setPrompt('');
    setImageUrl(null);
    setNoCredits(false);
  };

  const generate = async () => {
    const {imageUrl: url} = await generateWallpaperFromText(prompt.trim());
    setImageUrl(url);
  };

  const onGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setNoCredits(false);
    try {
      await generate();
    } catch (e) {
      if (e instanceof NoCreditsError) {
        setNoCredits(true);
      } else {
        const detail = e instanceof Error ? e.message : String(e);
        showAlert('خطا', `ساخت والپیپر ممکن نشد: ${detail}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const onBuyCredits = async () => {
    setBuying(true);
    try {
      const granted = await buyAICredits();
      if (granted === false) return;
      showAlert('انجام شد', `${granted} اعتبار عکس به موجودیت اضافه شد.`);
      setNoCredits(false);
      setGenerating(true);
      try {
        await generate();
      } finally {
        setGenerating(false);
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAlert('خطا', `خرید ناموفق بود: ${detail}`);
    } finally {
      setBuying(false);
    }
  };

  const onApply = async (target: WallpaperTarget) => {
    if (!imageUrl) return;
    setApplying(true);
    try {
      await setWallpaperFromUrl(imageUrl, target);
      const where =
        target === 'home' ? 'صفحهٔ اصلی' : target === 'both' ? 'اصلی و قفل' : 'صفحهٔ قفل';
      showAlert('انجام شد', `والپیپر ${where} تنظیم شد.`);
      reset();
      onClose();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAlert('خطا', `تنظیم والپیپر ممکن نشد: ${detail}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              reset();
              onClose();
            }}
            hitSlop={12}
            style={styles.headerBtn}>
            <AppText style={styles.headerBtnText}>بستن</AppText>
          </Pressable>
          <AppText style={styles.headerTitle}>ساخت والپیپر با AI</AppText>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.content}>
          <AppText style={styles.label}>
            توضیح والپیپر مورد نظرت رو بنویس (فارسی هم می‌تونی)
          </AppText>
          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="مثلاً: منظره‌ی کوهستان در غروب با رنگ‌های گرم"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            editable={!generating}
          />

          <Pressable
            style={[styles.generateBtn, (generating || !prompt.trim()) && styles.btnDisabled]}
            disabled={generating || !prompt.trim()}
            onPress={onGenerate}>
            {generating ? (
              <ActivityIndicator color="#170b28" />
            ) : (
              <AppText style={styles.generateBtnText}>ساخت والپیپر</AppText>
            )}
          </Pressable>

          {noCredits ? (
            <View style={styles.noCreditsBox}>
              <AppText style={styles.quotaText}>
                سهمیه‌ی رایگانت استفاده شده و اعتباری نداری.
              </AppText>
              <Pressable
                style={[styles.buyBtn, buying && styles.btnDisabled]}
                disabled={buying}
                onPress={onBuyCredits}>
                {buying ? (
                  <ActivityIndicator color="#170b28" />
                ) : (
                  <AppText style={styles.buyBtnText}>خرید ۳۰ عکس</AppText>
                )}
              </Pressable>
            </View>
          ) : null}

          {imageUrl ? (
            <View style={styles.previewWrap}>
              <Image source={{uri: imageUrl}} style={styles.preview} resizeMode="cover" />
              <View style={styles.applyRow}>
                <Pressable
                  style={[styles.applyBtn, applying && styles.btnDisabled]}
                  disabled={applying}
                  onPress={() => onApply('lock')}>
                  <AppText style={styles.applyBtnText}>صفحه‌ی قفل</AppText>
                </Pressable>
                <Pressable
                  style={[styles.applyBtn, applying && styles.btnDisabled]}
                  disabled={applying}
                  onPress={() => onApply('home')}>
                  <AppText style={styles.applyBtnText}>صفحه‌ی اصلی</AppText>
                </Pressable>
                <Pressable
                  style={[styles.applyBtn, applying && styles.btnDisabled]}
                  disabled={applying}
                  onPress={() => onApply('both')}>
                  <AppText style={styles.applyBtnText}>هر دو</AppText>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
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
  },
  headerBtn: {paddingHorizontal: 8, paddingVertical: 4, minWidth: 40},
  headerBtnText: {color: '#c4b5fd', fontSize: 16},
  headerTitle: {color: '#fff', fontSize: 16, fontWeight: '700'},
  content: {padding: 16, gap: 12},
  label: {color: 'rgba(255,255,255,0.7)', fontSize: 13, writingDirection: 'rtl'},
  input: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    padding: 12,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  generateBtn: {
    backgroundColor: '#5eead4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnText: {color: '#170b28', fontSize: 15, fontWeight: '700'},
  btnDisabled: {opacity: 0.5},
  noCreditsBox: {gap: 10, alignItems: 'center'},
  quotaText: {
    color: '#f5c451',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  buyBtn: {
    backgroundColor: '#f5c451',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buyBtnText: {color: '#170b28', fontSize: 14, fontWeight: '700'},
  previewWrap: {gap: 12},
  preview: {width: '100%', aspectRatio: 1, borderRadius: 16},
  applyRow: {flexDirection: 'row-reverse', gap: 8},
  applyBtn: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyBtnText: {color: '#c4b5fd', fontSize: 13, fontWeight: '700'},
});
