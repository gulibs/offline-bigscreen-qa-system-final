/**
 * React Context for Q&A State Machine
 * Provides state machine context and dispatch to all components
 */

import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react'
import {
  qaStateMachineReducer,
  createInitialContext,
  QAState,
  type QAStateMachineContext,
  type QAAction
} from '../store/qaStateMachine'
import { getQuestions } from '../services/questionStorage'
import { formatErrorForDisplay } from '../utils/errors'
import { saveState, loadState, restoreContext, clearState } from '../services/statePersistence'
import {
  selectRandomQuestions,
  createQuestionPool,
  getQuestionCount,
  type QuestionPool
} from '../services/questionSelector'
import type { Question } from '../types/question'

/**
 * Context value including state and dispatch
 */
interface QAContextValue {
  context: QAStateMachineContext
  dispatch: React.Dispatch<QAAction>
  /** Helper: Get current question */
  getCurrentQuestion: () => ReturnType<typeof getCurrentQuestion>
  /** Helper: Check if last question */
  isLastQuestion: boolean
  /** Helper: Check if first question */
  isFirstQuestion: boolean
  /** Helper: Get progress info */
  progress: {
    current: number
    total: number
    percentage: number
  }
  /** Reload questions and start new session */
  reloadQuestions: () => Promise<void>
  /** Check if there are enough questions available */
  hasEnoughQuestions: boolean
  /** Error message if not enough questions */
  questionError: string | null
  /** Check if question pool has available questions */
  checkQuestionPool: () => Promise<{ hasAvailable: boolean; message: string }>
}

const QAContext = createContext<QAContextValue | null>(null)

/**
 * Helper to get current question from context
 */
function getCurrentQuestion(context: QAStateMachineContext) {
  return context.questions[context.currentQuestionIndex]
}

/**
 * Question pool storage key
 */
const QUESTION_POOL_KEY = 'qa-question-pool'

/**
 * QA Context Provider
 * Manages Q&A state machine and provides to children
 */
