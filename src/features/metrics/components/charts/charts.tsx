// src/features/metrics/components/charts/charts.tsx
// Componentes de gráfico reutilizables basados en recharts, para Métricas y Resumen.
// Reemplazan las barras hechas con CSS (width: %). Siguen el patrón del dashboard
// (QueryWidgetView): ResponsiveContainer + tooltip custom + colores del design system.

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
  ReferenceLine,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts'
import { Currency } from '@/types/enums'
import { formatAmount, formatCurrency } from '@/utils/formatCurrency'
import styles from './charts.module.css'

const CUR_COLOR: Record<Currency, string> = {
  [Currency.UYU]: '#16a34a',
  [Currency.USD]: '#3b82f6',
}

// ─── Tooltip genérico monto ───────────────────────────────

function AmountTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: { value?: number; payload?: { name?: string } }[]
  label?: string
  currency: Currency
}): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const name = label ?? p?.payload?.name
  return (
    <div className={styles.tooltip}>
      {name ? <span className={styles.tooltipName}>{name}</span> : null}
      <span className={styles.tooltipVal}>{formatCurrency(p?.value ?? 0, currency)}</span>
    </div>
  )
}

// ─── Distribución (ranking) por categoría / producto / local ─

export interface DistributionRow {
  name: string
  uyu: number
  usd: number
  color?: string
}

function DistributionSingle({
  rows,
  currency,
}: {
  rows: DistributionRow[]
  currency: Currency
}): React.ReactElement | null {
  const data = rows
    .map((r) => ({ name: r.name, value: currency === Currency.USD ? r.usd : r.uyu, color: r.color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  return (
    <div className={styles.distBlock}>
      <span className={styles.distCur} style={{ color: CUR_COLOR[currency] }}>{currency}</span>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 52, left: 8 }} barCategoryGap="18%">
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 10, fill: '#4b5563' }}
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            height={56}
            tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip content={<AmountTooltip currency={currency} />} cursor={{ fill: 'rgba(0,0,0,.04)' }} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]} minPointSize={2} isAnimationActive={false}>
            <LabelList dataKey="value" content={(props) => renderTopValue(props, currency)} />
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? CUR_COLOR[currency]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Etiqueta de monto arriba de cada columna vertical.
function renderTopValue(props: unknown, currency: Currency): React.ReactElement {
  const p = props as { x?: number | string; y?: number | string; width?: number | string; value?: number | string }
  const x = Number(p.x ?? 0)
  const y = Number(p.y ?? 0)
  const width = Number(p.width ?? 0)
  const value = Number(p.value ?? 0)
  return (
    <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#6b7280">
      {formatAmount(value, currency)}
    </text>
  )
}

export function DistributionChart({
  rows,
  currencyFilter,
}: {
  rows: DistributionRow[]
  currencyFilter: Currency | ''
}): React.ReactElement {
  const currencies: Currency[] =
    currencyFilter === '' ? [Currency.UYU, Currency.USD] : [currencyFilter]
  // Emptiness must be computed from the data, not from the JSX elements (a
  // <DistributionSingle/> element is always truthy even when it renders null).
  const hasData = (cur: Currency): boolean =>
    rows.some((r) => (cur === Currency.USD ? r.usd : r.uyu) > 0)
  const withData = currencies.filter(hasData)

  if (withData.length === 0) {
    return <p className={styles.empty}>Sin gastos relacionados.</p>
  }
  return (
    <div className={styles.distWrap}>
      {withData.map((cur) => (
        <DistributionSingle key={cur} rows={rows} currency={cur} />
      ))}
    </div>
  )
}

// ─── Tendencia mensual (serie temporal) ───────────────────

export interface TrendPoint {
  label: string
  usd: number
  uyu: number
}

function TrendTooltip({
  active,
  payload,
  label,
  showUsd,
  showUyu,
}: {
  active?: boolean
  payload?: { dataKey?: string; value?: number }[]
  label?: string
  showUsd: boolean
  showUyu: boolean
}): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const uyu = payload.find((p) => p.dataKey === 'uyu')?.value ?? 0
  const usd = payload.find((p) => p.dataKey === 'usd')?.value ?? 0
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipName}>{label}</span>
      {showUyu && <span className={styles.tooltipVal} style={{ color: CUR_COLOR.UYU }}>{formatCurrency(uyu, Currency.UYU)}</span>}
      {showUsd && <span className={styles.tooltipVal} style={{ color: CUR_COLOR.USD }}>{formatCurrency(usd, Currency.USD)}</span>}
    </div>
  )
}

