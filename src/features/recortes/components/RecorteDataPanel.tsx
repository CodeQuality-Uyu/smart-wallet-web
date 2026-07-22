// src/features/recortes/components/RecorteDataPanel.tsx
// Panel de auditoría: muestra qué datos se usan para analizar el recorte, para
// corroborar el resultado. Agregados = snapshot persistido del último cálculo
// (o los actuales si no hay); la muestra de gastos se reconstruye al abrir.

import React, { useState } from 'react'
import { useRecorteData } from '../hooks/useRecortes'
import { formatCurrency } from '@/utils/formatCurrency'
import { Currency } from '@/types/enums'
import type { Recorte } from '@/types/models'
import styles from './RecorteDataPanel.module.css'

function money(uyu: number, usd: number): string {
  const parts: string[] = []
  if (uyu) parts.push(formatCurrency(uyu, Currency.UYU))
  if (usd) parts.push(formatCurrency(usd, Currency.USD))
  return parts.length ? parts.join(' · ') : '—'
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })
}

interface RecorteDataPanelProps {
  recorte: Recorte
}

export function RecorteDataPanel({ recorte }: RecorteDataPanelProps): React.ReactElement {
  const { data, isLoading } = useRecorteData(recorte, true)
  const [showSample, setShowSample] = useState(false)

  // Agregados: preferimos el snapshot del cálculo (lo que produjo el número);
  // si un resultado viejo no lo tiene, usamos los agregados actuales.
  const snapshot = recorte.lastResult?.dataSnapshot ?? data?.snapshot
  const sample = data?.sample ?? []

  if (!snapshot) {
    return (
      <div className={styles.panel}>
        <p className={styles.muted}>{isLoading ? 'Cargando datos…' : 'Sin datos para mostrar.'}</p>
      </div>
    )
  }

  const scoped = snapshot.scopeCategories && snapshot.scopeCategories.length > 0

  return (
    <div className={styles.panel}>
      {/* Alcance */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>Alcance</h4>
        <p className={styles.row}><span className={styles.k}>Período</span><span>{snapshot.periodLabel}</span></p>
        <div className={styles.row}>
          <span className={styles.k}>Categorías</span>
          {scoped ? (
            <span className={styles.chips}>
              {snapshot.scopeCategories!.map((c) => (
                <span key={c} className={styles.chip}>{c}</span>
              ))}
            </span>
          ) : (
            <span>Todas</span>
          )}
        </div>
      </section>

      {/* Base del cálculo */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>⚓ Base del cálculo</h4>
        {scoped ? (
          <p className={styles.row}>
            <span className={styles.k}>Total en scope</span>
            <span className={styles.strong}>{money(snapshot.scopedTotalUyu ?? 0, snapshot.scopedTotalUsd ?? 0)}</span>
          </p>
        ) : (
          <>
            <p className={styles.row}>
              <span className={styles.k}>Gasto variable</span>
              <span className={styles.strong}>{money(snapshot.variableUyu, snapshot.variableUsd)}</span>
            </p>
            <p className={styles.row}>
              <span className={styles.k}>Gasto fijo</span>
              <span>{money(snapshot.fixedUyu, snapshot.fixedUsd)}</span>
            </p>
          </>
        )}
        <p className={styles.hint}>Este total coincide con lo que ves en Métricas para el mismo alcance.</p>
      </section>

      {/* Categorías incluidas */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>📂 Categorías incluidas ({snapshot.byCategory.length})</h4>
        {snapshot.byCategory.length === 0 ? (
          <p className={styles.muted}>Sin categorías con gasto en el rango.</p>
        ) : (
          <ul className={styles.list}>
            {snapshot.byCategory.map((c) => (
              <li key={c.name} className={styles.line}>
                <span className={styles.lineName}>{c.name}</span>
                <span className={styles.lineVal}>{money(c.uyu, c.usd)} · {c.count} gastos</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recurrentes */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>🔁 Recurrentes incluidos ({snapshot.recurring.length})</h4>
        {snapshot.recurring.length === 0 ? (
          <p className={styles.muted}>—</p>
        ) : (
          <ul className={styles.list}>
            {snapshot.recurring.map((r) => (
              <li key={r.name} className={styles.line}>
                <span className={styles.lineName}>{r.name}</span>
                <span className={styles.lineVal}>{formatCurrency(r.amount, r.currency)} · {r.frequency}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Locales */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>📍 Locales incluidos ({snapshot.byPlace?.length ?? 0})</h4>
        {!snapshot.byPlace || snapshot.byPlace.length === 0 ? (
          <p className={styles.muted}>Sin gastos con local asignado en el rango.</p>
        ) : (
          <ul className={styles.list}>
            {snapshot.byPlace.map((p) => (
              <li key={p.name} className={styles.line}>
                <span className={styles.lineName}>{p.name}</span>
                <span className={styles.lineVal}>{money(p.uyu, p.usd)} · {p.count} visitas</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Categorías de producto */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>🏷️ Categorías de producto ({snapshot.byProductCategory?.length ?? 0})</h4>
        {!snapshot.byProductCategory || snapshot.byProductCategory.length === 0 ? (
          <p className={styles.muted}>Sin gasto por categoría de producto en el período.</p>
        ) : (
          <ul className={styles.list}>
            {snapshot.byProductCategory.map((pc) => (
              <li key={pc.name} className={styles.line}>
                <span className={styles.lineName}>{pc.name}</span>
                <span className={styles.lineVal}>{money(pc.uyu, pc.usd)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gastos / muestra */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>🧾 Gastos analizados</h4>
        <p className={styles.row}>
          <span className={styles.k}>En el rango</span>
          <span>{snapshot.expenseCountInRange} · se enviaron {snapshot.sampleSize} de muestra</span>
        </p>
        {sample.length > 0 && (
          <>
            <button type="button" className={styles.toggle} onClick={() => setShowSample((v) => !v)}>
              {showSample ? '▾' : '▸'} Ver muestra ({sample.length})
            </button>
            {showSample && (
              <ul className={styles.sampleList}>
                {sample.map((s, i) => (
                  <li key={i} className={styles.sampleItem}>
                    <span className={styles.sampleDate}>{formatDay(s.date)}</span>
                    <span className={styles.sampleAmt}>{formatCurrency(s.amount, s.currency)}</span>
                    <span className={styles.sampleDesc}>
                      {s.description}
                      {s.categories.length > 0 && <em className={styles.sampleCats}> · {s.categories.join(', ')}</em>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Transparencia */}
      <section className={styles.section}>
        <h4 className={styles.sTitle}>ℹ️ Cómo se consultan los datos</h4>
        <p className={styles.hint}>
          El modelo pide los datos que necesita mediante funciones: categorías de gasto, locales,
          categorías de producto, productos, líneas de ticket, totales exactos y ejemplos de gastos.
          Los montos totales los calcula nuestro código (coinciden con Métricas).
        </p>
      </section>
    </div>
  )
}
