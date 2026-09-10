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
import type {OrbitItem} from './data';

type Props = {
  /** The tapped orbit item, or null when the modal is closed. */
  item: OrbitItem | null;
  onClose: () => void;
};

/**
 * Info modal that opens when an orbiting avatar with a `description` (set in
 * the admin panel's orbit item form) is tapped: portrait, label, and that
 * description.
 */
export default function OrbitItemModal({item, onClose}: Props) {
  const image =
    item?.image && typeof item.image === 'object' && 'uri' in item.image
      ? item.image
      : undefined;

  return (
    <Modal
      visible={item != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centering} pointerEvents="box-none">
        <View style={styles.card}>
          {item ? (
            <ScrollView contentContainerStyle={styles.content}>
              {image ? (
                <Image source={image} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]} />
              )}
              <AppText style={styles.name}>{item.label}</AppText>
              {item.description ? (
                <AppText style={styles.body}>{item.description}</AppText>
              ) : null}
            </ScrollView>
          ) : null}

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
    backgroundColor: '#170b28',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
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
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  name: {
    color: '#f5e6b3',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    color: '#d6f5ee',
    fontSize: 15,
    lineHeight: 26,
    alignSelf: 'stretch',
    textAlign: 'right',
    marginTop: 16,
    writingDirection: 'rtl',
  },
  closeBtn: {
    marginTop: 16,
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
