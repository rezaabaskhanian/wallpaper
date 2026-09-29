import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {GestureResponderEvent} from 'react-native';
import {
  ActivityIndicator,
  AppState,
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {
  getInstalledApps,
  launchApp,
  openAppInfo,
  uninstallApp,
  type InstalledApp,
} from './installedApps';
import {
  getHiddenApps,
  getRecentApps,
  noteAppLaunched,
  setAppHidden,
} from './launcherPrefs';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Section = {title: string; data: InstalledApp[]};

/** Canonical Persian alphabet order — used both to group apps and to order
 * (and only show) the letters that actually have apps in the side index. */
const PERSIAN_ALPHABET = [
  'ا', 'آ', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'ژ',
  'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن',
  'و', 'ه', 'ی',
];
const ENGLISH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
// Persian letters first (matches the app's own language), then English, then
// a catch-all for labels starting with a digit/emoji/other script.
const SECTION_ORDER = [...PERSIAN_ALPHABET, ...ENGLISH_ALPHABET, '#'];

/** Groups an app label under a single index letter — Arabic-script look-alike
 * characters (ي/ك, different alef forms) are folded onto their Persian
 * counterpart so e.g. "يوتيوب" and "یوتیوب" land in the same "ی"/"ا" bucket. */
function sectionKeyFor(label: string): string {
  const first = label.trim().charAt(0);
  if (!first) return '#';
  const upper = first.toUpperCase();
  if (/^[A-Z]$/.test(upper)) return upper;
  const normalized = first
    .replace(/[إأٱ]/, 'آ')
    .replace(/ي/, 'ی')
    .replace(/ك/, 'ک');
  return PERSIAN_ALPHABET.includes(normalized) ? normalized : '#';
}

/** Folds a string for search matching: case-insensitive ("whatsapp" finds
 * "WhatsApp"), Arabic ي/ك treated as Persian ی/ک like sectionKeyFor does,
 * every alef form as plain ا (so "اپا" finds «آپارات»), and the zero-width
 * non-joiner dropped (so "دیجی کالا"/"دیجی‌کالا" typed either way still hit). */
function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/\u200c/g, '');
}

/** How well an app matches a (normalized, non-empty) query — lower is better,
 * null means no match. Prefix hits come first so typing "l" puts "LingoFlow"
 * at the top instead of every app that merely contains an "l" somewhere. The
 * package name only counts from 3 characters on, since nearly every package
 * ("com.google…") contains any single letter. */
function matchRank(app: InstalledApp, q: string): number | null {
  const label = normalizeForSearch(app.label);
  if (label.startsWith(q)) return 0;
  if (label.split(/[\s\-_.]+/).some(word => word.startsWith(q))) return 1;
  if (label.includes(q)) return 2;
  if (q.length >= 3 && normalizeForSearch(app.packageName).includes(q)) return 3;
  return null;
}

const ROW_HEIGHT = 60;
/** How many recently opened apps the «اخیر» row shows. */
const RECENT_SHOWN = 5;
const SECTION_HEADER_HEIGHT = 30;

/**
 * Full-screen app drawer, opened by swiping up the handle at the bottom of
 * the home scene. Being the device's Home app only replaces the wallpaper +
 * icon grid the *system* draws — it doesn't give any other way to reach
 * installed apps, so this is required once the app is set as the launcher.
 *
 * Layout: a vertical, alphabetically-grouped app list fills the left side of
 * the screen; a Persian+English letter index sits opposite it on the right.
 * Dragging a finger down the index live-scrolls the list to that letter,
 * like the fast-scroll index in a contacts app.
 *
 * Above the list sits a row of recently opened apps; long-pressing any app
 * opens a menu for App info, uninstall (the system's own dialog) and hiding
 * it. Hidden apps leave the list and the recent row but still come up in
 * search, and are listed at the bottom so they can be shown again.
 */
