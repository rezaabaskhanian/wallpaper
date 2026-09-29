import {useQuery} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {AnalyticsSummary} from '@/lib/types';

export function useAnalytics(days: number) {
  return useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: () => api.get<AnalyticsSummary>(`/admin/analytics?days=${days}`),
    placeholderData: prev => prev,
  });
}
