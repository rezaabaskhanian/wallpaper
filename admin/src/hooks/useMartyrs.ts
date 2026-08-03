import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {Martyr} from '@/lib/types';

export function useMartyrs() {
  return useQuery({
    queryKey: ['admin', 'martyrs'],
    queryFn: () => api.get<{martyrs: Martyr[]}>('/admin/martyrs'),
    select: d => d.martyrs,
  });
}

export type MartyrInput = {
  id?: string;
  name: string;
  martyrdom: string;
  born: string;
  martyredOn: string;
  place: string;
  will: string;
  photo: string;
  sortOrder: number;
  isActive: boolean;
};

export function useSaveMartyr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MartyrInput) =>
      input.id
        ? api.put<{martyr: Martyr}>(`/admin/martyrs/${input.id}`, input)
        : api.post<{martyr: Martyr}>('/admin/martyrs', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'martyrs']}),
  });
}

export function useDeleteMartyr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/martyrs/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'martyrs']}),
  });
}

export function useDeleteManyMartyrs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map(id => api.delete(`/admin/martyrs/${id}`))),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'martyrs']}),
  });
}
