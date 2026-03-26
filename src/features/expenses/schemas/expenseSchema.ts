// src/features/expenses/schemas/expenseSchema.ts

import * as Yup from 'yup'
import { Currency, PaymentType } from '@/types/enums'

export const expenseSchema = Yup.object({
  description: Yup.string()
    .trim()
    .min(2, 'Minimum 2 characters')
    .max(120, 'Maximum 120 characters')
    .required('Description is required'),

  amount: Yup.number()
    .typeError('Must be a number')
    .positive('Must be greater than 0')
    .required('Amount is required'),

  currency: Yup.mixed<Currency>()
    .oneOf(Object.values(Currency), 'Invalid currency')
    .required('Currency is required'),

  paymentType: Yup.mixed<PaymentType>()
    .oneOf(Object.values(PaymentType), 'Invalid payment type')
    .required('Payment type is required'),

  categoryIds: Yup.array(Yup.string().required())
    .min(1, 'Select at least one category')
    .required('Categories are required'),

  placeId: Yup.string().optional(),

  date: Yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .required('Date is required'),
})

export type ExpenseFormValues = Yup.InferType<typeof expenseSchema>
