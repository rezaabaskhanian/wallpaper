import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';
import type {Category, Wallpaper} from '@/lib/types';

export function useWallpapers() {
  return useQuery({
    queryKey: ['admin', 'wallpapers'],
    queryFn: () => api.get<{wallpapers: Wallpaper[]}>('/admin/wallpapers'),
    select: d => d.wallpapers,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.get<{categories: Category[]}>('/admin/categories'),
    select: d => d.categories,
  });
}

export type WallpaperInput = {
  id?: string;
  title: string;
  category: string;
  premium: boolean;
  thumb: string;
  full: string;
  width: number;
  height: number;
  bytes: number;
  isActive: boolean;
};

export function useSaveWallpaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WallpaperInput) =>
      input.id
        ? api.put<{wallpaper: Wallpaper}>(`/admin/wallpapers/${input.id}`, input)
        : api.post<{wallpaper: Wallpaper}>('/admin/wallpapers', input),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'wallpapers']}),
  });
}

export function useDeleteWallpaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/wallpapers/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'wallpapers']}),
  });
}

export function useDeleteManyWallpapers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map(id => api.delete(`/admin/wallpapers/${id}`))),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'wallpapers']}),
  });
}

export type CategoryInput = {
  id: string;
  title: string;
  sort: number;
};

export function useSaveCategory(isNew: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      isNew
        ? api.post<{category: Category}>('/admin/categories', input)
        : api.put<{category: Category}>(`/admin/categories/${input.id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ['admin', 'categories']});
      qc.invalidateQueries({queryKey: ['admin', 'wallpapers']});
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'categories']}),
  });
}

export function useDeleteManyCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map(id => api.delete(`/admin/categories/${id}`))),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin', 'categories']}),
  });
}
