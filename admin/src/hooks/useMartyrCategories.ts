import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {MartyrCategory} from '@/lib/types';

export function useMartyrCategories() {
  return useQuery({
    queryKey: ['admin', 'martyrCategories'],
    queryFn: () => api.get<{categories: MartyrCategory[]}>('/admin/martyr-categories'),
    select: d => d.categories,
  });
}

export type MartyrCategoryInput = {
  id?: string;
  title: string;
  sortOrder: number;
};

export function useSaveMartyrCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MartyrCategoryInput) =>
      input.id
        ? api.put<{category: MartyrCategory}>(`/admin/martyr-categories/${input.id}`, input)
        : api.post<{category: MartyrCategory}>('/admin/martyr-categories', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'martyrCategories']}),
  });
}

export function useDeleteMartyrCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/martyr-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ['admin', 'martyrCategories']});
      qc.invalidateQueries({queryKey: ['admin', 'martyrs']});
    },
  });
}
