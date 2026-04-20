// src/features/recurring/schemas/recurringSchema.ts
import * as Yup from 'yup'
import { Currency, RecurringFrequency, RecurringMode } from '@/types/enums'

export const recurringSchema = Yup.object({
  name: Yup.string().trim().min(2, 'Mínimo 2 caracteres').max(80).required('El nombre es requerido'),
  icon: Yup.string().trim().min(1, 'Seleccioná un ícono').required('Seleccioná un ícono'),
  description: Yup.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  amount: Yup.number()
    .typeError('Ingresá un monto válido')
    .positive('El monto debe ser mayor a 0')
    .required('El monto es requerido'),
  currency: Yup.mixed<Currency>()
    .oneOf(Object.values(Currency))
    .required('La moneda es requerida'),
  categoryIds: Yup.array()
    .of(Yup.string().required())
    .min(1, 'Seleccioná al menos una categoría')
    .required('Seleccioná al menos una categoría'),
  cardId: Yup.string().required('Seleccioná un medio de pago'),
  mode: Yup.mixed<RecurringMode>()
    .oneOf(Object.values(RecurringMode))
    .required('El modo es requerido'),
  frequency: Yup.mixed<RecurringFrequency>()
    .oneOf(Object.values(RecurringFrequency))
    .required('La frecuencia es requerida'),
  status: Yup.string().optional(),
  dueDayOfMonth: Yup.number()
    .integer()
    .min(1, 'Mínimo día 1')
    .max(31, 'Máximo día 31')
    .required('El día de vencimiento es requerido'),
})

export type RecurringFormValues = Yup.InferType<typeof recurringSchema>
