// src/pages/PlacesPage.tsx

import React, { useState } from 'react'
import { Formik, Form } from 'formik'
import { usePlaces, useCreatePlace } from '@/features/places/hooks/usePlaces'
import { placeSchema, type PlaceFormValues } from '@/features/places/schemas/placeSchema'
import { PlaceNameInput } from '@/features/places/components/PlaceNameInput'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LocaleFilterPeriod } from '@/types/enums'
import styles from './PlacesPage.module.css'

const PERIODS = [
  { value: LocaleFilterPeriod.SevenDays, label: '7 días' },
  { value: LocaleFilterPeriod.CurrentMonth, label: 'Mes' },
  { value: LocaleFilterPeriod.CurrentYear, label: 'Año' },
  { value: LocaleFilterPeriod.AllTime, label: 'Total' },
]

const DEFAULT_ICON = '🏪'

export default function PlacesPage(): React.ReactElement {
  const [period, setPeriod] = useState(LocaleFilterPeriod.CurrentMonth)
  const [showForm, setShowForm] = useState(false)
  const { data: places = [], isLoading } = usePlaces(period)
  const { mutateAsync: createPlace } = useCreatePlace()

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleSubmit(
    values: PlaceFormValues,
    { setStatus }: { setStatus: (status: string) => void },
  ): Promise<void> {
    try {
      await createPlace(values)
      setShowForm(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al guardar'
      setStatus(msg)
    }
  }

  const periodTabs = (
    <div className={styles.periodTabs} role="tablist">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          role="tab"
          aria-selected={period === p.value}
          className={[styles.periodTab, period === p.value ? styles.periodTabActive : ''].join(' ')}
          onClick={() => setPeriod(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <PageHeader title="Locales" rightAction={periodTabs} />

      <div className={styles.body}>
        <button className={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
          ＋ Agregar local
        </button>

        {showForm && (
          <div className={styles.form}>
            <Formik<PlaceFormValues>
              initialValues={{ name: '', address: '', icon: '', globalPlaceId: '' }}
              validationSchema={placeSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, status }) => (
                <Form>
                  <FormField name="name" label="Nombre">
                    <PlaceNameInput />
                  </FormField>
                  <FormField name="address" label="Dirección (opcional)">
                    <TextInput name="address" placeholder="ej. Av. Brasil, Pocitos" icon="📍" />
                  </FormField>
                  {status && (
                    <p className={styles.formError}>{status}</p>
                  )}
                  <div className={styles.formActions}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                      Crear local
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

        {places.map((place) => (
          <div key={place.id} className={styles.item}>
            <div className={styles.itemIcon}>{place.icon ?? DEFAULT_ICON}</div>
            <div className={styles.itemInfo}>
              <p className={styles.itemName}>{place.name}</p>
              {place.address && <p className={styles.itemAddr}>{place.address}</p>}
            </div>
            <span className={styles.count}>{place.visitCount}×</span>
          </div>
        ))}
      </div>
    </div>
  )
}
