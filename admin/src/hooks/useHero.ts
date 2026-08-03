import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {Hero} from '@/lib/types';

export function useHero() {
  return useQuery({
    queryKey: ['admin', 'hero'],
    queryFn: () => api.get<{hero: Hero}>('/hero'),
    select: d => d.hero,
  });
}

export function useSaveHero() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Hero) => api.put<{hero: Hero}>('/admin/hero', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'hero']}),
  });
}
