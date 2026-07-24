// src/tests/mocks/data/gmailMessages.ts
// Datos mock para desarrollar el flujo de import de Gmail sin la API real.

import type { GmailLabel, GmailRawMessage } from '@/types/models'

export const mockGmailLabels: GmailLabel[] = [
  { id: 'Label_1', name: 'Banco' },
  { id: 'Label_2', name: 'Compras tarjeta' },
  { id: 'CATEGORY_PROMOTIONS', name: 'Promociones' },
]

export const mockGmailMessages: GmailRawMessage[] = [
  {
    id: 'gmail-msg-1',
    from: 'Santander <notificaciones@santander.com.uy>',
    subject: 'Compra aprobada con tu tarjeta',
    date: 'Sun, 19 Jul 2026 14:32:00 -0300',
    snippet: 'Compra por UYU 1.234,00 en TIENDA INGLESA',
    body: 'Estimado cliente, se aprobó una compra por UYU 1.234,00 en TIENDA INGLESA el 19/07/2026 a las 14:32 con tu tarjeta terminada en 1234.',
  },
  {
    id: 'gmail-msg-2',
    from: 'Itaú <avisos@itau.com.uy>',
    subject: 'Aviso de consumo',
    date: 'Fri, 17 Jul 2026 09:05:00 -0300',
    snippet: 'Consumo de U$S 29,99 en NETFLIX',
    body: 'Se registró un consumo de U$S 29,99 en NETFLIX.COM el 17/07/2026 con tu tarjeta de crédito terminada en 5678.',
  },
  {
    id: 'gmail-msg-3',
    from: 'Santander <notificaciones@santander.com.uy>',
    subject: 'Compra aprobada con tu tarjeta',
    date: 'Wed, 15 Jul 2026 20:11:00 -0300',
    snippet: 'Compra por UYU 560,00 en DEVOTO',
    body: 'Estimado cliente, se aprobó una compra por UYU 560,00 en DEVOTO EXPRESS el 15/07/2026 a las 20:11 con tu tarjeta terminada en 1234.',
  },
  // Par de duplicados en lote: mismo pago llega por MercadoPago y por Itaú.
  {
    id: 'gmail-msg-4',
    from: 'MercadoPago <no-responder@mercadopago.com.uy>',
    subject: 'Pago realizado',
    date: 'Thu, 16 Jul 2026 13:40:00 -0300',
    snippet: 'Pagaste UYU 850,00 en PEDIDOSYA',
    body: 'Realizaste un pago de UYU 850,00 en PEDIDOSYA el 16/07/2026 con tu tarjeta Itaú.',
  },
  {
    id: 'gmail-msg-5',
    from: 'Itaú <avisos@itau.com.uy>',
    subject: 'Aviso de consumo',
    date: 'Thu, 16 Jul 2026 13:41:00 -0300',
    snippet: 'Consumo de UYU 850,00 en MERPAGO*PEDIDOSYA',
    body: 'Se registró un consumo de UYU 850,00 en MERPAGO*PEDIDOSYA el 16/07/2026 con tu tarjeta terminada en 5678.',
  },
]
