import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {DeviceInfo, Poll, WallpaperRequest} from '@/lib/types';

export function useRequests() {
  return useQuery({
    queryKey: ['admin', 'requests'],
    queryFn: () => api.get<{requests: WallpaperRequest[]}>('/admin/requests'),
    select: d => d.requests,
  });
}

export function useUpdateRequests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      ids: string[];
      status: WallpaperRequest['status'];
      categoryId: string;
      reply: string;
    }) => api.put('/admin/requests', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'requests']}),
  });
}

export function useDevice(deviceId: string | null) {
  return useQuery({
    queryKey: ['admin', 'device', deviceId],
    queryFn: () => api.get<DeviceInfo>(`/admin/devices/${encodeURIComponent(deviceId!)}`),
    enabled: !!deviceId,
  });
}

export function usePolls() {
  return useQuery({
    queryKey: ['admin', 'polls'],
    queryFn: () => api.get<{polls: Poll[]}>('/admin/polls'),
    select: d => d.polls,
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {question: string; options: {title: string; categoryId: string}[]}) =>
      api.post('/admin/polls', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'polls']}),
  });
}

export function useClosePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, winnerOptionId}: {id: string; winnerOptionId: string}) =>
      api.put(`/admin/polls/${id}/close`, {winnerOptionId}),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'polls']}),
  });
}

export function useDeletePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/polls/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'polls']}),
  });
}