export function QAProvider({ children }: { children: ReactNode }) {
  const [context, dispatch] = useReducer(qaStateMachineReducer, createInitialContext())
  const isInitializedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const questionPoolRef = useRef<QuestionPool | null>(null)

  // Load or create question pool
  const loadQuestionPool = (allQuestions: Question[]): QuestionPool => {
    try {
      const stored = localStorage.getItem(QUESTION_POOL_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as { used: string[] }
        // Always use current database questions as available
        // Only restore used set from storage, but only if the question still exists in database
        const used = new Set(parsed.used.filter((id) => allQuestions.some((q) => q.id === id)))

        console.log('[QAContext] Loaded question pool from storage:', {
          storedUsedCount: parsed.used.length,
          validUsedCount: used.size,
          allQuestionsCount: allQuestions.length,
          allQuestionIds: allQuestions.map((q) => q.id),
          usedIds: Array.from(used)
        })

        return {
          available: allQuestions,
          used,
          selected: []
        }
      }
    } catch (error) {
      console.error('[QAContext] Failed to load question pool:', error)
    }

    console.log('[QAContext] Creating new question pool:', {
      allQuestionsCount: allQuestions.length,
      allQuestionIds: allQuestions.map((q) => q.id)
    })

    return createQuestionPool(allQuestions)
  }

  // Save question pool
  const saveQuestionPool = (pool: QuestionPool): void => {
    try {
      // Only save used set, available is always from database
      const data = {
        used: Array.from(pool.used)
      }
      localStorage.setItem(QUESTION_POOL_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('[QAContext] Failed to save question pool:', error)
    }
  }

  // Helper function to load questions and initialize session
  const loadQuestionsAndStartSession = async (shouldRestoreState = true) => {
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('[QAContext] Already loading questions, skipping...')
      return
    }

    isLoadingRef.current = true
    try {
      console.log('[QAContext] Loading questions from database...')
      const allQuestions = await getQuestions()
      console.log('[QAContext] Loaded', allQuestions.length, 'questions from database')

      // Check if database has any questions
      if (allQuestions.length === 0) {
        const errorMsg = '暂时没有题目，请前往答题管理页面添加题目。'
        dispatch({
          type: 'ERROR',
          message: errorMsg
        })
        return
      }

      // Load or create question pool
      questionPoolRef.current = loadQuestionPool(allQuestions)

      // Debug: Log pool state
      const availableBeforeSelection = questionPoolRef.current.available.filter(
        (q) => !questionPoolRef.current!.used.has(q.id)
      )
      console.log('[QAContext] Pool state before selection:', {
        totalQuestions: allQuestions.length,
        poolAvailable: questionPoolRef.current.available.length,
        poolUsed: questionPoolRef.current.used.size,
        availableUnused: availableBeforeSelection.length,
        availableUnusedIds: availableBeforeSelection.map((q) => q.id)
      })

      // If all questions are marked as used but we have questions in database,
      // reset the pool (this can happen if localStorage has stale data)
      if (availableBeforeSelection.length === 0 && allQuestions.length > 0) {
        console.warn(
          '[QAContext] All questions marked as used but database has questions, resetting pool'
        )
        questionPoolRef.current = createQuestionPool(allQuestions)
        // Clear localStorage to prevent this from happening again
        try {
          localStorage.removeItem(QUESTION_POOL_KEY)
        } catch (error) {
          console.error('[QAContext] Failed to clear question pool:', error)
        }
      }

      // Select random questions
      const questionCount = getQuestionCount()
      const selection = selectRandomQuestions(questionPoolRef.current, questionCount)

      console.log('[QAContext] Selection result:', {
        hasEnoughQuestions: selection.hasEnoughQuestions,
        questionsCount: selection.questions.length,
        questionCount,
        selectedIds: selection.questions.map((q) => q.id)
      })

      // Only error if no questions available at all (all have been used)
      // If we have questions (even if less than target), proceed
      if (selection.questions.length === 0) {
        const errorMsg = '暂时没有题目，请前往答题管理页面添加题目。'
        dispatch({
          type: 'ERROR',
          message: errorMsg
        })
        return
      }

      // Update pool
      questionPoolRef.current = selection.updatedPool
      saveQuestionPool(questionPoolRef.current)

      const selectedQuestions = selection.questions
      console.log('[QAContext] Selected', selectedQuestions.length, 'questions randomly')

      // Try to restore saved state (only if shouldRestoreState is true)
      if (shouldRestoreState) {
        const savedState = loadState()
        if (savedState) {
          const restoredContext = restoreContext(savedState, selectedQuestions)
          if (restoredContext) {
            console.log('[QAContext] Restoring saved state')
            dispatch({
              type: 'RESTORE_STATE',
              restoredContext: {
                ...createInitialContext(),
                ...restoredContext,
                questions: selectedQuestions
              }
            })
            return
          } else {
            console.log('[QAContext] Could not restore saved state, starting fresh')
            clearState()
          }
        }
      } else {
        // Clear state when explicitly resetting
        clearState()
      }

      // No saved state or restore failed - start new session
      dispatch({ type: 'START_SESSION', questions: selectedQuestions })
    } catch (error) {
      console.error('[QAContext] Failed to load questions:', error)
      const errorInfo = formatErrorForDisplay(error)
      dispatch({
        type: 'ERROR',
        message: `${errorInfo.title}: ${errorInfo.message}`
      })
    } finally {
      isLoadingRef.current = false
    }
  }

  // Check question pool status
  const checkQuestionPool = async (): Promise<{ hasAvailable: boolean; message: string }> => {
    try {
      const allQuestions = await getQuestions()
      if (allQuestions.length === 0) {
        return {
          hasAvailable: false,
          message: '数据库中没有任何题目，请前往答题管理页面添加题目。'
        }
      }

      // Load current pool
      const pool = loadQuestionPool(allQuestions)
      const available = pool.available.filter((q) => !pool.used.has(q.id))

      if (available.length === 0) {
        return {
          hasAvailable: false,
          message: '题目已经全部读取完，请重新开始或前往答题管理页面添加更多题目。'
        }
      }

      return {
        hasAvailable: true,
        message: `还有 ${available.length} 道题目可用`
      }
    } catch (error) {
      console.error('[QAContext] Failed to check question pool:', error)
      return {
        hasAvailable: false,
        message: '检查题目池状态失败'
      }
    }
  }

  // Reload questions function (for getting new questions)
  const reloadQuestions = async (): Promise<void> => {
    // Clear question pool when reloading
    try {
      localStorage.removeItem(QUESTION_POOL_KEY)
    } catch (error) {
      console.error('[QAContext] Failed to clear question pool:', error)
    }
    questionPoolRef.current = null
    await loadQuestionsAndStartSession(false)
  }

  // Load questions and restore state on mount
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true
    loadQuestionsAndStartSession(true)
  }, [])

  // Reload questions when state is reset to IDLE with no questions
  useEffect(() => {
    // If state is IDLE and no questions, reload (this happens after RESET_SESSION)
    if (
      isInitializedRef.current &&
      context.state === QAState.IDLE &&
      context.questions.length === 0 &&
      !context.error
    ) {
      console.log('[QAContext] State reset detected, reloading questions...')
      loadQuestionsAndStartSession(false) // Don't restore state when resetting
    }
  }, [context.state, context.questions.length, context.error])

  // Save state whenever it changes (except during initialization)
  useEffect(() => {
    if (isInitializedRef.current && context.questions.length > 0) {
      saveState(context)
    }
  }, [context])

  // Calculate derived values
  const isLastQuestion = context.currentQuestionIndex >= context.questions.length - 1
  const isFirstQuestion = context.currentQuestionIndex === 0
  const progress = {
    current: context.currentQuestionIndex + 1,
    total: context.questions.length,
    percentage: Math.round(((context.currentQuestionIndex + 1) / context.questions.length) * 100)
  }

  // Check if there are enough questions
  const hasEnoughQuestionsValue = context.questions.length > 0
  const questionError = context.error && context.error.includes('题目') ? context.error : null

  const value: QAContextValue = {
    context,
    dispatch,
    getCurrentQuestion: () => getCurrentQuestion(context),
    isLastQuestion,
    isFirstQuestion,
    progress,
    reloadQuestions,
    hasEnoughQuestions: hasEnoughQuestionsValue,
    questionError,
    checkQuestionPool
  }

  return <QAContext.Provider value={value}>{children}</QAContext.Provider>
}

/**
 * Hook to use Q&A context
 * Throws error if used outside QAProvider
 */
export function useQA(): QAContextValue {
  const context = useContext(QAContext)
  if (!context) {
    throw new Error('useQA must be used within QAProvider')
  }
  return context
}

/**
 * Hook to get current question
 */
export function useCurrentQuestion() {
  const { context } = useQA()
  return getCurrentQuestion(context)
}

/**
 * Hook to check if answer is locked
 */
export function useIsAnswerLocked() {
  const { context } = useQA()
  return context.isAnswerLocked
}

/**
 * Hook to get selected answer
 */
export function useSelectedAnswer() {
  const { context } = useQA()
  return context.selectedAnswer
}

/**
 * Hook to get session results
 */
export function useSessionResults() {
  const { context } = useQA()
  return context.results
}

/**
 * Hook to check current state
 */
export function useQAState() {
  const { context } = useQA()
  return context.state
}

/**
 * Hook to dispatch actions
 */
export function useQADispatch() {
  const { dispatch } = useQA()
  return dispatch
}
