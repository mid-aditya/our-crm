import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deals } from '@/lib/supabase/queries'
import type { DealInsert, DealUpdate } from '@/types/database'

export function useDeals(teamId: string) {
  return useQuery({
    queryKey: ['deals', teamId],
    queryFn: () => deals.getAll(teamId),
    enabled: !!teamId,
  })
}

export function useCreateDeal(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DealInsert) => deals.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', teamId] }),
  })
}

export function useUpdateDealStage(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      deals.updateStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', teamId] }),
  })
}

export function useDeleteDeal(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deals.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', teamId] }),
  })
}
