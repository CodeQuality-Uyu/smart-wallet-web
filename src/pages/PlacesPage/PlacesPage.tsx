// src/pages/PlacesPage/PlacesPage.tsx

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlaces, useCreatePlace } from '@/features/places/hooks/usePlaces'
import { PlaceFormModal } from '@/features/places/components/PlaceFormModal'
import type { PlaceFormValues } from '@/features/places/schemas/placeSchema'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PeriodControl } from '@/components/ui/PeriodControl'
import { LocaleFilterPeriod } from '@/types/enums'
import type { Place } from '@/types/models'
import styles from './PlacesPage.module.css'

const PERIODS = [
  { value: LocaleFilterPeriod.SevenDays, label: '7 días' },
  { value: LocaleFilterPeriod.CurrentMonth, label: 'Mes' },
  { value: LocaleFilterPeriod.CurrentYear, label: 'Año' },
  { value: LocaleFilterPeriod.AllTime, label: 'Total' },
]

const DEFAULT_ICON = '🏪'

export default function PlacesPage(): React.ReactElement {
  const navigate = useNavigate()
  const [period, setPeriod] = useState(LocaleFilterPeriod.CurrentMonth)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: places = [], isLoading } = usePlaces(period)
  const { mutateAsync: createPlace } = useCreatePlace()

  const filteredPlaces = useMemo(() => {
    if (!searchQuery) return places
    const q = searchQuery.toLowerCase()
    return places.filter((p) => p.name.toLowerCase().includes(q))
  }, [places, searchQuery])

  const mostVisited = useMemo(
    () => places.reduce<Place | null>((max, p) => (!max || p.visitCount > max.visitCount ? p : max), null),
    [places],
  )

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleCreate(values: PlaceFormValues): Promise<void> {
    await createPlace(values)
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Locales"
        subtitle="Gestiona los comercios donde comprás tus productos"
        rightAction={
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            ＋ Agregar local
          </button>
        }
      />

      {showForm && (
        <PlaceFormModal mode="create" onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}

      <div className={styles.page}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🏪</span>
            <span className={styles.statLabel}>Total locales</span>
            <span className={styles.statValue}>{places.length}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🏆</span>
            <span className={styles.statLabel}>Más visitado</span>
            <span className={styles.statValue}>{mostVisited ? mostVisited.name : '–'}</span>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar local..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <PeriodControl options={PERIODS} value={period} onChange={setPeriod} />
        </div>

        {filteredPlaces.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🏪</span>
            <p>No hay locales{searchQuery ? ' que coincidan con la búsqueda' : ''}.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                className={styles.placeCard}
                onClick={() => navigate(`/settings/places/${place.id}`)}
              >
                <div className={styles.placeCardTop}>
                  <div className={styles.placeIconWrap}>{place.icon ?? DEFAULT_ICON}</div>
                  <div className={styles.placeCardInfo}>
                    <p className={styles.placeName}>{place.name}</p>
                    {place.address && <p className={styles.placeAddr}>📍 {place.address}</p>}
                  </div>
                </div>
                <div className={styles.placeCardFooter}>
                  <span className={styles.placeStats}>0 productos · {place.visitCount} visitas</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