export default function AppDrawer({visible, onClose}: Props) {
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [bubbleY, setBubbleY] = useState(0);
  const sidebarHeight = useRef(0);
  const listRef = useRef<SectionList<InstalledApp, Section>>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  // The app whose long-press menu is open.
  const [menuApp, setMenuApp] = useState<InstalledApp | null>(null);

  useEffect(() => {
    if (!visible) return;
    getRecentApps().then(setRecent);
    getHiddenApps().then(setHidden);
  }, [visible]);

  // Coming back from the system uninstall dialog (or from installing
  // something) while the drawer is open should update the list too.
  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setReloadKey(k => k + 1);
    });
    return () => sub.remove();
  }, [visible]);

  // Re-read on every open so a just-installed app shows up and an uninstalled
  // one disappears. The previous list stays on screen meanwhile (icons are
  // cached natively, so the refresh itself is quick); only a first load or a
  // failed one shows the spinner/error.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getInstalledApps()
      .then(list => {
        if (cancelled) return;
        setError(null);
        setApps([...list].sort((a, b) => a.label.localeCompare(b.label, 'fa')));
      })
      .catch(e => {
        if (!cancelled) setError(e?.message ?? 'خطای نامشخص');
      });
    return () => {
      cancelled = true;
    };
  }, [visible, reloadKey]);

  // Search box and menus reset each time the drawer is reopened.
  useEffect(() => {
    if (visible) {
      setQuery('');
      setMenuApp(null);
      setShowHidden(false);
    }
  }, [visible]);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const shownApps = useMemo(
    () => (apps ?? []).filter(a => !hiddenSet.has(a.packageName)),
    [apps, hiddenSet],
  );
  const hiddenApps = useMemo(
    () => (apps ?? []).filter(a => hiddenSet.has(a.packageName)),
    [apps, hiddenSet],
  );
  const recentApps = useMemo(() => {
    const byPackage = new Map(shownApps.map(a => [a.packageName, a]));
    return recent
      .map(p => byPackage.get(p))
      .filter((a): a is InstalledApp => !!a)
      .slice(0, RECENT_SHOWN);
  }, [recent, shownApps]);

  const filtered = useMemo(() => {
    if (!apps) return [];
    const q = normalizeForSearch(query.trim());
    if (!q) return shownApps;
    // apps is already alphabetical and sort is stable, so ties stay A→Z.
    return apps
      .map(app => ({app, rank: matchRank(app, q)}))
      .filter((m): m is {app: InstalledApp; rank: number} => m.rank !== null)
      .sort((a, b) => a.rank - b.rank)
      .map(m => m.app);
  }, [apps, shownApps, query]);

  const searching = query.trim().length > 0;

  const sections = useMemo<Section[]>(() => {
    // While searching, keep the relevance order as one flat list instead of
    // re-splitting it into alphabetical buckets.
    if (searching) {
      return [{title: 'نتایج', data: filtered}];
    }
    const groups = new Map<string, InstalledApp[]>();
    for (const app of filtered) {
      const key = sectionKeyFor(app.label);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(app);
      } else {
        groups.set(key, [app]);
      }
    }
    return SECTION_ORDER.filter(k => groups.has(k)).map(k => ({
      title: k,
      data: groups.get(k)!,
    }));
  }, [filtered, searching]);

  const letters = useMemo(() => sections.map(s => s.title), [sections]);

  const onPressApp = async (app: InstalledApp) => {
    try {
      await launchApp(app.packageName);
      onClose();
      noteAppLaunched(app.packageName).then(setRecent);
    } catch {
      showAlert('خطا', 'باز کردن این اپ ممکن نشد.');
    }
  };

  const runMenuAction = async (action: 'info' | 'uninstall' | 'hide' | 'unhide') => {
    const app = menuApp;
    setMenuApp(null);
    if (!app) return;
    try {
      if (action === 'info') {
        await openAppInfo(app.packageName);
      } else if (action === 'uninstall') {
        // The list refreshes on return (see the AppState effect above).
        await uninstallApp(app.packageName);
      } else {
        setHidden(await setAppHidden(app.packageName, action === 'hide'));
      }
    } catch {
      showAlert('خطا', 'این کار روی این اپ ممکن نشد.');
    }
  };

  const renderRow = (item: InstalledApp) => (
    <Pressable
      onPress={() => onPressApp(item)}
      onLongPress={() => setMenuApp(item)}
      style={styles.row}>
      {item.icon ? (
        <Image source={{uri: item.icon}} style={styles.icon} />
      ) : (
        <View style={styles.icon} />
      )}
      <AppText numberOfLines={1} style={styles.rowLabel}>
        {item.label}
      </AppText>
    </Pressable>
  );

  const scrollToLetter = (letter: string) => {
    const sectionIndex = sections.findIndex(s => s.title === letter);
    if (sectionIndex < 0) return;
    listRef.current?.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      viewPosition: 0,
      animated: false,
    });
  };

  const handleSidebarTouch = (evt: GestureResponderEvent) => {
    if (letters.length === 0 || sidebarHeight.current === 0) return;
    const y = evt.nativeEvent.locationY;
    const idx = Math.min(
      letters.length - 1,
      Math.max(0, Math.floor((y / sidebarHeight.current) * letters.length)),
    );
    const letter = letters[idx];
    setBubbleY(Math.min(Math.max(y - 22, 0), sidebarHeight.current - 44));
    if (letter !== activeLetter) {
      setActiveLetter(letter);
      scrollToLetter(letter);
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
                setReloadKey(k => k + 1);
              }}>
              <AppText style={styles.retryText}>تلاش دوباره</AppText>
            </Pressable>
          </View>
        ) : !apps ? (
          <View style={styles.center}>
            <ActivityIndicator color="#8b5cf6" size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <AppText style={styles.muted}>اپی پیدا نشد.</AppText>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.listCol}>
              <SectionList
                ref={listRef}
                sections={sections}
                keyExtractor={a => a.packageName}
                stickySectionHeadersEnabled
                contentContainerStyle={styles.listContent}
                onScrollToIndexFailed={() => {}}
                renderSectionHeader={({section}) => (
                  <View style={styles.sectionHeader}>
                    <AppText style={styles.sectionHeaderText}>{section.title}</AppText>
                  </View>
                )}
                renderItem={({item}) => renderRow(item)}
                ListHeaderComponent={
                  !searching && recentApps.length > 0 ? (
                    <View style={styles.recentWrap}>
                      <AppText style={styles.sectionHeaderText}>اخیر</AppText>
                      <View style={styles.recentRow}>
                        {recentApps.map(app => (
                          <Pressable
                            key={app.packageName}
                            style={styles.recentItem}
                            onPress={() => onPressApp(app)}
                            onLongPress={() => setMenuApp(app)}>
                            {app.icon ? (
                              <Image source={{uri: app.icon}} style={styles.icon} />
                            ) : (
                              <View style={styles.icon} />
                            )}
                            <AppText numberOfLines={1} style={styles.recentLabel}>
                              {app.label}
                            </AppText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null
                }
                ListFooterComponent={
                  !searching && hiddenApps.length > 0 ? (
                    <View>
                      <Pressable
                        style={styles.hiddenToggle}
                        onPress={() => setShowHidden(v => !v)}>
                        <AppText style={styles.hiddenToggleText}>
                          {showHidden ? '▾' : '◂'} اپ‌های پنهان ({hiddenApps.length})
                        </AppText>
                      </Pressable>
                      {showHidden
                        ? hiddenApps.map(app => (
                            <View key={app.packageName}>{renderRow(app)}</View>
                          ))
                        : null}
                    </View>
                  ) : null
                }
              />
            </View>

            {/* The letter index only makes sense for the alphabetical list. */}
            {!searching ? (
              <View
                style={styles.sidebar}
                onLayout={e => {
                  sidebarHeight.current = e.nativeEvent.layout.height;
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleSidebarTouch}
                onResponderMove={handleSidebarTouch}
                onResponderRelease={() => setActiveLetter(null)}
                onResponderTerminate={() => setActiveLetter(null)}>
                {letters.map(letter => (
                  <AppText
                    key={letter}
                    style={[
                      styles.sidebarLetter,
                      letter === activeLetter && styles.sidebarLetterActive,
                    ]}>
                    {letter}
                  </AppText>
                ))}
              </View>
            ) : null}

            {activeLetter ? (
              <View pointerEvents="none" style={[styles.bubble, {top: bubbleY}]}>
                <AppText style={styles.bubbleText}>{activeLetter}</AppText>
              </View>
            ) : null}
          </View>
        )}

        {/* Long-press menu — drawn inside the drawer rather than as a second
            Modal, which stacks unreliably on top of this one on Android. */}
        {menuApp ? (
          <View style={styles.menuLayer}>
            <Pressable style={styles.menuBackdrop} onPress={() => setMenuApp(null)} />
            <View style={styles.menuCard}>
              <View style={styles.menuHeader}>
                {menuApp.icon ? (
                  <Image source={{uri: menuApp.icon}} style={styles.icon} />
                ) : null}
                <AppText numberOfLines={1} style={styles.menuTitle}>
                  {menuApp.label}
                </AppText>
              </View>
              <Pressable style={styles.menuItem} onPress={() => runMenuAction('info')}>
                <AppText style={styles.menuItemText}>ℹ️ اطلاعات اپ</AppText>
              </Pressable>
              {!menuApp.isSystem ? (
                <Pressable
                  style={styles.menuItem}
                  onPress={() => runMenuAction('uninstall')}>
                  <AppText style={styles.menuItemText}>🗑️ حذف</AppText>
                </Pressable>
              ) : null}
              {hiddenSet.has(menuApp.packageName) ? (
                <Pressable style={styles.menuItem} onPress={() => runMenuAction('unhide')}>
                  <AppText style={styles.menuItemText}>👁️ نمایش دوباره در لیست</AppText>
                </Pressable>
              ) : (
                <Pressable style={styles.menuItem} onPress={() => runMenuAction('hide')}>
                  <AppText style={styles.menuItemText}>🙈 پنهان کردن از لیست</AppText>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#170b28ee'},
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
  closeBtnText: {color: '#c4b5fd', fontSize: 16, textAlign: 'left'},
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {color: '#eafffb', fontWeight: '700'},
  body: {flex: 1, flexDirection: 'row'},
  listCol: {flex: 1},
  listContent: {paddingBottom: 24},
  sectionHeader: {
    height: SECTION_HEADER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#170b28ee',
  },
  sectionHeaderText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: {
    flex: 1,
    color: '#d6f5ee',
    fontSize: 14,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sidebar: {
    width: 26,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarLetter: {
    color: 'rgba(214,245,238,0.55)',
    fontSize: 10,
    fontWeight: '600',
  },
  sidebarLetterActive: {
    color: '#f5e6b3',
    fontSize: 13,
  },
  recentWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.15)',
    marginBottom: 4,
  },
  recentRow: {
    flexDirection: 'row-reverse',
    marginTop: 8,
  },
  recentItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  recentLabel: {
    color: '#d6f5ee',
    fontSize: 11,
    textAlign: 'center',
  },
  hiddenToggle: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.15)',
  },
  hiddenToggleText: {
    color: 'rgba(214,245,238,0.6)',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  menuLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  menuCard: {
    backgroundColor: '#170b28',
    borderRadius: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  menuHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.15)',
  },
  menuTitle: {
    flex: 1,
    color: '#f5e6b3',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  menuItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuItemText: {
    color: '#eafffb',
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bubble: {
    position: 'absolute',
    right: 34,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
