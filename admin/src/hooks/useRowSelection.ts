import {useCallback, useMemo, useState} from 'react';

export function useRowSelection<T extends {id: string}>(rows: T[] | undefined) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => new Set((rows ?? []).map(r => r.id)), [rows]);
  const allSelected = allIds.size > 0 && [...allIds].every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => (prev.size === allIds.size ? new Set() : new Set(allIds)));
  }, [allIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {selected, allSelected, someSelected, toggle, toggleAll, clear};
}
