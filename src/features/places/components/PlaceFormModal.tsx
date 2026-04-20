// src/features/places/components/PlaceFormModal.tsx
// Reusable modal for creating and editing a Place.
// - mode="create": shows PlaceNameInput (autocomplete global pool)
// - mode="edit": shows plain TextInput (name is already resolved)

import React from 'react'
import { Formik, Form } from 'formik'
import { placeSchema, type PlaceFormValues } from '../schemas/placeSchema'
import { PlaceNameInput } from './PlaceNameInput'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import styles from './PlaceFormModal.module.css'

interface Props {
  mode: 'create' | 'edit'
  initialValues?: Partial<PlaceFormValues>
  onSubmit: (values: PlaceFormValues) => Promise<void>
  onClose: () => void
}

const CREATE_DEFAULTS: PlaceFormValues = { name: '', address: '', icon: '', globalPlaceId: '' }

export function PlaceFormModal({ mode, initialValues, onSubmit, onClose }: Props): React.ReactElement {
  const values: PlaceFormValues = { ...CREATE_DEFAULTS, ...initialValues }
  const title = mode === 'create' ? 'Agregar local' : 'Editar local'
  const submitLabel = mode === 'create' ? 'Crear local' : 'Guardar cambios'

  async function handleSubmit(
    v: PlaceFormValues,
    { setStatus }: { setStatus: (s: string) => void },
  ): Promise<void> {
    try {
      await onSubmit(v)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        <Formik<PlaceFormValues>
          initialValues={values}
          validationSchema={placeSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, status }) => (
            <Form>
              <FormField name="name" label="Nombre">
                {mode === 'create' ? (
                  <PlaceNameInput />
                ) : (
                  <TextInput name="name" placeholder="ej. Disco Pocitos" />
                )}
              </FormField>
              <FormField name="address" label="Dirección (opcional)">
                <TextInput name="address" placeholder="ej. Av. Brasil, Pocitos" icon="📍" />
              </FormField>
              {status && <p className={styles.error}>{status}</p>}
              <div className={styles.actions}>
                <Button type="button" variant="ghost" size="md" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
                  {submitLabel}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  )
}
