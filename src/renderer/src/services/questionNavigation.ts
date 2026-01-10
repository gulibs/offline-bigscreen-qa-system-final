/**
 * Question navigation state management
 * Tracks current question index and completion status
 */

import type { Question } from '../types/question'

export interface QuestionNavigationState {
  /** All questions in the session */
  questions: Question[]
  /** Current question index (0-based) */
  currentIndex: number
  /** Set of completed question IDs */
  completedQuestionIds: Set<string>
  /** Whether the session is complete */
  isComplete: boolean
}

/**
 * Initialize question navigation state
 */
export function initializeNavigation(questions: Question[]): QuestionNavigationState {
  return {
    questions,
    currentIndex: 0,
    completedQuestionIds: new Set(),
    isComplete: false
  }
}

/**
 * Get current question
 */
export function getCurrentQuestion(state: QuestionNavigationState): Question | undefined {
  return state.questions[state.currentIndex]
}

/**
 * Check if there is a next question
 */
export function hasNextQuestion(state: QuestionNavigationState): boolean {
  return state.currentIndex < state.questions.length - 1
}

/**
 * Advance to next question
 * Returns new state with incremented index
 */
export function advanceToNext(state: QuestionNavigationState): QuestionNavigationState {
  if (!hasNextQuestion(state)) {
    // No more questions - mark as complete
    return {
      ...state,
      isComplete: true
    }
  }

  return {
    ...state,
    currentIndex: state.currentIndex + 1
  }
}

/**
 * Mark current question as completed
 */
export function markCurrentCompleted(state: QuestionNavigationState): QuestionNavigationState {
  const currentQuestion = getCurrentQuestion(state)
  if (!currentQuestion) {
    return state
  }

  const newCompletedIds = new Set(state.completedQuestionIds)
  newCompletedIds.add(currentQuestion.id)

  return {
    ...state,
    completedQuestionIds: newCompletedIds
  }
}

/**
 * Get progress information
 */
export function getProgress(state: QuestionNavigationState): {
  current: number
  total: number
  percentage: number
  isLastQuestion: boolean
} {
  const current = state.currentIndex + 1 // 1-based for display
  const total = state.questions.length
  const percentage = Math.round((current / total) * 100)
  const isLastQuestion = current === total

  return {
    current,
    total,
    percentage,
    isLastQuestion
  }
}

/**
 * Check if a question is completed
 */
export function isQuestionCompleted(
  state: QuestionNavigationState,
  questionId: string
): boolean {
  return state.completedQuestionIds.has(questionId)
}

/**
 * Get total number of completed questions
 */
export function getCompletedCount(state: QuestionNavigationState): number {
  return state.completedQuestionIds.size
}

/**
 * Reset navigation to beginning
 */
export function resetNavigation(state: QuestionNavigationState): QuestionNavigationState {
  return initializeNavigation(state.questions)
}

