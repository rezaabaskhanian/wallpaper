import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {QuoteCategory} from '@/lib/types';

export function useQuoteCategories() {
  return useQuery({
    queryKey: ['admin', 'quoteCategories'],
    queryFn: () => api.get<{categories: QuoteCategory[]}>('/admin/quote-categories'),
    select: d => d.categories,
  });
}

export type QuoteCategoryInput = {
  id: string;
  title: string;
  sort: number;
};

export function useSaveQuoteCategory(isNew: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuoteCategoryInput) =>
      isNew
        ? api.post<{category: QuoteCategory}>('/admin/quote-categories', input)
        : api.put<{category: QuoteCategory}>(`/admin/quote-categories/${input.id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ['admin', 'quoteCategories']});
      qc.invalidateQueries({queryKey: ['admin', 'quotes']});
    },
  });
}

export function useDeleteQuoteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/quote-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ['admin', 'quoteCategories']});
      qc.invalidateQueries({queryKey: ['admin', 'quotes']});
    },
  });
}
