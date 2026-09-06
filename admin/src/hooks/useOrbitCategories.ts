import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {OrbitCategory} from '@/lib/types';

export function useOrbitCategories() {
  return useQuery({
    queryKey: ['admin', 'orbitCategories'],
    queryFn: () => api.get<{categories: OrbitCategory[]}>('/admin/orbit-categories'),
    select: d => d.categories,
  });
}

export type OrbitCategoryInput = {
  id: string;
  title: string;
  sort: number;
  centerImage: string;
  centerTitle: string;
  centerSlogan: string;
};

export function useSaveOrbitCategory(isNew: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrbitCategoryInput) =>
      isNew
        ? api.post<{category: OrbitCategory}>('/admin/orbit-categories', input)
        : api.put<{category: OrbitCategory}>(`/admin/orbit-categories/${input.id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ['admin', 'orbitCategories']});
      qc.invalidateQueries({queryKey: ['admin', 'orbitItems']});
    },
  });
}

export function useDeleteOrbitCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/orbit-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ['admin', 'orbitCategories']});
      qc.invalidateQueries({queryKey: ['admin', 'orbitItems']});
    },
  });
}
