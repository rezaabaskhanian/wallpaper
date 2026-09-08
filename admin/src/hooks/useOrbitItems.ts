import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {OrbitItem} from '@/lib/types';

export function useOrbitItems() {
  return useQuery({
    queryKey: ['admin', 'orbitItems'],
    queryFn: () => api.get<{items: OrbitItem[]}>('/admin/orbit-items'),
    select: d => d.items,
  });
}

export type OrbitItemInput = {
  id?: string;
  categoryId: string;
  label: string;
  image: string;
  description: string;
  sort: number;
  isActive: boolean;
};

export function useSaveOrbitItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrbitItemInput) =>
      input.id
        ? api.put<{item: OrbitItem}>(`/admin/orbit-items/${input.id}`, input)
        : api.post<{item: OrbitItem}>('/admin/orbit-items', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'orbitItems']}),
  });
}

export function useDeleteOrbitItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/orbit-items/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'orbitItems']}),
  });
}

export function useDeleteManyOrbitItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => api.delete(`/admin/orbit-items/${id}`))),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'orbitItems']}),
  });
}
