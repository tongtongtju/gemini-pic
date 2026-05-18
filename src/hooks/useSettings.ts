import { useState, useCallback } from 'react'
import type { Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const STORAGE_KEY = 'gemini-studio-settings'

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const setSettings = useCallback((updates: Partial<Settings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isConfigured = Boolean(settings.apiKey)

  return { settings, setSettings, isConfigured }
}
