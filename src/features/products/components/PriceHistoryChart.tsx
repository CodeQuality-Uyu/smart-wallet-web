// src/features/products/components/PriceHistoryChart.tsx
// SVG line chart — one line per place, X = recordedAt, Y = unitPrice.

import React, { useMemo } from 'react'
import type { ProductPriceRecord } from '@/types/models'
import styles from './PriceHistoryChart.module.css'

export const PLACE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899']

interface PriceHistoryChartProps {
  records: ProductPriceRecord[]
  /** Map of placeId → place name for the legend */
  placeNames: Record<string, string>
  /** Hide the built-in legend (use when rendering legend externally) */
  hideLegend?: boolean
}

// Distinct palette for up to 8 places (exported so page can replicate color mapping)
const COLORS = PLACE_COLORS

const W = 400
const H = 140
// X-axis sits at 75% of SVG height — data above, date labels below, minimal dead space.
const X_AXIS_Y = Math.round(H * 0.75)  // ≈ 105
const DATE_LABEL_Y = X_AXIS_Y + 12
const PAD = { top: 16, right: 16, left: 44 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = X_AXIS_Y - PAD.top  // data area height above the axis

// Number of empty padding slots to add before first and after last date
const DATE_PAD = 1

function nice(v: number, round: (x: number) => number) {
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return round(v / mag) * mag
}

/** Add `n` days to a YYYY-MM-DD string */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]!
}

function formatDate(d: string) {
  const dt = new Date(d + 'T12:00:00Z')
  return `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`
}

function formatPrice(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
}

export function PriceHistoryChart({ records, placeNames, hideLegend = false }: PriceHistoryChartProps): React.ReactElement {
  const { byPlace, fullTimeline, dataStart, dataEnd, minPrice, maxPrice, yTicks, xTicksToShow } = useMemo(() => {
    if (records.length === 0) {
      return { byPlace: {}, fullTimeline: [], dataStart: '', dataEnd: '', minPrice: 0, maxPrice: 0, yTicks: [], xTicksToShow: [] }
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

    const dataDates = [...new Set(records.map((r) => r.recordedAt))].sort()
    const dataStart = dataDates[0]!
    const dataEnd   = dataDates[dataDates.length - 1]!

    // Build full timeline: 2 padding slots before and after
    const paddingBefore: string[] = []
    for (let i = DATE_PAD; i >= 1; i--) paddingBefore.push(addDays(dataStart, -i))
    const paddingAfter: string[] = []
    for (let i = 1; i <= DATE_PAD; i++) paddingAfter.push(addDays(dataEnd, i))

    const fullTimeline = [...paddingBefore, ...dataDates, ...paddingAfter]

    // Y range from real prices
    const prices = records.map((r) => r.unitPrice)
    const rawMin = Math.min(...prices)
    const rawMax = Math.max(...prices)

    // One extra Y tick below min and above max
    const dataRange = rawMax - rawMin || rawMax * 0.2 || 10
    const yStep = nice(dataRange / 3, Math.ceil) || 1
    const yTicks: number[] = []
    const yBase = Math.floor(rawMin / yStep) * yStep
    for (let v = yBase - yStep; v <= rawMax + yStep + yStep * 0.1; v += yStep) {
      yTicks.push(Math.round(v))
    }
    const minPrice = yTicks[0]!
    const maxPrice = yTicks[yTicks.length - 1]!

    // X ticks: show the 1 padding date + up to 3 from data dates + 1 padding after
    const midDataTicks: string[] = []
    if (dataDates.length <= 3) {
      midDataTicks.push(...dataDates)
    } else {
      midDataTicks.push(dataDates[0]!)
      const mid = Math.floor(dataDates.length / 2)
      midDataTicks.push(dataDates[mid]!)
      midDataTicks.push(dataDates[dataDates.length - 1]!)
    }
    const xTicksToShow = [...paddingBefore, ...midDataTicks, ...paddingAfter]

    return { byPlace: grouped, fullTimeline, dataStart, dataEnd, minPrice, maxPrice, yTicks, xTicksToShow }
  }, [records])

  if (records.length === 0) {
    return <p className={styles.empty}>Sin historial de precios.</p>
  }

  if (records.length < 2) {
    const r = records[0]!
    const dt = new Date(r.recordedAt + 'T12:00:00Z')
    const dateStr = `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`
    return (
      <p className={styles.empty}>
        Solo hay 1 registro ({dateStr}: {r.unitPrice} {r.currency}). Agregá más precios para ver la evolución.
      </p>
    )
  }

  const placeIds = Object.keys(byPlace)
  const totalSlots = fullTimeline.length

  function toX(dateStr: string) {
    const idx = fullTimeline.indexOf(dateStr)
    if (totalSlots <= 1) return PAD.left + INNER_W / 2
    return PAD.left + (idx / (totalSlots - 1)) * INNER_W
  }

  function toY(price: number) {
    if (maxPrice === minPrice) return X_AXIS_Y - INNER_H / 2
    return X_AXIS_Y - ((price - minPrice) / (maxPrice - minPrice)) * INNER_H
  }

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label="Historial de precios por local"
      >
        {/* X axis line — rendered FIRST so it sits behind everything */}
        <line
          x1={PAD.left} y1={X_AXIS_Y}
          x2={PAD.left + INNER_W} y2={X_AXIS_Y}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {/* X axis date labels (padding + data ticks) */}
        {xTicksToShow.map((d) => {
          const x = toX(d)
          const isFirst = d === fullTimeline[0]
          const isLast  = d === fullTimeline[fullTimeline.length - 1]
          const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
          const isPadding = d < dataStart || d > dataEnd
          return (
            <text
              key={d}
              x={x} y={DATE_LABEL_Y}
              textAnchor={anchor}
              fontSize={9}
              fill={isPadding ? 'var(--border)' : 'var(--muted)'}
            >
              {formatDate(d)}
            </text>
          )
        })}

        {/* Y grid lines + labels */}
        {yTicks.map((tick) => {
          const y = toY(tick)
          if (y < PAD.top - 2 || y > X_AXIS_Y + 2) return null
          const isExtra = tick < Math.min(...records.map(r => r.unitPrice)) || tick > Math.max(...records.map(r => r.unitPrice))
          return (
            <g key={tick}>
              <line
                x1={PAD.left} y1={y}
                x2={PAD.left + INNER_W} y2={y}
                stroke="var(--border)"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 4} y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={9}
                fill={isExtra ? 'var(--border)' : 'var(--muted)'}
              >
                {formatPrice(tick)}
              </text>
            </g>
          )
        })}

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
      {!hideLegend && placeIds.length > 1 && (
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
