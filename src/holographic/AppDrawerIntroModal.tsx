import React from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import AppText from './AppText';
import {openLauncherSettings} from './systemScreens';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Opens the app drawer right away, so the user can try the gesture immediately. */
  onTryNow: () => void;
};

/**
 * One-time (then periodic — see appDrawerIntro.ts) tip explaining the app's
 * most easily-missed feature: swiping up from the bottom handle opens a
 * drawer of every installed app, and this app can even replace the phone's
 * launcher so that drawer becomes the real home screen. Replaces the old
 * animated finger/handle-bounce hint, which too many users never noticed.
 */
export default function AppDrawerIntroModal({visible, onClose, onTryNow}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centering} pointerEvents="box-none">
        <View style={styles.card}>
          <AppText style={styles.emoji}>👆</AppText>
          <AppText style={styles.title}>اپ‌های گوشیت همین‌جاست</AppText>
          <AppText style={styles.message}>
            از پایین اپ بکش بالا، می‌تونی لیست اپ‌هاتو ببینی — بدون بستن این
            صحنه‌ی زنده.
          </AppText>
          <AppText style={styles.message}>
            حتی می‌تونی این اپ رو جایگزین لانچر گوشیت کنی تا همیشه پشت
            آیکون‌های صفحه‌ی اصلی در حال اجرا باشه.
          </AppText>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <AppText style={styles.secondaryText}>باشه، متوجه شدم</AppText>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onTryNow}>
              <AppText style={styles.primaryText}>الان امتحان کن</AppText>
            </Pressable>
          </View>

          <Pressable style={styles.launcherLink} onPress={openLauncherSettings}>
            <AppText style={styles.launcherLinkText}>
              تنظیم به‌عنوان لانچر پیش‌فرض
            </AppText>
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
  launcherLink: {
    marginTop: 14,
    paddingVertical: 4,
  },
  launcherLinkText: {
    color: '#c4b5fd',
    fontSize: 13,
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
  },
});
