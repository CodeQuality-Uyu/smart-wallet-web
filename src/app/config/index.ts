export type BackendType = 'msw' | 'firestore' | 'aws'
export type AppEnv = 'development' | 'staging' | 'production'

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string,
  appEnv: (import.meta.env.VITE_APP_ENV ?? 'development') as AppEnv,
  backend: (import.meta.env.VITE_BACKEND ?? 'msw') as BackendType,
} as const
