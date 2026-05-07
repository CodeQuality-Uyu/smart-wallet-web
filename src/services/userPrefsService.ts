// src/services/userPrefsService.ts

import { getUserPrefsBackend } from '@/backend'
import type { UserPrefs } from '@/types/models'

export const userPrefsService = {
  async get(): Promise<UserPrefs> {
    return (await getUserPrefsBackend()).get()
  },
  async set(prefs: Partial<UserPrefs>): Promise<UserPrefs> {
    return (await getUserPrefsBackend()).set(prefs)
  },
}
