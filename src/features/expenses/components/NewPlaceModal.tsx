// src/features/expenses/components/NewPlaceModal.tsx

import React from 'react'
import { Formik, Form } from 'formik'
import { Modal } from '@/components/ui/Modal'
import { useCreatePlace } from '@/features/places/hooks/usePlaces'
import { placeSchema, type PlaceFormValues } from '@/features/places/schemas/placeSchema'
import { PlaceNameInput } from '@/features/places/components/PlaceNameInput'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import type { Place } from '@/types/models'
import styles from './NewPlaceModal.module.css'

interface NewPlaceModalProps {
  onClose: () => void
  onCreated: (place: Place) => void
}

export function NewPlaceModal({ onClose, onCreated }: NewPlaceModalProps): React.ReactElement {
  const { mutateAsync: createPlace } = useCreatePlace()

  async function handleSubmit(
    values: PlaceFormValues,
    { setStatus }: { setStatus: (s: string) => void },
  ): Promise<void> {
    try {
      const place = await createPlace(values)
      onCreated(place)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setStatus(msg)
    }
  }

  return (
    <Modal title="Nuevo lugar" onClose={onClose} width={400}>
      <div className={styles.body}>
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
              {status && <p className={styles.formError}>{status}</p>}
              <div className={styles.actions}>
                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button type="submit" loading={isSubmitting}>Crear lugar</Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Modal>
  )
}
