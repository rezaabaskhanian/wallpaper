import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {getInstalledApps, launchApp, type InstalledApp} from './installedApps';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Full-screen app drawer, opened by swiping up the handle at the bottom of
 * the home scene. Being the device's Home app only replaces the wallpaper +
 * icon grid the *system* draws — it doesn't give any other way to reach
 * installed apps, so this is required once the app is set as the launcher.
 */
export default function AppDrawer({visible, onClose}: Props) {
  const {width} = useWindowDimensions();
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible || apps || error) return;
    getInstalledApps()
      .then(list =>
        setApps([...list].sort((a, b) => a.label.localeCompare(b.label, 'fa'))),
      )
      .catch(e => setError(e?.message ?? 'خطای نامشخص'));
  }, [visible, apps, error]);

  // Search box empties itself each time the drawer is reopened.
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const columns = 4;
  const gap = 14;
  const cellWidth = (width - gap * (columns + 1)) / columns;

  const filtered = useMemo(() => {
    if (!apps) return [];
    const q = query.trim();
    if (!q) return apps;
    return apps.filter(a => a.label.includes(q) || a.packageName.includes(q));
  }, [apps, query]);

  const onPressApp = async (app: InstalledApp) => {
    try {
      await launchApp(app.packageName);
      onClose();
    } catch {
      showAlert('خطا', 'باز کردن این اپ ممکن نشد.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <AppText style={styles.closeBtnText}>بستن</AppText>
          </Pressable>
          <AppText style={styles.title}>همه‌ی اپ‌ها</AppText>
          <View style={styles.closeBtn} />
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="جست‌وجوی اپ…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          style={styles.search}
          textAlign="right"
        />

        {error ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>خطا: {error}</AppText>
            <Pressable
              style={styles.retry}
              onPress={() => {
                setError(null);
                setApps(null);
              }}>
              <AppText style={styles.retryText}>تلاش دوباره</AppText>
            </Pressable>
          </View>
        ) : !apps ? (
          <View style={styles.center}>
            <ActivityIndicator color="#2dd4bf" size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>اپی پیدا نشد.</AppText>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={a => a.packageName}
            numColumns={columns}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            renderItem={({item}) => (
              <Pressable
                onPress={() => onPressApp(item)}
                style={[styles.cell, {width: cellWidth}]}>
                {item.icon ? (
                  <Image source={{uri: item.icon}} style={styles.icon} />
                ) : (
                  <View style={styles.icon} />
                )}
                <AppText numberOfLines={1} style={styles.label}>
                  {item.label}
                </AppText>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#08201fee'},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  title: {color: '#eafffb', fontSize: 18, fontWeight: '700', writingDirection: 'rtl'},
  closeBtn: {paddingHorizontal: 8, paddingVertical: 4, minWidth: 44},
  closeBtnText: {color: '#9be7d8', fontSize: 16, textAlign: 'left'},
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#eafffb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    writingDirection: 'rtl',
  },
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  muted: {color: 'rgba(255,255,255,0.6)', fontSize: 15, writingDirection: 'rtl'},
  retry: {
    backgroundColor: 'rgba(64,224,208,0.2)',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {color: '#eafffb', fontWeight: '700'},
  gridContent: {padding: 14},
  gridRow: {gap: 14, marginBottom: 18},
  cell: {alignItems: 'center', gap: 6},
  icon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    color: '#d6f5ee',
    fontSize: 11,
    textAlign: 'center',
    writingDirection: 'rtl',
    maxWidth: 70,
  },
});
