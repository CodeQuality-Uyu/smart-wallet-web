// src/app/router/index.tsx

import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { SettingsLayout } from '@/layouts/SettingsLayout'
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
const HomePage = lazy(() => import('@/pages/HomePage/HomePage'))
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage/ExpensesPage'))
const ExpenseDetailPage = lazy(() => import('@/pages/ExpenseDetailPage/ExpenseDetailPage'))
const NewExpensePage = lazy(() => import('@/pages/NewExpensePage/NewExpensePage'))
const EditExpensePage = lazy(() => import('@/pages/EditExpensePage/EditExpensePage'))
const MetricsPage = lazy(() => import('@/pages/MetricsPage/MetricsPage'))
const RecurringPage = lazy(() => import('@/pages/RecurringPage/RecurringPage'))
const RecurringDetailPage = lazy(() => import('@/pages/RecurringDetailPage/RecurringDetailPage'))
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage/CategoriesPage'))
const PlacesPage = lazy(() => import('@/pages/PlacesPage/PlacesPage'))
const CardsPage = lazy(() => import('@/pages/CardsPage/CardsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage/SettingsPage'))
const BudgetSettingsPage = lazy(() => import('@/pages/BudgetSettingsPage/BudgetSettingsPage'))
const MonthClosingPage = lazy(() => import('@/pages/MonthClosingPage/MonthClosingPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage/ReportsPage'))
const CategoryPickerPage = lazy(() => import('@/pages/CategoryPickerPage/CategoryPickerPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage/LoginPage'))
const VerifyCodePage = lazy(() => import('@/pages/VerifyCodePage/VerifyCodePage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage/ResetPasswordPage'))
const ProductCategoriesPage = lazy(() => import('@/pages/ProductCategoriesPage/ProductCategoriesPage'))
const ProductsPage = lazy(() => import('@/pages/ProductsPage/ProductsPage'))
const NewProductPage = lazy(() => import('@/pages/NewProductPage/NewProductPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage/ProductDetailPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage/ProfilePage'))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage/NotificationsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage/NotFoundPage'))

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
        path: '/expenses/categories',
        element: <SuspenseWrapper><CategoryPickerPage /></SuspenseWrapper>,
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
        path: '/settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper> },
          { path: 'recurring', element: <SuspenseWrapper><RecurringPage /></SuspenseWrapper> },
          { path: 'recurring/:id', element: <SuspenseWrapper><RecurringDetailPage /></SuspenseWrapper> },
          { path: 'categories', element: <SuspenseWrapper><CategoriesPage /></SuspenseWrapper> },
          { path: 'places', element: <SuspenseWrapper><PlacesPage /></SuspenseWrapper> },
          { path: 'cards', element: <SuspenseWrapper><CardsPage /></SuspenseWrapper> },
          { path: 'budget', element: <SuspenseWrapper><BudgetSettingsPage /></SuspenseWrapper> },
          { path: 'reports', element: <SuspenseWrapper><ReportsPage /></SuspenseWrapper> },
          { path: 'reports/:yearMonth', element: <SuspenseWrapper><MonthClosingPage /></SuspenseWrapper> },
          { path: 'product-categories', element: <SuspenseWrapper><ProductCategoriesPage /></SuspenseWrapper> },
          { path: 'products', element: <SuspenseWrapper><ProductsPage /></SuspenseWrapper> },
          { path: 'products/new', element: <SuspenseWrapper><NewProductPage /></SuspenseWrapper> },
          { path: 'products/:id', element: <SuspenseWrapper><ProductDetailPage /></SuspenseWrapper> },
          { path: 'profile', element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper> },
          { path: 'notifications', element: <SuspenseWrapper><NotificationsPage /></SuspenseWrapper> },
        ],
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
