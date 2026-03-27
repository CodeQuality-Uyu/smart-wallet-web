// src/features/recurring/schemas/confirmPaymentSchema.ts
import * as Yup from 'yup'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export const confirmPaymentSchema = Yup.object({
  amount: Yup.number()
    .typeError('Ingresá un número válido')
    .positive('El monto debe ser mayor a 0')
    .required('El monto es requerido'),
  receiptFile: Yup.mixed<File>()
    .optional()
    .test('fileSize', 'El archivo no puede superar los 10 MB', (file) => {
      if (!file) return true
      return file.size <= MAX_FILE_SIZE
    })
    .test('fileType', 'Solo se permiten imágenes (JPG, PNG, WEBP) o PDF', (file) => {
      if (!file) return true
      return ALLOWED_TYPES.includes(file.type)
    }),
})

export type ConfirmPaymentFormValues = Yup.InferType<typeof confirmPaymentSchema>
