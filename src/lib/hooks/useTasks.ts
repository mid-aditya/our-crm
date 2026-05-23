import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks } from '@/lib/supabase/queries'
import type { TaskInsert, TaskUpdate } from '@/types/database'

export function useTasks(teamId: string) {
  return useQuery({
    queryKey: ['tasks', teamId],
    queryFn: () => tasks.getAll(teamId),
    enabled: !!teamId,
  })
}

export function useCreateTask(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TaskInsert) => tasks.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', teamId] }),
  })
}

export function useToggleTaskStatus(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskUpdate['status'] }) =>
      tasks.toggleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', teamId] }),
  })
}

export function useDeleteTask(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', teamId] }),
  })
}
