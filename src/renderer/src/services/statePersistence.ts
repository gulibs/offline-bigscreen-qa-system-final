/**
 * State Persistence Service
 * Saves and loads Q&A session state to/from localStorage
 */

import type { QAStateMachineContext } from '../store/qaStateMachine'
import { QAState } from '../store/qaStateMachine'

const STORAGE_KEY = 'qa-session-state'
const STORAGE_VERSION = 1

/**
 * Persisted state structure (simplified for storage)
 */
interface PersistedState {
  version: number
  state: QAState
  currentQuestionIndex: number
  selectedAnswer: number | number[] | null
  isAnswerLocked: boolean
  lastAnswerCorrect: boolean | null
  results: {
    answers: Array<{
      questionId: string
      selectedAnswer: number | number[]
      isCorrect: boolean
      timestamp: number
    }>
    correctCount: number
    totalAnswered: number
    startTime: number
    endTime?: number
  }
  // Store question IDs only to save space
  questionIds: string[]
  // Store timestamp to detect stale data
  savedAt: number
}

/**
 * Save state to localStorage
 */
export function saveState(context: QAStateMachineContext): void {
  try {
    // Don't save if in IDLE state or if there's an error
    if (context.state === QAState.IDLE || context.error) {
      return
    }

    // Don't save if no questions loaded
    if (context.questions.length === 0) {
      return
    }

    const persistedState: PersistedState = {
      version: STORAGE_VERSION,
      state: context.state,
      currentQuestionIndex: context.currentQuestionIndex,
      selectedAnswer: context.selectedAnswer,
      isAnswerLocked: context.isAnswerLocked,
      lastAnswerCorrect: context.lastAnswerCorrect,
      results: context.results,
      questionIds: context.questions.map((q) => q.id),
      savedAt: Date.now()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
    console.log('[StatePersistence] State saved to localStorage')
  } catch (error) {
    console.error('[StatePersistence] Failed to save state:', error)
  }
}

/**
 * Load state from localStorage
 */
export function loadState(): PersistedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return null
    }

    const persistedState = JSON.parse(stored) as PersistedState

    // Check version compatibility
    if (persistedState.version !== STORAGE_VERSION) {
      console.warn('[StatePersistence] Version mismatch, clearing old state')
      clearState()
      return null
    }

    // Check if state is too old (more than 7 days)
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days
    if (Date.now() - persistedState.savedAt > MAX_AGE) {
      console.warn('[StatePersistence] State too old, clearing')
      clearState()
      return null
    }

    console.log('[StatePersistence] State loaded from localStorage')
    return persistedState
  } catch (error) {
    console.error('[StatePersistence] Failed to load state:', error)
    return null
  }
}

/**
 * Clear saved state
 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('[StatePersistence] State cleared from localStorage')
  } catch (error) {
    console.error('[StatePersistence] Failed to clear state:', error)
  }
}

/**
 * Check if saved state exists
 */
export function hasSavedState(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

/**
 * Restore context from persisted state
 * Note: questions array must be provided separately
 */
export function restoreContext(
  persistedState: PersistedState,
  questions: QAStateMachineContext['questions']
): Partial<QAStateMachineContext> | null {
  try {
    // Verify question IDs match
    const currentQuestionIds = questions.map((q) => q.id)
    if (
      persistedState.questionIds.length !== currentQuestionIds.length ||
      !persistedState.questionIds.every((id, index) => id === currentQuestionIds[index])
    ) {
      console.warn('[StatePersistence] Question IDs mismatch, cannot restore state')
      return null
    }

    // Restore context
    return {
      state: persistedState.state,
      currentQuestionIndex: persistedState.currentQuestionIndex,
      selectedAnswer: persistedState.selectedAnswer,
      isAnswerLocked: persistedState.isAnswerLocked,
      lastAnswerCorrect: persistedState.lastAnswerCorrect,
      results: persistedState.results,
      questions, // Use provided questions array
      error: null
    }
  } catch (error) {
    console.error('[StatePersistence] Failed to restore context:', error)
    return null
  }
}
