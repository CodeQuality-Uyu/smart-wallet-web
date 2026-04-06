// src/pages/PlacesPage.tsx

import React, { useState, useMemo } from 'react'
import { Formik, Form } from 'formik'
import { usePlaces, useCreatePlace } from '@/features/places/hooks/usePlaces'
import { placeSchema, type PlaceFormValues } from '@/features/places/schemas/placeSchema'
import { PlaceNameInput } from '@/features/places/components/PlaceNameInput'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
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
  const [period, setPeriod] = useState(LocaleFilterPeriod.CurrentMonth)
  const [showForm, setShowForm] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
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

  function handleCardClick(place: Place): void {
    setSelectedPlace((prev) => (prev?.id === place.id ? null : place))
  }

  const rightAction = (
    <button className={styles.addBtnDesktop} onClick={() => setShowForm((s) => !s)}>
      ＋ Agregar local
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Locales"
        subtitle="Gestiona los comercios donde comprás tus productos"
        rightAction={rightAction}
      />

      <div className={styles.page}>
        {/* Add form modal */}
        {showForm && (
          <div className={styles.formOverlay} onClick={() => setShowForm(false)}>
            <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.formTitle}>Agregar local</h3>
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
                    <div className={styles.formActions}>
                      <Button type="button" variant="ghost" size="md" onClick={() => setShowForm(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
                        Crear local
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        )}

        {/* Stats row */}
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

        {/* Search + period */}
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

        {/* Place cards grid */}
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
                className={`${styles.placeCard} ${selectedPlace?.id === place.id ? styles.placeCardActive : ''}`}
                onClick={() => handleCardClick(place)}
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

        {/* Detail panel */}
        {selectedPlace && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div className={styles.detailIconWrap}>{selectedPlace.icon ?? DEFAULT_ICON}</div>
              <div className={styles.detailMeta}>
                <h3 className={styles.detailName}>{selectedPlace.name}</h3>
                {selectedPlace.address && <p className={styles.detailAddr}>📍 {selectedPlace.address}</p>}
              </div>
              <div className={styles.detailActions}>
                <button className={styles.detailEditBtn}>Editar</button>
                <button className={styles.detailDeleteBtn}>Eliminar</button>
              </div>
            </div>

            <div className={styles.detailBody}>
              <div className={styles.detailTable}>
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

              <div className={styles.detailSidebar}>
                <div className={styles.sidebarCard}>
                  <h4 className={styles.sidebarTitle}>Ubicación</h4>
                  <div className={styles.mapPlaceholder}>
                    <span>📍</span>
                    <p>{selectedPlace.address ?? 'Sin dirección registrada'}</p>
                  </div>
                </div>
                <div className={styles.sidebarCard}>
                  <h4 className={styles.sidebarTitle}>Estadísticas</h4>
                  <ul className={styles.statsList}>
                    <li>
                      <span className={styles.statsListLabel}>Total visitas</span>
                      <span className={styles.statsListVal}>{selectedPlace.visitCount}</span>
                    </li>
                    <li>
                      <span className={styles.statsListLabel}>Productos únicos</span>
                      <span className={styles.statsListVal}>–</span>
                    </li>
                    <li>
                      <span className={styles.statsListLabel}>Total ahorrado</span>
                      <span className={styles.statsListVal}>–</span>
                    </li>
                    <li>
                      <span className={styles.statsListLabel}>Último gasto</span>
                      <span className={styles.statsListVal}>–</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
