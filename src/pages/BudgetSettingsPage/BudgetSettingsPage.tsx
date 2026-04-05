// src/pages/BudgetSettingsPage.tsx

import React, { useState } from 'react'
import { Formik, Form } from 'formik'
import type { FormikHelpers } from 'formik'
import * as Yup from 'yup'
import { useBudget, useSetBudget } from '@/hooks/useBudget'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'
import styles from './BudgetSettingsPage.module.css'

const budgetSchema = Yup.object({
  usd: Yup.number()
    .typeError('Ingresá un número válido')
    .min(0, 'Debe ser mayor o igual a 0')
    .optional(),
  uyu: Yup.number()
    .typeError('Ingresá un número válido')
    .min(0, 'Debe ser mayor o igual a 0')
    .optional(),
})

type BudgetFormValues = { usd: number | ''; uyu: number | '' }

export default function BudgetSettingsPage(): React.ReactElement {
  const { data: budget, isLoading } = useBudget()
  const { mutateAsync: setBudget } = useSetBudget()
  const [savedOk, setSavedOk] = useState(false)

  if (isLoading) return <LoadingSpinner fullPage />

  const initialValues: BudgetFormValues = {
    usd: budget?.usd ?? '',
    uyu: budget?.uyu ?? '',
  }

  async function handleSubmit(
    values: BudgetFormValues,
    { setStatus, resetForm }: FormikHelpers<BudgetFormValues>,
  ): Promise<void> {
    try {
      await setBudget({
        usd: values.usd !== '' ? Number(values.usd) : undefined,
        uyu: values.uyu !== '' ? Number(values.uyu) : undefined,
      })
      resetForm({ values })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    } catch {
      setStatus('No se pudo guardar el presupuesto. Intentá de nuevo.')
    }
  }

  return (
    <div>
      <PageHeader title="Presupuesto mensual" subtitle="Definí cuánto querés gastar por moneda" />
      <div className={styles.body}>
        <p className={styles.hint}>
          Establecé un límite de gasto mensual para cada moneda. La pantalla de inicio te avisará cuando estés cerca o lo hayas superado.
        </p>

        <Formik
          initialValues={initialValues}
          validationSchema={budgetSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, dirty, status, resetForm }) => (
            <Form noValidate>
              <FormField name="usd" label="Límite mensual en USD">
                <TextInput name="usd" type="number" inputMode="decimal" icon="$" placeholder="Sin límite" />
              </FormField>

              <FormField name="uyu" label="Límite mensual en UYU">
                <TextInput name="uyu" type="number" inputMode="decimal" icon="$U" placeholder="Sin límite" />
              </FormField>

              {status && <p className={styles.error}>{status}</p>}

              {savedOk && !dirty && (
                <p className={styles.success}>✅ Presupuesto actualizado correctamente</p>
              )}

              {dirty && (
                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={() => resetForm()}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="secondary" loading={isSubmitting} disabled={isSubmitting}>
                    Guardar
                  </Button>
                </div>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </div>
  )
}
