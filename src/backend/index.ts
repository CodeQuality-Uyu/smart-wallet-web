// src/backend/index.ts
// Factory: returns the correct backend implementation based on VITE_BACKEND

import type { IAuthBackend, IBudgetBackend, ICardsBackend, ICategoriesBackend, IExpensesBackend, IMetricsBackend, IPlacesBackend, IRecurringBackend, ISalariesBackend } from './types'

type BackendType = 'msw' | 'firestore' | 'aws'

const backend = (import.meta.env.VITE_BACKEND ?? 'msw') as BackendType

// Lazy singletons — imported on first call to avoid bundling unused backends
let _authBackend: IAuthBackend | null = null
let _cardsBackend: ICardsBackend | null = null
let _categoriesBackend: ICategoriesBackend | null = null
let _expensesBackend: IExpensesBackend | null = null
let _metricsBackend: IMetricsBackend | null = null
let _placesBackend: IPlacesBackend | null = null
let _recurringBackend: IRecurringBackend | null = null
let _budgetBackend: IBudgetBackend | null = null
let _salariesBackend: ISalariesBackend | null = null

export async function getAuthBackend(): Promise<IAuthBackend> {
  if (_authBackend) return _authBackend
  if (backend === 'firestore') {
    const { firestoreAuthBackend } = await import('./firestore/auth')
    _authBackend = firestoreAuthBackend
  } else {
    // msw | aws fallback to MSW http adapter
    const { mswAuthBackend } = await import('./msw/auth')
    _authBackend = mswAuthBackend
  }
  return _authBackend
}

export async function getCardsBackend(): Promise<ICardsBackend> {
  if (_cardsBackend) return _cardsBackend
  if (backend === 'firestore') {
    const { firestoreCardsBackend } = await import('./firestore/cards')
    _cardsBackend = firestoreCardsBackend
  } else {
    const { mswCardsBackend } = await import('./msw/cards')
    _cardsBackend = mswCardsBackend
  }
  return _cardsBackend
}

export async function getCategoriesBackend(): Promise<ICategoriesBackend> {
  if (_categoriesBackend) return _categoriesBackend
  if (backend === 'firestore') {
    const { firestoreCategoriesBackend } = await import('./firestore/categories')
    _categoriesBackend = firestoreCategoriesBackend
  } else {
    const { mswCategoriesBackend } = await import('./msw/categories')
    _categoriesBackend = mswCategoriesBackend
  }
  return _categoriesBackend
}

export async function getExpensesBackend(): Promise<IExpensesBackend> {
  if (_expensesBackend) return _expensesBackend
  if (backend === 'firestore') {
    const { firestoreExpensesBackend } = await import('./firestore/expenses')
    _expensesBackend = firestoreExpensesBackend
  } else {
    const { mswExpensesBackend } = await import('./msw/expenses')
    _expensesBackend = mswExpensesBackend
  }
  return _expensesBackend
}

export async function getMetricsBackend(): Promise<IMetricsBackend> {
  if (_metricsBackend) return _metricsBackend
  if (backend === 'firestore') {
    const { firestoreMetricsBackend } = await import('./firestore/metrics')
    _metricsBackend = firestoreMetricsBackend
  } else {
    const { mswMetricsBackend } = await import('./msw/metrics')
    _metricsBackend = mswMetricsBackend
  }
  return _metricsBackend
}

export async function getPlacesBackend(): Promise<IPlacesBackend> {
  if (_placesBackend) return _placesBackend
  if (backend === 'firestore') {
    const { firestorePlacesBackend } = await import('./firestore/places')
    _placesBackend = firestorePlacesBackend
  } else {
    const { mswPlacesBackend } = await import('./msw/places')
    _placesBackend = mswPlacesBackend
  }
  return _placesBackend
}

export async function getRecurringBackend(): Promise<IRecurringBackend> {
  if (_recurringBackend) return _recurringBackend
  if (backend === 'firestore') {
    const { firestoreRecurringBackend } = await import('./firestore/recurring')
    _recurringBackend = firestoreRecurringBackend
  } else {
    const { mswRecurringBackend } = await import('./msw/recurring')
    _recurringBackend = mswRecurringBackend
  }
  return _recurringBackend
}

export async function getBudgetBackend(): Promise<IBudgetBackend> {
  if (_budgetBackend) return _budgetBackend
  if (backend === 'firestore') {
    const { firestoreBudgetBackend } = await import('./firestore/budget')
    _budgetBackend = firestoreBudgetBackend
  } else {
    const { mswBudgetBackend } = await import('./msw/budget')
    _budgetBackend = mswBudgetBackend
  }
  return _budgetBackend
}

export async function getSalariesBackend(): Promise<ISalariesBackend> {
  if (_salariesBackend) return _salariesBackend
  if (backend === 'firestore') {
    const { firestoreSalariesBackend } = await import('./firestore/salaries')
    _salariesBackend = firestoreSalariesBackend
  } else {
    const { mswSalariesBackend } = await import('./msw/salaries')
    _salariesBackend = mswSalariesBackend
  }
  return _salariesBackend
}

export { backend as activeBackend }
