// src/pages/PlaceDetailPage/PlaceDetailPage.tsx

import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlaces, useUpdatePlace, useDeletePlace } from '@/features/places/hooks/usePlaces'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { PlaceFormModal } from '@/features/places/components/PlaceFormModal'
import type { PlaceFormValues } from '@/features/places/schemas/placeSchema'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LocaleFilterPeriod } from '@/types/enums'
import styles from './PlaceDetailPage.module.css'

const DEFAULT_ICON = '🏪'

export default function PlaceDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: places = [], isLoading: loadingPlaces } = usePlaces()
  const { data: expensesResult, isLoading: loadingExpenses } = useExpenses({
    period: LocaleFilterPeriod.CurrentMonth,
  })
  const expensesThisMonth = expensesResult?.data ?? []
  const { mutateAsync: updatePlace } = useUpdatePlace(id!)
  const { mutateAsync: deletePlace, isPending: isDeleting } = useDeletePlace()

  const place = places.find((p) => p.id === id)
  const visitsThisMonth = useMemo(
    () => expensesThisMonth.filter((e) => e.placeId === id).length,
    [expensesThisMonth, id],
  )

  if (loadingPlaces || loadingExpenses) return <LoadingSpinner fullPage />
  if (!place) return <div className={styles.notFound}>Local no encontrado.</div>

  async function handleUpdate(values: PlaceFormValues): Promise<void> {
    await updatePlace({ name: values.name, address: values.address, icon: values.icon })
    setShowEdit(false)
  }

  async function handleDelete(): Promise<void> {
    await deletePlace(place!.id)
    navigate('/settings/places')
  }

  return (
    <div>
      <PageHeader
        title={`${place.icon ?? DEFAULT_ICON} ${place.name}`}
        subtitle={place.address ?? undefined}
        rightAction={
          <div className={styles.headerActions}>
            <button className={styles.editBtn} onClick={() => setShowEdit(true)}>Editar</button>
            <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>Eliminar</button>
          </div>
        }
      />

      {showEdit && (
        <PlaceFormModal
          mode="edit"
          initialValues={{ name: place.name, address: place.address ?? '', icon: place.icon ?? '' }}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className={styles.overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Eliminar local</h3>
            <p className={styles.modalBody}>
              ¿Seguro que querés eliminar <strong>{place.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" variant="ghost" size="md" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" size="md" loading={isDeleting} onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Productos en este local</h3>
          <div className={styles.tableHeader}>
            <span>Producto</span>
            <span>Categoría</span>
            <span>Tipo</span>
            <span>Último precio</span>
            <span>Variación</span>
            <span>Vs. mejor</span>
          </div>
          <div className={styles.tableEmpty}>
            <span className={styles.tableEmptyIcon}>📦</span>
            <p>Aún no hay productos registrados para este local.</p>
          </div>
        </div>

        <div className={styles.metaRow}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Ubicación</h3>
            <div className={styles.mapPlaceholder}>
              <span>📍</span>
              <p>{place.address ?? 'Sin dirección registrada'}</p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Estadísticas</h3>
            <ul className={styles.statsList}>
              <li>
                <span className={styles.statsLabel}><span className={styles.statsIcon}>📅</span>Total visitas en el mes</span>
                <span className={styles.statsVal}>{visitsThisMonth}</span>
              </li>
              <li>
                <span className={styles.statsLabel}><span className={styles.statsIcon}>💵</span>Total gastado USD</span>
                <span className={styles.statsVal}>–</span>
              </li>
              <li>
                <span className={styles.statsLabel}><span className={styles.statsIcon}>💰</span>Total gastado UYU</span>
                <span className={styles.statsVal}>–</span>
              </li>
              <li>
                <span className={styles.statsLabel}><span className={styles.statsIcon}>📦</span>Productos únicos</span>
                <span className={styles.statsVal}>–</span>
              </li>
              <li>
                <span className={styles.statsLabel}><span className={styles.statsIcon}>🕐</span>Último gasto</span>
                <span className={styles.statsVal}>–</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
