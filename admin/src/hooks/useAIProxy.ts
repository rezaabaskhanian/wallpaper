import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {AIProxyStatus} from '@/lib/types';

export function useAIProxyStatus() {
  return useQuery({
    queryKey: ['admin', 'ai-proxy-status'],
    queryFn: () => api.get<AIProxyStatus>('/admin/ai-proxy/status'),
  });
}

export function useConnectAIProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (link: string) => api.post<AIProxyStatus>('/admin/ai-proxy/connect', {link}),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'ai-proxy-status']}),
  });
}
