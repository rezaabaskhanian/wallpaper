import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {AISettings, UpdateAISettingsInput} from '@/lib/types';

export function useAISettings() {
  return useQuery({
    queryKey: ['admin', 'ai-settings'],
    queryFn: () => api.get<{settings: AISettings}>('/admin/ai-settings'),
    select: d => d.settings,
  });
}

export function useSaveAISettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAISettingsInput) =>
      api.put<{settings: AISettings}>('/admin/ai-settings', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'ai-settings']}),
  });
}
