/**
 * The «تم فعال»: the whole theme object is kept on the device (not just its
 * id) so the widgets and the launcher can draw it offline and before the
 * catalog loads. Screens subscribe via useActiveTheme().
 */
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AppTheme} from '../store/types';

const KEY = 'activeTheme:v1';

let current: AppTheme | null = null;
let loaded = false;
const listeners = new Set<(t: AppTheme | null) => void>();

function emit() {
  listeners.forEach(l => l(current));
}

async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as AppTheme) : null;
  } catch {
    current = null;
  }
  emit();
}

export async function setActiveTheme(theme: AppTheme | null): Promise<void> {
  current = theme;
  loaded = true;
  emit();
  try {
    if (theme) await AsyncStorage.setItem(KEY, JSON.stringify(theme));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Best-effort; the in-memory value still drives this session.
  }
}

export function useActiveTheme(): AppTheme | null {
  const [theme, setTheme] = useState<AppTheme | null>(current);
  useEffect(() => {
    listeners.add(setTheme);
    load();
    return () => {
      listeners.delete(setTheme);
    };
  }, []);
  return theme;
}
