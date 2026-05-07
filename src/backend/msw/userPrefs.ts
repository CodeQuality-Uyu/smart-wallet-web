// src/backend/msw/userPrefs.ts

import { httpClient } from '@/api/httpClient'
import type { IUserPrefsBackend } from '../types'
import type { UserPrefs } from '@/types/models'

export const mswUserPrefsBackend: IUserPrefsBackend = {
  async get(): Promise<UserPrefs> {
    const { data } = await httpClient.get<UserPrefs>('/user-prefs')
    return data
  },

  async set(prefs: Partial<UserPrefs>): Promise<UserPrefs> {
    const { data } = await httpClient.patch<UserPrefs>('/user-prefs', prefs)
    return data
  },
}
