// src/features/integrations/hooks/useGmailIntegration.ts

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { integrationsService } from '@/services/integrationsService'
import type { GmailIntegration, GmailQueue } from '@/types/models'

export const GMAIL_INTEGRATION_KEY = ['integrations', 'gmail'] as const
export const GMAIL_QUEUE_KEY = ['integrations', 'gmail', 'queue'] as const

export function useGmailIntegration(): UseQueryResult<GmailIntegration, Error> {
  return useQuery({
    queryKey: GMAIL_INTEGRATION_KEY,
    queryFn: () => integrationsService.getGmail(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetGmailIntegration(): UseMutationResult<
  GmailIntegration,
  Error,
  Partial<GmailIntegration>
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<GmailIntegration>) => integrationsService.setGmail(patch),
    onSuccess: (updated) => {
      qc.setQueryData<GmailIntegration>(GMAIL_INTEGRATION_KEY, updated)
    },
  })
}

export function useGmailQueue(): UseQueryResult<GmailQueue, Error> {
  return useQuery({
    queryKey: GMAIL_QUEUE_KEY,
    queryFn: () => integrationsService.getGmailQueue(),
    staleTime: 60 * 1000,
  })
}

export function useRemoveGmailPending(): UseMutationResult<GmailQueue, Error, string[]> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageIds: string[]) => integrationsService.removeGmailPending(messageIds),
    onSuccess: (updated) => {
      qc.setQueryData<GmailQueue>(GMAIL_QUEUE_KEY, updated)
    },
  })
}

/** Base hardcodeada: cuántos días hacia atrás buscar por defecto (sync manual semanal). */
export const DEFAULT_WINDOW_DAYS = 7

/**
 * Ventana sugerida: parte de la base (7 días) y se auto-extiende si pasó más
 * tiempo desde la última sync (redondeando hacia arriba), para no perder los
 * mails de una semana salteada. El usuario puede editar el valor final.
 */
export function suggestedWindowDays(config: GmailIntegration): number {
  if (!config.lastSyncAt) return DEFAULT_WINDOW_DAYS
  const elapsedMs = Date.now() - new Date(config.lastSyncAt).getTime()
  const elapsedDays = Math.ceil(elapsedMs / 86_400_000)
  return Math.max(DEFAULT_WINDOW_DAYS, elapsedDays)
}
