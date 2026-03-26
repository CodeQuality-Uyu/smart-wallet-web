// src/features/recurring/schemas/confirmPaymentSchema.ts
import * as Yup from 'yup'

export const confirmPaymentSchema = Yup.object({
  amount: Yup.number()
    .typeError('Must be a number')
    .positive('Must be greater than 0')
    .required('Amount is required'),
})

export type ConfirmPaymentFormValues = Yup.InferType<typeof confirmPaymentSchema>
