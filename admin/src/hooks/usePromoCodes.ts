import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {PromoCode} from '@/lib/types';

export function usePromoCodes() {
  return useQuery({
    queryKey: ['admin', 'promoCodes'],
    queryFn: () => api.get<{promoCodes: PromoCode[]}>('/admin/promo-codes'),
    select: d => d.promoCodes,
  });
}

export type PromoCodeInput = {
  id?: string;
  code: string;
  isActive: boolean;
};

export function useSavePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PromoCodeInput) =>
      input.id
        ? api.put<{promoCode: PromoCode}>(`/admin/promo-codes/${input.id}`, input)
        : api.post<{promoCode: PromoCode}>('/admin/promo-codes', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'promoCodes']}),
  });
}

export function useDeletePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/promo-codes/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'promoCodes']}),
  });
}
