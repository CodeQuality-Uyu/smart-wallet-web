// src/app/router/index.tsx

import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers/AuthContext'

function PrivateRoute(): React.ReactElement {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function PublicRoute(): React.ReactElement {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/home" replace /> : <Outlet />
}

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import('@/pages/HomePage'))
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'))
const ExpenseDetailPage = lazy(() => import('@/pages/ExpenseDetailPage'))
const NewExpensePage = lazy(() => import('@/pages/NewExpensePage'))
const EditExpensePage = lazy(() => import('@/pages/EditExpensePage'))
const MetricsPage = lazy(() => import('@/pages/MetricsPage'))
const RecurringPage = lazy(() => import('@/pages/RecurringPage'))
const RecurringDetailPage = lazy(() => import('@/pages/RecurringDetailPage'))
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'))
const PlacesPage = lazy(() => import('@/pages/PlacesPage'))
const CardsPage = lazy(() => import('@/pages/CardsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const SalariesPage = lazy(() => import('@/pages/SalariesPage'))
const BudgetSettingsPage = lazy(() => import('@/pages/BudgetSettingsPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const VerifyCodePage = lazy(() => import('@/pages/VerifyCodePage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const SuspenseWrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <Suspense fallback={<LoadingSpinner fullPage />}>{children}</Suspense>
)

const router = createBrowserRouter([
  // Auth routes (no app shell) — redirect to /home if already authenticated
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
          },
          {
            path: '/verify-code',
            element: <SuspenseWrapper><VerifyCodePage /></SuspenseWrapper>,
          },
        ],
      },
    ],
  },
  // App routes (with nav shell) — redirect to /login if not authenticated
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
      { index: true, element: <Navigate to="/home" replace /> },
      {
        path: '/home',
        element: <SuspenseWrapper><HomePage /></SuspenseWrapper>,
      },
      {
        path: '/expenses',
        element: <SuspenseWrapper><ExpensesPage /></SuspenseWrapper>,
      },
      {
        path: '/expenses/new',
        element: <SuspenseWrapper><NewExpensePage /></SuspenseWrapper>,
      },
      {
        path: '/expenses/:id',
        element: <SuspenseWrapper><ExpenseDetailPage /></SuspenseWrapper>,
      },
      {
        path: '/expenses/:id/edit',
        element: <SuspenseWrapper><EditExpensePage /></SuspenseWrapper>,
      },
      {
        path: '/metrics',
        element: <SuspenseWrapper><MetricsPage /></SuspenseWrapper>,
      },
      {
        path: '/settings/recurring',
        element: <SuspenseWrapper><RecurringPage /></SuspenseWrapper>,
      },
      {
        path: '/settings/recurring/:id',
        element: <SuspenseWrapper><RecurringDetailPage /></SuspenseWrapper>,
      },
      {
        path: '/settings/categories',
        element: <SuspenseWrapper><CategoriesPage /></SuspenseWrapper>,
      },
      {
        path: '/settings/places',
        element: <SuspenseWrapper><PlacesPage /></SuspenseWrapper>,
      },
      {
        path: '/settings/cards',
        element: <SuspenseWrapper><CardsPage /></SuspenseWrapper>,
      },
      {
        path: '/settings',
        element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper>,
      },
      {
        path: '/settings/budget',
        element: <SuspenseWrapper><BudgetSettingsPage /></SuspenseWrapper>,
      },
      {
        path: '/settings/salaries',
        element: <SuspenseWrapper><SalariesPage /></SuspenseWrapper>,
      },
        ],
      },
    ],
  },
  // Password reset — accessible without auth (Firebase sends oobCode here)
  {
    path: '/reset-password',
    element: <SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper>,
  },
  // 404
  {
    path: '*',
    element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper>,
  },
])

export function AppRouter(): React.ReactElement {
  return <RouterProvider router={router} />
}

/*
 * AWS CloudFront note:
 * This SPA uses HTML5 History API (createBrowserRouter).
 * For S3 + CloudFront deployment, configure a custom error response:
 *   - Error code: 403 / 404
 *   - Response page path: /index.html
 *   - HTTP response code: 200
 * This ensures deep-link refreshes are handled by the SPA router.
 */
