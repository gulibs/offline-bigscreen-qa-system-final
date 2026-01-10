/**
 * Q&A Settings Service
 * Manages Q&A system settings (question count, etc.)
 */

const SETTINGS_KEY = 'qa-settings'

export interface QASettings {
  /** Number of questions to select per session */
  questionCount: number
  /** Minimum number of questions required to start a session */
  minQuestionCount: number
  /** Maximum number of questions allowed per session */
  maxQuestionCount: number
}

const DEFAULT_SETTINGS: QASettings = {
  questionCount: 10,
  minQuestionCount: 5,
  maxQuestionCount: 50
}

/**
 * Get Q&A settings
 */
export function getQASettings(): QASettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<QASettings>
      return {
        ...DEFAULT_SETTINGS,
        ...parsed
      }
    }
  } catch (error) {
    console.error('[QASettings] Failed to load settings:', error)
  }
  return { ...DEFAULT_SETTINGS }
}

/**
 * Save Q&A settings
 */
export function saveQASettings(settings: Partial<QASettings>): void {
  try {
    const current = getQASettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('[QASettings] Failed to save settings:', error)
    throw error
  }
}

/**
 * Reset settings to default
 */
export function resetQASettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY)
  } catch (error) {
    console.error('[QASettings] Failed to reset settings:', error)
  }
}
