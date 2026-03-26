// src/features/recurring/schemas/recurringSchema.ts
import * as Yup from 'yup'
import { Currency, RecurringMode } from '@/types/enums'

export const recurringSchema = Yup.object({
  name: Yup.string().trim().min(2).max(80).required('Name is required'),
  icon: Yup.string().trim().min(1, 'Select an icon').required(),
  amount: Yup.number().positive().required('Amount is required'),
  currency: Yup.mixed<Currency>()
    .oneOf(Object.values(Currency))
    .required('Currency is required'),
  categoryId: Yup.string().required('Category is required'),
  cardId: Yup.string().required('Card is required'),
  mode: Yup.mixed<RecurringMode>()
    .oneOf(Object.values(RecurringMode))
    .required('Mode is required'),
  status: Yup.string().optional(),
  dueDayOfMonth: Yup.number()
    .integer()
    .min(1)
    .max(31)
    .when('mode', {
      is: RecurringMode.Manual,
      then: (s) => s.required('Due day is required for manual payments'),
      otherwise: (s) => s.optional(),
    }),
})

export type RecurringFormValues = Yup.InferType<typeof recurringSchema>
