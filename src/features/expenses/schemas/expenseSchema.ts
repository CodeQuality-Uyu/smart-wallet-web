// src/features/expenses/schemas/expenseSchema.ts

import * as Yup from 'yup'
import { Currency } from '@/types/enums'
import { MAX_INSTALLMENTS } from '@/features/expenses/installments'

export const expenseSchema = Yup.object({
  description: Yup.string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(120, 'Máximo 120 caracteres')
    .required('La descripción es requerida'),

  amount: Yup.number()
    .typeError('Ingresá un número válido')
    .positive('El monto debe ser mayor a 0')
    .required('El monto es requerido'),

  currency: Yup.mixed<Currency>()
    .oneOf(Object.values(Currency), 'Moneda inválida')
    .required('La moneda es requerida'),

  cardId: Yup.string().required('El medio de pago es requerido'),

  categoryIds: Yup.array(Yup.string().required())
    .min(1, 'Seleccioná al menos una categoría')
    .required('Las categorías son requeridas'),

  placeId: Yup.string().optional(),

  date: Yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (AAAA-MM-DD)')
    .required('La fecha es requerida'),

  receiptFile: Yup.mixed<File>().optional(),

  // Cantidad de cuotas. 1 = gasto normal. Cuando > 1, `amount` es el TOTAL a dividir.
  installments: Yup.number()
    .typeError('Ingresá un número de cuotas válido')
    .integer('Debe ser un número entero de cuotas')
    .min(1, 'Mínimo 1 cuota')
    .max(MAX_INSTALLMENTS, `Máximo ${MAX_INSTALLMENTS} cuotas`)
    .default(1),
})

export type ExpenseFormValues = Yup.InferType<typeof expenseSchema>
