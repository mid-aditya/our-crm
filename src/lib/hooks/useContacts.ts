import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contacts } from '@/lib/supabase/queries'
import type { ContactInsert, ContactUpdate } from '@/types/database'

export function useContacts(teamId: string, filters?: { label?: string; search?: string }) {
  return useQuery({
    queryKey: ['contacts', teamId, filters],
    queryFn: () => contacts.getAll(teamId, filters),
    enabled: !!teamId,
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => contacts.getById(id),
    enabled: !!id,
  })
}

export function useCreateContact(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ContactInsert) => contacts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', teamId] })
    },
  })
}

export function useUpdateContact(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) =>
      contacts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', teamId] })
    },
  })
}

export function useDeleteContact(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => contacts.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', teamId] })
    },
  })
}
