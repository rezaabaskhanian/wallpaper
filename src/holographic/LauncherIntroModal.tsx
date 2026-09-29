import React from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import AppText from './AppText';

type Props = {
  visible: boolean;
  /** «امتحان می‌کنم» — the caller opens Android's Home-app chooser. */
  onAccept: () => void;
  /** «بعداً», the backdrop, or Back. */
  onLater: () => void;
};

/**
 * Suggests making this app the phone's launcher. Shown only after the user
 * has already set a wallpaper and come back a few times — see launcherIntro.ts
 * for exactly when, and how often "later" lets it come back.
 */
export default function LauncherIntroModal({visible, onAccept, onLater}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <Pressable style={styles.backdrop} onPress={onLater} />
      <View style={styles.centering} pointerEvents="box-none">
        <View style={styles.card}>
          <AppText style={styles.emoji}>🏠</AppText>
          <AppText style={styles.title}>ریحان رو صفحه اصلی گوشیت کن</AppText>
          <AppText style={styles.message}>
            صحنه زنده همیشه پشت صفحه اصلی می‌مونه و با کشیدن به بالا همه
            اپ‌هات رو می‌بینی.
          </AppText>
          <AppText style={styles.message}>
            هر وقت خواستی، از تنظیمات به لانچر قبلی برمی‌گردی.
          </AppText>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={onLater}>
              <AppText style={styles.secondaryText}>بعداً</AppText>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onAccept}>
              <AppText style={styles.primaryText}>امتحان می‌کنم</AppText>
            </Pressable>
          </View>
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
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#170b28',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  title: {
    color: '#f5e6b3',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  message: {
    color: '#d6f5ee',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row-reverse',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  primaryText: {
    color: '#eafffb',
    fontSize: 15,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
});
