import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {Occasion} from '@/lib/types';

export function useOccasions() {
  return useQuery({
    queryKey: ['admin', 'occasions'],
    queryFn: () => api.get<{occasions: Occasion[]}>('/admin/occasions'),
    select: d => d.occasions,
  });
}

export function useSaveOccasion(isNew: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Occasion) =>
      isNew
        ? api.post<{occasion: Occasion}>('/admin/occasions', input)
        : api.put<{occasion: Occasion}>(`/admin/occasions/${input.id}`, input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'occasions']}),
  });
}

export function useDeleteOccasion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/occasions/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'occasions']}),
  });
}
