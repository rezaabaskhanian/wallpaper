import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {Quote} from '@/lib/types';

export function useQuotes() {
  return useQuery({
    queryKey: ['admin', 'quotes'],
    queryFn: () => api.get<{quotes: Quote[]}>('/admin/quotes'),
    select: d => d.quotes,
  });
}

export type QuoteInput = {
  id?: string;
  line1: string;
  line2: string;
  source: string;
  sortOrder: number;
  isActive: boolean;
};

export function useSaveQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuoteInput) =>
      input.id
        ? api.put<{quote: Quote}>(`/admin/quotes/${input.id}`, input)
        : api.post<{quote: Quote}>('/admin/quotes', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'quotes']}),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/quotes/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'quotes']}),
  });
}

export function useDeleteManyQuotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map(id => api.delete(`/admin/quotes/${id}`))),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'quotes']}),
  });
}
