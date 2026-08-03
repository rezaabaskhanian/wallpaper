import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AppText from './AppText';
import rawMartyrs from './martyrs.json';
import {MARTYR_PHOTOS} from './martyrPhotos';
import type {Martyr} from './martyrs';

type Props = {
  /** id of the martyr to show, or null when the modal is closed. */
  martyrId: string | null;
  onClose: () => void;
};

// Read the martyr list straight from the JSON (same proven path data.ts uses),
// so the modal never depends on another module's init order.
const MARTYR_LIST: Martyr[] = (
  Array.isArray(rawMartyrs)
    ? rawMartyrs
    : (rawMartyrs as {default?: Omit<Martyr, 'photo'>[]}).default ?? []
).map((m: Omit<Martyr, 'photo'>) => ({...m, photo: MARTYR_PHOTOS[m.id]}));

function findMartyr(id: string | null): Martyr | undefined {
  return id ? MARTYR_LIST.find(m => m.id === id) : undefined;
}

/**
 * Full-info modal that opens when an orbiting martyr icon is tapped: portrait,
 * name and the story of the martyrdom.
 */
export default function MartyrModal({martyrId, onClose}: Props) {
  const martyr = findMartyr(martyrId);
  const meta = martyr
    ? [martyr.place, martyr.martyredOn].filter(Boolean).join(' — ')
    : '';

  return (
    <Modal
      visible={martyrId != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centering} pointerEvents="box-none">
        <View style={styles.card}>
          {martyr ? (
            <ScrollView contentContainerStyle={styles.content}>
              {martyr.photo ? (
                <Image source={martyr.photo} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]} />
              )}
              <AppText style={styles.name}>{martyr.name}</AppText>
              {meta ? <AppText style={styles.meta}>{meta}</AppText> : null}

              <AppText style={styles.section}>نحوهٔ شهادت</AppText>
              <AppText style={styles.body}>{martyr.martyrdom}</AppText>

              {martyr.will ? (
                <>
                  <AppText style={styles.section}>از وصیت‌نامه</AppText>
                  <AppText style={styles.body}>{martyr.will}</AppText>
                </>
              ) : null}
            </ScrollView>
          ) : (
            <AppText style={styles.body}>
              اطلاعاتی برای این شهید ثبت نشده.
            </AppText>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <AppText style={styles.closeText}>بستن</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centering: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#08201f',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.25)',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.7)',
  },
  photoPlaceholder: {
    backgroundColor: 'rgba(64,224,208,0.15)',
  },
  name: {
    color: '#f5e6b3',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  meta: {
    color: 'rgba(234,255,251,0.6)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  section: {
    color: '#9be7d8',
    fontSize: 14,
    fontWeight: '700',
    alignSelf: 'stretch',
    textAlign: 'right',
    marginTop: 16,
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  body: {
    color: '#d6f5ee',
    fontSize: 15,
    lineHeight: 26,
    alignSelf: 'stretch',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  closeBtn: {
    marginTop: 16,
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