export function TrendChart({
  data,
  showUsd,
  showUyu,
  avgUsd,
  avgUyu,
}: {
  data: TrendPoint[]
  showUsd: boolean
  showUyu: boolean
  avgUsd: number
  avgUyu: number
}): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        {showUyu && <YAxis yAxisId="uyu" hide domain={[0, 'dataMax']} />}
        {showUsd && <YAxis yAxisId="usd" orientation="right" hide domain={[0, 'dataMax']} />}
        <Tooltip content={<TrendTooltip showUsd={showUsd} showUyu={showUyu} />} />
        {showUyu && avgUyu > 0 && (
          <ReferenceLine yAxisId="uyu" y={avgUyu} stroke={CUR_COLOR.UYU} strokeDasharray="4 4" strokeOpacity={0.5} />
        )}
        {showUyu && (
          <Line yAxisId="uyu" type="monotone" dataKey="uyu" stroke={CUR_COLOR.UYU} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        )}
        {showUsd && avgUsd > 0 && (
          <ReferenceLine yAxisId="usd" y={avgUsd} stroke={CUR_COLOR.USD} strokeDasharray="4 4" strokeOpacity={0.5} />
        )}
        {showUsd && (
          <Line yAxisId="usd" type="monotone" dataKey="usd" stroke={CUR_COLOR.USD} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Anillo de ahorro (radial) ────────────────────────────

export function SavingsRing({ rate }: { rate: number }): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, rate))
  const data = [{ name: 'ahorro', value: clamped, fill: 'url(#savingsGrad)' }]
  return (
    <div className={styles.ringWrap}>
      <ResponsiveContainer width="100%" height={150}>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <defs>
            <linearGradient id="savingsGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5b732" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(0,0,0,.07)' }} isAnimationActive={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className={styles.ringCenter}>
        <span className={styles.ringPct}>{rate}%</span>
        <span className={styles.ringLbl}>ahorrado</span>
      </div>
    </div>
  )
}

// ─── Fijos vs Variables (donut) ───────────────────────────

export function SplitDonut({
  fixed,
  variable,
  currency,
}: {
  fixed: number
  variable: number
  currency: Currency
}): React.ReactElement {
  const total = fixed + variable
  const pct = total > 0 ? Math.round((fixed / total) * 100) : 0
  const data = [{ name: 'x', fijos: fixed, variables: variable }]
  return (
    <div className={styles.splitWrap}>
      <ResponsiveContainer width="100%" height={54}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }} stackOffset="expand">
          <XAxis type="number" hide domain={[0, 1]} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className={styles.tooltip}>
                  <span className={styles.tooltipVal} style={{ color: '#7c3aed' }}>Fijos {formatCurrency(fixed, currency)}</span>
                  <span className={styles.tooltipVal}>Variables {formatCurrency(variable, currency)}</span>
                </div>
              ) : null
            }
          />
          <Bar dataKey="fijos" stackId="s" fill="#7c3aed" radius={[6, 0, 0, 6]} isAnimationActive={false} />
          <Bar dataKey="variables" stackId="s" fill="#9ca3af" radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <div className={styles.splitLegend}>
        <span className={styles.splitItem}><span className={styles.splitDot} style={{ background: '#7c3aed' }} />Fijos {pct}% · {formatAmount(fixed, currency)}</span>
        <span className={styles.splitItem}><span className={styles.splitDot} style={{ background: '#9ca3af' }} />Variables {100 - pct}% · {formatAmount(variable, currency)}</span>
      </div>
    </div>
  )
}

// ─── Barra de presupuesto ─────────────────────────────────

export function BudgetBar({
  spent,
  budget,
  currency,
}: {
  spent: number
  budget: number
  currency: Currency
}): React.ReactElement {
  const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0
  const color = pct >= 100 ? '#e11d48' : pct >= 80 ? '#f5b732' : '#22c55e'
  const data = [{ name: 'b', value: pct }]
  return (
    <div className={styles.budgetWrap}>
      <div className={styles.budgetHead}>
        <span className={styles.budgetLbl}>Presupuesto</span>
        <span className={styles.budgetPct}>{formatAmount(spent, currency)} / {formatAmount(budget, currency)} ({pct}%)</span>
      </div>
      <ResponsiveContainer width="100%" height={16}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis type="category" dataKey="name" hide />
          <Bar dataKey="value" fill={color} radius={[8, 8, 8, 8]} background={{ fill: 'rgba(0,0,0,.06)' }} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
