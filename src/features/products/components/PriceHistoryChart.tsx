// src/features/products/components/PriceHistoryChart.tsx
// SVG line chart — one line per place, X = recordedAt, Y = unitPrice.

import React, { useMemo } from 'react'
import type { ProductPriceRecord } from '@/types/models'
import styles from './PriceHistoryChart.module.css'

interface PriceHistoryChartProps {
  records: ProductPriceRecord[]
  /** Map of placeId → place name for the legend */
  placeNames: Record<string, string>
}

// Distinct palette for up to 8 places
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899']

const W = 400
const H = 180
const PAD = { top: 12, right: 16, bottom: 32, left: 44 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

function nice(v: number, round: (x: number) => number) {
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return round(v / mag) * mag
}

export function PriceHistoryChart({ records, placeNames }: PriceHistoryChartProps): React.ReactElement {
  const { byPlace, allTimes, minPrice, maxPrice, yTicks, xTicks } = useMemo(() => {
    if (records.length === 0) {
      return { byPlace: {}, allTimes: [], minPrice: 0, maxPrice: 0, yTicks: [], xTicks: [] }
    }

    // Group by place, sort each group by date
    const grouped: Record<string, ProductPriceRecord[]> = {}
    for (const r of records) {
      if (!grouped[r.placeId]) grouped[r.placeId] = []
      grouped[r.placeId]!.push(r)
    }
    for (const pid of Object.keys(grouped)) {
      grouped[pid]!.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    }

    const allTimes = [...new Set(records.map((r) => r.recordedAt))].sort()
    const prices = records.map((r) => r.unitPrice)
    const rawMin = Math.min(...prices)
    const rawMax = Math.max(...prices)
    const pad = (rawMax - rawMin) * 0.1 || rawMax * 0.1 || 1
    const minPrice = Math.max(0, rawMin - pad)
    const maxPrice = rawMax + pad

    // Y ticks (4–5 nice values)
    const range = maxPrice - minPrice
    const step = nice(range / 4, Math.ceil)
    const yTicks: number[] = []
    let t = nice(minPrice, Math.floor)
    while (t <= maxPrice + step * 0.1) {
      yTicks.push(t)
      t += step
    }

    // X ticks: show up to 5 evenly spaced dates
    const xCount = Math.min(allTimes.length, 5)
    const xStep = Math.max(1, Math.floor(allTimes.length / xCount))
    const xTicks = allTimes.filter((_, i) => i % xStep === 0 || i === allTimes.length - 1)

    return { byPlace: grouped, allTimes, minPrice, maxPrice, yTicks, xTicks }
  }, [records])

  if (records.length === 0) {
    return <p className={styles.empty}>Sin historial de precios.</p>
  }

  const placeIds = Object.keys(byPlace)

  function toX(dateStr: string) {
    const idx = allTimes.indexOf(dateStr)
    if (allTimes.length === 1) return PAD.left + INNER_W / 2
    return PAD.left + (idx / (allTimes.length - 1)) * INNER_W
  }

  function toY(price: number) {
    return PAD.top + INNER_H - ((price - minPrice) / (maxPrice - minPrice)) * INNER_H
  }

  function formatDate(d: string) {
    const dt = new Date(d)
    return `${dt.getDate()}/${dt.getMonth() + 1}`
  }

  function formatPrice(v: number) {
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
  }

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label="Historial de precios por local"
      >
        {/* Y grid lines + labels */}
        {yTicks.map((tick) => {
          const y = toY(tick)
          return (
            <g key={tick}>
              <line
                x1={PAD.left} y1={y}
                x2={PAD.left + INNER_W} y2={y}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 4} y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={9}
                fill="var(--muted)"
              >
                {formatPrice(tick)}
              </text>
            </g>
          )
        })}

        {/* X axis labels */}
        {xTicks.map((d) => (
          <text
            key={d}
            x={toX(d)} y={H - PAD.bottom + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted)"
          >
            {formatDate(d)}
          </text>
        ))}

        {/* X axis line */}
        <line
          x1={PAD.left} y1={PAD.top + INNER_H}
          x2={PAD.left + INNER_W} y2={PAD.top + INNER_H}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {/* Lines + dots per place */}
        {placeIds.map((placeId, colorIdx) => {
          const color = COLORS[colorIdx % COLORS.length]!
          const pts = byPlace[placeId]!

          const pathD = pts
            .map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(r.recordedAt)} ${toY(r.unitPrice)}`)
            .join(' ')

          return (
            <g key={placeId}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((r) => (
                <circle
                  key={r.id}
                  cx={toX(r.recordedAt)}
                  cy={toY(r.unitPrice)}
                  r={3.5}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={1.5}
                >
                  <title>{`${placeNames[placeId] ?? placeId}: ${r.unitPrice} ${r.currency}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      {placeIds.length > 1 && (
        <div className={styles.legend}>
          {placeIds.map((placeId, colorIdx) => (
            <span key={placeId} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: COLORS[colorIdx % COLORS.length] }}
              />
              {placeNames[placeId] ?? placeId}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
