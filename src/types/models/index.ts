// src/types/models/index.ts

import {
  Currency,
  CardType,
  RecurringMode,
  RecurringFrequency,
  RecurringStatus,
  RecurringPaymentStatus,
  ProductPricingType,
  WeightUnit,
  NotificationType,
  SavingsGoalStatus,
  StatementImportAction,
  ReceiptStatus,
  WidgetEngine,
  WidgetSize,
  GuidedSource,
  GuidedPrimaryDisplay,
  WidgetComparisonType,
  WidgetComparisonRender,
  QueryGroupBy,
  QueryAggregate,
  QueryDisplay,
  RecorteOutputFormat,
  RecorteBadgeLevel,
  PeriodFilter,
} from '@/types/enums'

// ─── Shared ───────────────────────────────────────────────

export interface Timestamps {
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ─── Category ─────────────────────────────────────────────

export interface Category extends Timestamps {
  id: string
  name: string
  icon: string
  color?: string
  active: boolean
  limitUYU?: number
  limitUSD?: number
  /** ID de la categoría padre. Ausente/undefined = categoría raíz. Jerarquía de 2 niveles. */
  parentId?: string
}

export type CreateCategoryPayload = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateCategoryPayload = Partial<CreateCategoryPayload>

// ─── Place / Locale ────────────────────────────────────────

export interface GlobalPlace {
  id: string
  name: string
  address?: string
  icon?: string
  nameLower: string
  createdAt: string
}

export interface Place extends Timestamps {
  id: string
  name: string
  address?: string
  icon?: string
  visitCount: number
  active: boolean
  globalPlaceId?: string
}

export interface CreatePlacePayload {
  name: string
  address?: string
  icon?: string
  globalPlaceId?: string
}
export type UpdatePlacePayload = Partial<Pick<Place, 'name' | 'address' | 'icon'>>

// ─── Card / Payment method ────────────────────────────────

export interface Card extends Timestamps {
  id: string
  name: string
  type: CardType
  bank: string
  lastFour?: string
  color?: string
  active?: boolean
}

export type CreateCardPayload = Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'active'>

// ─── Expense ──────────────────────────────────────────────

export interface TicketLine {
  id: string
  name: string
  amount: number
  productId?: string
}

export interface Expense extends Timestamps {
  id: string
  description: string
  amount: number
  currency: Currency
  cardId: string
  categoryIds: string[]
  placeId?: string
  date: string
  receiptUrl?: string
  ticketLines: TicketLine[]
  importedFrom?: 'statement' | 'gmail'
  statementAttachmentId?: string
  /** Id del mail de origen cuando importedFrom === 'gmail' (trazabilidad + anti-duplicado). */
  gmailMessageId?: string
}

export type CreateExpensePayload = Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'ticketLines'> & {
  // Líneas iniciales del ticket (sin id); el backend genera el id de cada una.
  ticketLines?: Omit<TicketLine, 'id'>[]
}
export type UpdateExpensePayload = Partial<CreateExpensePayload>

export interface ExpenseFilters {
  period?: string
  categoryIds?: string[]
  currency?: Currency
  cardId?: string
  placeId?: string
  search?: string
  groupBy?: 'day' | 'week' | 'place' | 'category'
}

// ─── Recurring expense ────────────────────────────────────

export interface RecurringPaymentHistory {
  id: string
  month: number
  year: number
  amount: number
  currency: Currency
  paidAt?: string
  receiptUrl?: string
  status: RecurringPaymentStatus
}

export interface RecurringExpense extends Timestamps {
  id: string
  name: string
  icon: string
  description?: string
  amount: number
  currency: Currency
  categoryIds: string[]
  cardId: string
  mode: RecurringMode
  frequency: RecurringFrequency
  status: RecurringStatus
  dueDayOfMonth?: number // only for manual
  // Anchor of the payment cycle for interval frequencies (bimonthly, quarterly…).
  // Defaults to the createdAt month/year when absent. Irrelevant for monthly.
  startMonth?: number // 1-12
  startYear?: number
  paymentHistory: RecurringPaymentHistory[]
  currentMonthStatus?: RecurringPaymentStatus
}

export type CreateRecurringPayload = Omit<
  RecurringExpense,
  'id' | 'createdAt' | 'updatedAt' | 'paymentHistory' | 'currentMonthStatus'
>
export type UpdateRecurringPayload = Partial<CreateRecurringPayload>

export interface ConfirmRecurringPaymentPayload {
  amount: number
  receiptFile?: File
  month?: number
  year?: number
}

export interface UpdateRecurringPaymentPayload {
  amount: number
  paidAt?: string
}

export interface SkipRecurringMonthPayload {
  month: number
  year: number
}

// ─── Metrics ──────────────────────────────────────────────

export interface MonthlySpend {
  month: number
  year: number
  label: string
  usd: number
  uyu: number
  fixedUsd: number
  fixedUyu: number
  variableUsd: number
  variableUyu: number
}

export interface CategorySpend {
  categoryId: string
  categoryName: string
  categoryIcon: string
  usd: number
  uyu: number
  /** Total de gastos (ambas monedas). Para conteo por moneda usar los campos de abajo. */
  expenseCount: number
  /** Cantidad de gastos en USD (para análisis por moneda, ej. gasto hormiga). */
  expenseCountUsd: number
  /** Cantidad de gastos en UYU. */
  expenseCountUyu: number
  /**
   * ID de la categoría padre (undefined = raíz). Presente desde la jerarquía de categorías.
   * Los totales de una categoría padre incluyen el gasto de sus hijas (rollup con dedupe).
   */
  parentId?: string
}

export interface FixedExpenseBreakdown {
  recurringId: string
  name: string
  icon: string
  mode: RecurringMode
  amount: number
  currency: Currency
  frequency: RecurringFrequency
}

export interface ProductCategorySpend {
  productCategoryId: string
  productCategoryName: string
  productCategoryIcon: string
  usd: number
  uyu: number
}

export interface MetricsSummary {
  period: string
  totalUsd: number
  totalUyu: number
  previousPeriodUsd: number
  previousPeriodUyu: number
  variableUsd: number
  variableUyu: number
  fixedUsd: number
  fixedUyu: number
  monthlyHistory: MonthlySpend[]
  byCategory: CategorySpend[]
  previousByCategory: CategorySpend[]
  fixedBreakdown: FixedExpenseBreakdown[]
  byProductCategory: ProductCategorySpend[]
}

// ─── Budget ───────────────────────────────────────────────

export interface BudgetSettings {
  usd?: number
  uyu?: number
}

// ─── Month closings ───────────────────────────────────────

export interface MonthClosingRecurring {
  recurringId: string
  name: string
  icon: string
  amount: number
  currency: Currency
  mode: RecurringMode
  frequency: RecurringFrequency
}

export interface MonthClosingCategory {
  categoryId: string
  categoryName: string
  categoryIcon: string
  usd: number
  uyu: number
}

export interface MonthClosing {
  id: string // "{year}-{month:02d}" e.g. "2026-03"
  year: number
  month: number
  closedAt: string
  totalUsd: number
  totalUyu: number
  variableUsd: number
  variableUyu: number
  fixedUsd: number
  fixedUyu: number
  recurringPaid: MonthClosingRecurring[]
  topCategories: MonthClosingCategory[]
}

export type CreateMonthClosingPayload = Omit<MonthClosing, 'closedAt'>

// ─── Product catalog ──────────────────────────────────────

export interface ProductCategory extends Timestamps {
  id: string
  name: string
  icon: string
  color?: string
}

export type CreateProductCategoryPayload = Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProductCategoryPayload = Partial<CreateProductCategoryPayload>

export interface Brand extends Timestamps {
  id: string
  name: string
}

export type CreateBrandPayload = Pick<Brand, 'name'>
export type UpdateBrandPayload = Partial<CreateBrandPayload>

// Global pool: /products/{id} — community data, no categoryId
export interface GlobalProduct {
  id: string
  name: string
  nameLower: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  brandId?: string
  // Denormalized last price info (updated on each addPriceRecord)
  lastPlaceId?: string
  lastUnitPrice?: number
  lastCurrency?: Currency
  lastRecordedAt?: string
  createdAt: string
}

// Suggestion returned by searchGlobal
export interface GlobalProductSuggestion {
  id: string
  name: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  brandId?: string
  brandName?: string
  lastPlaceId?: string
  lastPlaceName?: string
  lastUnitPrice?: number
  lastCurrency?: Currency
  lastRecordedAt?: string
}

// User copy: users/{uid}/products/{id} — personal, links to global via globalProductId
export interface Product extends Timestamps {
  id: string
  name: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  productCategoryId: string
  brandId?: string
  globalProductId: string
  active: boolean
}

export interface CreateProductPayload {
  name: string
  pricingType: ProductPricingType
  weightUnit?: WeightUnit
  productCategoryId: string
  brandId?: string
  globalProductId?: string // if set, links to existing global product (no new global created)
}
export type UpdateProductPayload = Partial<Omit<CreateProductPayload, 'globalProductId'>>

export interface ProductPriceRecord {
  id: string
  productId: string
  placeId: string
  unitPrice: number
  currency: Currency
  recordedAt: string
  expenseId?: string
  lineItemId?: string
  createdAt: string
}

export type CreateProductPriceRecordPayload = Omit<ProductPriceRecord, 'id' | 'createdAt'>

// ─── Savings Goals ───────────────────────────────────

export interface SavingsGoal extends Timestamps {
  id: string
  name: string
  icon: string
  targetAmount: number
  savedAmount: number
  currency: Currency
  targetDate: string
  status: SavingsGoalStatus
  active: boolean
}

export type CreateSavingsGoalPayload = Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'savedAmount' | 'status'>
export type UpdateSavingsGoalPayload = Partial<Omit<CreateSavingsGoalPayload, 'active'>>

// ─── Month analysis ───────────────────────────────────────

export interface MonthAnalysisInsight {
  category: string
  insight: string
}

export interface MonthAnalysisAxis {
  insights: MonthAnalysisInsight[]
  note: string  // shown when insights is empty
}

export interface MonthAnalysis {
  yearMonth: string   // "2026-04"
  generatedAt: string
  summary: string
  unnecessary: MonthAnalysisAxis
  reducible: MonthAnalysisAxis
  preventable: string
}

// ─── Recortes (indicadores de recorte dinámicos) ──────────
// Un "recorte" es un indicador definido por el usuario a partir de un prompt.
// Reemplaza progresivamente las heurísticas hardcodeadas de savingsSuggestions.ts:
// el prompt + el rango temporal describen qué mirar, y Gemini produce el resultado
// según el formato de salida elegido. Definición y resultados se persisten.

export interface RecorteResultItem {
  label: string
  detail?: string
  /** Monto asociado al ítem, ya en la moneda de `currency`. Opcional. */
  amount?: number
  currency?: Currency
}

export interface RecorteBadge {
  level: RecorteBadgeLevel
  label: string
}

// ─── Datos analizados (auditoría) ─────────────────────────
// Snapshot compacto de los AGREGADOS que se le pasaron a Gemini para producir un
// resultado. Permite corroborar el número contra los datos. La muestra de gastos
// individual NO se persiste (se reconstruye al abrir el panel).

export interface RecorteSnapshotCategory {
  name: string
  uyu: number
  usd: number
  count: number
}

export interface RecorteSnapshotRecurring {
  name: string
  amount: number
  currency: Currency
  frequency: RecurringFrequency
}

export interface RecorteSnapshotPlace {
  name: string
  uyu: number
  usd: number
  /** Cantidad de gastos (visitas) en el local dentro del rango. */
  count: number
}

export interface RecorteSnapshotProductCategory {
  name: string
  uyu: number
  usd: number
}

export interface RecorteDataSnapshot {
  periodLabel: string
  /** Nombres de las categorías a las que se acotó (ausente = todas). */
  scopeCategories?: string[]
  /** Total exacto en las categorías del scope — es el que ancla el monto. */
  scopedTotalUyu?: number
  scopedTotalUsd?: number
  variableUyu: number
  variableUsd: number
  fixedUyu: number
  fixedUsd: number
  previousVariableUyu: number
  previousVariableUsd: number
  byCategory: RecorteSnapshotCategory[]
  recurring: RecorteSnapshotRecurring[]
  /** Gasto por local (locales) en el rango, para recortes sobre lugares. */
  byPlace: RecorteSnapshotPlace[]
  /** Gasto por categoría de producto en el período (desde ticket lines). */
  byProductCategory: RecorteSnapshotProductCategory[]
  /** Cantidad total de gastos en el rango y cuántos se enviaron como muestra. */
  expenseCountInRange: number
  sampleSize: number
}

/** Un cálculo puntual de un recorte. Los campos usados dependen del outputFormat. */
export interface RecorteResult {
  id: string
  generatedAt: string
  /** Etiqueta legible del rango efectivo usado (ej. "Últimos 3 meses" / "Desde 2026-01-01"). */
  periodLabel: string
  // amount
  amount?: number
  currency?: Currency
  // text
  text?: string
  // list
  items?: RecorteResultItem[]
  // badge
  badge?: RecorteBadge
  /** Agregados que alimentaron este cálculo (para el panel "Ver datos"). */
  dataSnapshot?: RecorteDataSnapshot
}

export interface Recorte extends Timestamps {
  id: string
  name: string
  description: string
  /** Prompt original escrito por el usuario; se reutiliza en cada recálculo. */
  prompt: string
  icon: string
  color: string
  outputFormat: RecorteOutputFormat
  /** Preset de rango temporal (fuente de los gastos a analizar). */
  period: PeriodFilter
  /** Fecha de inicio custom (ISO "YYYY-MM-DD"). Si está, acota el rango además del preset. */
  sinceDate?: string
  /**
   * Categorías a las que se acota el análisis. Vacío/ausente = todas las categorías.
   * Al acotar, el total exacto se calcula desde los agregados (coincide con Métricas).
   */
  categoryIds?: string[]
  active: boolean
  /** Último resultado calculado, denormalizado para el feed. El historial vive en subcolección. */
  lastResult?: RecorteResult
}

export type CreateRecortePayload = Omit<
  Recorte,
  'id' | 'createdAt' | 'updatedAt' | 'active' | 'lastResult'
>
export type UpdateRecortePayload = Partial<CreateRecortePayload>

// ─── User preferences ─────────────────────────────────────

export interface UserPrefs {
  defaultCardId?: string
}

// ─── Integraciones ────────────────────────────────────────

/**
 * Configuración de la integración con Gmail. Se persiste por usuario en
 * Firestore para que la vinculación y sus ajustes sigan al usuario entre
 * dispositivos. El access token de Gmail NO se guarda acá (vive solo en memoria).
 */
export interface GmailIntegration {
  /** El usuario autorizó su cuenta de Google al menos una vez (persiste cross-device). */
  linked: boolean
  /** Remitentes de avisos de compra a buscar, ej. "notificaciones@banco.com.uy". */
  senders: string[]
  /** Etiquetas de Gmail donde también buscar (ej. "Banco"). Se unen a los remitentes (OR). */
  labels: string[]
  /** ISO de la última sincronización exitosa; null si nunca se sincronizó. */
  lastSyncAt: string | null
}

/** Etiqueta de Gmail (para el selector de dónde buscar). */
export interface GmailLabel {
  id: string
  name: string
}

/** Mail crudo traído de Gmail, antes de parsearlo a un gasto candidato. */
export interface GmailRawMessage {
  id: string
  /** Header "From" completo, ej. "Santander <avisos@santander.com.uy>". */
  from: string
  subject: string
  /** Header "Date" crudo (RFC 2822); se normaliza al parsear. */
  date: string
  /** Resumen corto que provee Gmail. */
  snippet: string
  /** Cuerpo del mail ya decodificado a texto plano. */
  body: string
}

/**
 * Gasto candidato extraído de un mail por Gemini. Comparte forma con StatementLine
 * (para reutilizar la tabla de revisión y detectDuplicates) más el id del mail de
 * origen, que sirve para no reprocesar y para trazabilidad.
 */
export interface GmailParsedLine extends StatementLine {
  gmailMessageId: string
  /** Header "From" del mail de origen; sirve para priorizar ante duplicados en lote. */
  from: string
}

/** Gasto candidato guardado en la cola de pendientes (parseado, sin confirmar aún). */
export interface GmailPendingItem extends GmailParsedLine {
  /** ISO de cuándo se agregó a la cola. */
  addedAt: string
}

/**
 * Estado persistido del import de Gmail:
 * - `pending`: candidatos parseados que esperan revisión (reaparecen en cada sync).
 * - `seenIds`: ids de mails ya procesados (confirmados, descartados o pendientes)
 *   para no reprocesarlos. Incluye también los mails que no eran transacciones.
 */
export interface GmailQueue {
  pending: GmailPendingItem[]
  seenIds: string[]
}

// ─── Auth / User ──────────────────────────────────────────

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface Income {
  id: string
  name: string
  amount: number
  currency: Currency
}

// ─── Notifications ────────────────────────────────────────

export interface Notification {
  id: string
  title: string
  body: string
  type: NotificationType
  read: boolean
  createdAt: string
}

export interface NotificationAlertPrefs {
  expenses: boolean
  budgetLimit: boolean
  income: boolean
  weeklySummary: boolean
  recurring: boolean
}

export interface NotificationChannelPrefs {
  push: boolean
  email: boolean
  whatsapp: boolean
}

export interface NotificationQuietHours {
  enabled: boolean
  from: string
  to: string
}

export interface NotificationPrefs {
  alerts: NotificationAlertPrefs
  channels: NotificationChannelPrefs
  quietHours: NotificationQuietHours
}

// ─── Report attachments ───────────────────────────────────

export interface ReportAttachment {
  id: string
  yearMonth: string   // "2026-04"
  name: string        // original filename
  url: string         // download URL
  mimeType: string
  size: number        // bytes
  uploadedAt: string
  processed: boolean
  processedAt?: string
  importedExpenseCount?: number
  cardId?: string
  pendingLines?: StatementImportRow[]  // líneas extraídas por IA, pendientes de aprobación
  pendingLinesAt?: string              // cuándo se procesó y guardaron las líneas pendientes
}

// ─── Pending receipts ─────────────────────────────────────

export interface PendingReceiptExtractedData {
  description?: string
  amount?: number
  currency?: Currency
  date?: string
  placeId?: string
  categoryIds?: string[]
  suggestedPlaceName?: string    // name returned by Gemini if no placeId match
  suggestedCategoryNames?: string[] // names returned by Gemini if no categoryIds match
  lines?: { name: string; amount: number }[] // ítems del ticket extraídos por la IA
  confidence?: 'high' | 'low' | 'failed'
}

export interface PendingReceipt extends Timestamps {
  id: string
  imageUrl: string
  status: ReceiptStatus
  extractedData?: PendingReceiptExtractedData
  createdExpenseId?: string
}

export type CreatePendingReceiptPayload = Pick<PendingReceipt, 'imageUrl'>
export type UpdatePendingReceiptPayload = Partial<Pick<PendingReceipt, 'status' | 'extractedData' | 'createdExpenseId'>>

// ─── Statement import ─────────────────────────────────────

export interface StatementLine {
  date: string           // "2026-04-15"
  description: string    // raw bank text
  amount: number
  currency: Currency
  suggestedCategoryName?: string
}

export interface StatementImportRow extends StatementLine {
  rowId: string
  action: StatementImportAction
  categoryId?: string
  placeId?: string
  cardId?: string
  notes?: string
  matchedExpenseId?: string
  matchScore?: number
  imported?: boolean   // ya se creó el gasto para esta línea (no re-importar)
  /** Otra fila del mismo lote parece el mismo gasto (mismo monto+moneda+fecha). */
  batchDuplicate?: boolean
}

// ─── Dashboard widgets (visualizadores del inicio) ────────
// Widgets componibles que el usuario ancla debajo de los totales por moneda.
// Dos motores: GUIADO (derivado de MetricsSummary, catálogo cerrado) y QUERY
// (motor libre sobre gastos, fase 2). Nunca se persiste el valor calculado,
// solo la configuración de qué mostrar.

/** Qué medir dentro de un bloque guiado (data source + filtros). */
export interface WidgetMetricSpec {
  source: GuidedSource
  /** Requerida para todos los sources salvo RecurringTotal (sale del recurrente). */
  currency?: Currency
  /** Requerida para CategorySpent. */
  categoryId?: string
  /** Requerido para RecurringTotal. */
  recurringId?: string
}

/** Una anotación de comparación bajo el valor de un bloque. */
export interface WidgetComparison {
  type: WidgetComparisonType
  render: WidgetComparisonRender
  /** Valor de referencia para type = Target. */
  targetValue?: number
}

/** Un "algo adentro" del widget: un valor + sus comparaciones. */
export interface GuidedBlock {
  id: string
  label?: string
  icon?: string
  metric: WidgetMetricSpec
  primaryDisplay: GuidedPrimaryDisplay
  comparisons: WidgetComparison[]
}

export interface GuidedConfig {
  period: PeriodFilter
  blocks: GuidedBlock[]
}

// ── Motor QUERY (flexible sobre gastos) ───────────────────

/** Fuente de datos del motor query. */
export type QuerySource = 'expenses' | 'recurring'

/** Filtros AND-combinados. */
export interface QueryFilters {
  categoryIds?: string[]
  cardId?: string
  placeId?: string
  search?: string
  amountMin?: number
  amountMax?: number
  /** Solo para source = 'recurring': limita a un pago recurrente puntual. */
  recurringId?: string
}

export interface QueryConfig {
  source: QuerySource
  currency: Currency
  period: PeriodFilter
  filters: QueryFilters
  groupBy: QueryGroupBy
  aggregate: QueryAggregate
  /** Solo Target en fase 2 (previous_period queda para después). */
  comparison?: WidgetComparison
  display: QueryDisplay
}

export interface DashboardWidget {
  id: string
  title: string
  icon?: string
  color?: string
  size: WidgetSize
  engine: WidgetEngine
  /** Presente cuando engine === Guided. */
  guided?: GuidedConfig
  /** Presente cuando engine === Query. */
  query?: QueryConfig
  /** Orden en la grilla; menor = primero. */
  position: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateDashboardWidgetPayload {
  title: string
  icon?: string
  color?: string
  size: WidgetSize
  engine: WidgetEngine
  guided?: GuidedConfig
  query?: QueryConfig
  position?: number
}

export interface UpdateDashboardWidgetPayload {
  title?: string
  icon?: string
  color?: string
  size?: WidgetSize
  position?: number
  guided?: GuidedConfig
  query?: QueryConfig
}
