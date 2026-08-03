import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import AppText from './AppText';

type AlertOptions = {
  /** Label for the confirm button; omit for a single dismiss button. */
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
};

type AlertState = ({title: string; message?: string} & AlertOptions) | null;

let showFn: ((title: string, message?: string, options?: AlertOptions) => void) | null =
  null;

/**
 * Drop-in, app-themed replacement for React Native's `Alert.alert`. The native
 * Alert renders a plain OS dialog that clashes with the app's dark glass/gold
 * look; this shows the same message inside a styled card instead.
 */
export function showAlert(
  title: string,
  message?: string,
  options?: AlertOptions,
): void {
  showFn?.(title, message, options);
}

/** Mount once near the app root (inside SettingsProvider, for AppText's font). */
export default function AppAlertHost() {
  const [alert, setAlert] = useState<AlertState>(null);

  useEffect(() => {
    showFn = (title, message, options) => setAlert({title, message, ...options});
    return () => {
      showFn = null;
    };
  }, []);

  const close = () => setAlert(null);
  const confirm = () => {
    const action = alert?.onConfirm;
    setAlert(null);
    action?.();
  };

  const hasConfirm = !!alert?.confirmText;

  return (
    <Modal visible={alert != null} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.centering} pointerEvents="box-none">
        <View style={styles.card}>
          <AppText style={styles.title}>{alert?.title}</AppText>
          {alert?.message ? (
            <AppText style={styles.message}>{alert.message}</AppText>
          ) : null}

          <View style={styles.buttonRow}>
            {hasConfirm ? (
              <>
                <Pressable style={styles.cancelButton} onPress={close}>
                  <AppText style={styles.cancelText}>
                    {alert?.cancelText ?? 'بستن'}
                  </AppText>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={confirm}>
                  <AppText style={styles.buttonText}>{alert?.confirmText}</AppText>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.confirmButton} onPress={close}>
                <AppText style={styles.buttonText}>باشه</AppText>
              </Pressable>
            )}
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
    maxWidth: 340,
    backgroundColor: '#08201f',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.25)',
    alignItems: 'center',
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
    marginTop: 18,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: 'rgba(64,224,208,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.35)',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  buttonText: {
    color: '#eafffb',
    fontSize: 15,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
});
