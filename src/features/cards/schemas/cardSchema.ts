// src/features/cards/schemas/cardSchema.ts
import * as Yup from 'yup'
import { CardType } from '@/types/enums'

export const cardSchema = Yup.object({
  type: Yup.mixed<CardType>()
    .oneOf(Object.values(CardType), 'Invalid type')
    .required('Type is required'),
  bank: Yup.string().trim().min(2).max(60).required('Bank is required'),
  lastFour: Yup.string()
    .matches(/^\d{4}$/, 'Deben ser exactamente 4 dígitos')
    .required('Los últimos 4 dígitos son requeridos'),
  color: Yup.string().optional(),
})

export type CardFormValues = Yup.InferType<typeof cardSchema>
