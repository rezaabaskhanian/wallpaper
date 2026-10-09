import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {AppTheme} from '@/lib/types';

// «تم» اپ (والپیپر + ویجت). اسم فایل useAppThemes است چون useTheme برای
// تم روشن/تاریک خود پنل است.
export function useAppThemes() {
  return useQuery({
    queryKey: ['admin', 'themes'],
    queryFn: () => api.get<{themes: AppTheme[]}>('/admin/themes'),
    select: d => d.themes,
  });
}

export type AppThemeInput = Omit<AppTheme, 'id'> & {id: string};

export function useSaveAppTheme(isNew: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AppThemeInput) =>
      isNew
        ? api.post<{theme: AppTheme}>('/admin/themes', input)
        : api.put<{theme: AppTheme}>(`/admin/themes/${input.id}`, input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'themes']}),
  });
}

export function useDeleteAppTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/themes/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'themes']}),
  });
}
