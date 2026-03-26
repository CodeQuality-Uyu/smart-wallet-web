// src/features/cards/hooks/useCards.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cardsService } from '@/services/cardsService'
import type { CreateCardPayload, UpdateCardPayload } from '@/types/models'

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
    onSuccess: () => void qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  })
}

export function useUpdateCard(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateCardPayload) => cardsService.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cardsService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  })
}
