import {useCallback, useState} from 'react';
import {clearAdminKey, isAuthed as checkAuthed, setAdminKey} from '@/lib/api';

export function useAuth() {
  const [authed, setAuthed] = useState(() => checkAuthed());

  const login = useCallback((key: string) => {
    setAdminKey(key);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    clearAdminKey();
    setAuthed(false);
  }, []);

  return {isAuthed: authed, login, logout};
}
