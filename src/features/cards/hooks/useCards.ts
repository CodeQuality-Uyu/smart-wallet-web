// src/features/cards/hooks/useCards.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cardsService } from '@/services/cardsService'
import type { Card, CreateCardPayload } from '@/types/models'

export const CARD_KEYS = {
  all: ['cards'] as const,
  list: () => ['cards', 'list'] as const,
} as const

export function useCards() {
  return useQuery({
    queryKey: CARD_KEYS.list(),
    queryFn: () => cardsService.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCardPayload) => cardsService.create(payload),
    onSuccess: (newCard) => {
      qc.setQueryData<Card[]>(CARD_KEYS.list(), (prev) => [...(prev ?? []), newCard])
    },
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<import('@/types/models').CreateCardPayload> }) =>
      cardsService.update(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<Card[]>(CARD_KEYS.list(), (prev) =>
        prev?.map((c) => (c.id === updated.id ? updated : c)) ?? []
      )
    },
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cardsService.remove(id),
    onSuccess: (_data, id) => {
      qc.setQueryData<Card[]>(CARD_KEYS.list(), (prev) =>
        prev?.filter((c) => c.id !== id) ?? []
      )
      void qc.invalidateQueries({ queryKey: CARD_KEYS.all })
    },
  })
}
