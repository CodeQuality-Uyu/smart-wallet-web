// src/features/cards/cardUtils.ts

import { CardType } from '@/types/enums'
import type { Card } from '@/types/models'

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  [CardType.Credit]: 'Crédito',
  [CardType.Debit]: 'Débito',
}

export function cardLabel(card: Card): string {
  return card.lastFour
    ? `${card.bank} · ${CARD_TYPE_LABEL[card.type] ?? card.type} ···· ${card.lastFour}`
    : `${card.bank} · ${CARD_TYPE_LABEL[card.type] ?? card.type}`
}

export function cardOptions(cards: Card[]): { value: string; label: string }[] {
  return cards.map((c) => ({ value: c.id, label: cardLabel(c) }))
}
