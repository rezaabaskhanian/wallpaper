import {useQuery} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {AIGenerationLogsResponse} from '@/lib/types';

export function useAIGenerationLogs(limit: number, offset: number) {
  return useQuery({
    queryKey: ['admin', 'ai-generation-logs', limit, offset],
    queryFn: () =>
      api.get<AIGenerationLogsResponse>(`/admin/ai-generation-logs?limit=${limit}&offset=${offset}`),
    placeholderData: prev => prev,
  });
}
