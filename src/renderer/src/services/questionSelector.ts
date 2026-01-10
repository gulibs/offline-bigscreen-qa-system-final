/**
 * Question Selector Service
 * Handles random question selection with pool management
 */

import type { Question } from '../types/question'
import { getQASettings } from './qaSettings'

export interface QuestionPool {
  /** All available questions */
  available: Question[]
  /** Questions that have been selected in current session */
  used: Set<string>
  /** Currently selected questions for this session */
  selected: Question[]
}

/**
 * Create a new question pool from available questions
 */
export function createQuestionPool(questions: Question[]): QuestionPool {
  return {
    available: [...questions],
    used: new Set(),
    selected: []
  }
}

/**
 * Select random questions from pool
 * @param pool - Current question pool
 * @param count - Number of questions to select
 * @returns Selected questions and updated pool
 */
export function selectRandomQuestions(
  pool: QuestionPool,
  count: number
): { questions: Question[]; updatedPool: QuestionPool; hasEnoughQuestions: boolean } {
  const settings = getQASettings()
  const targetCount = Math.min(count, settings.maxQuestionCount)
  
  console.log('[QuestionSelector] selectRandomQuestions called:', {
    count,
    targetCount,
    poolAvailable: pool.available.length,
    poolUsed: pool.used.size,
    poolUsedIds: Array.from(pool.used)
  })
  
  // Filter out used questions
  const available = pool.available.filter(q => !pool.used.has(q.id))
  
  console.log('[QuestionSelector] Available questions after filtering:', {
    availableCount: available.length,
    availableIds: available.map(q => q.id)
  })
  
  // If no available questions, all questions have been used
  if (available.length === 0) {
    console.log('[QuestionSelector] No available questions, all have been used')
    return {
      questions: [],
      updatedPool: pool,
      hasEnoughQuestions: false
    }
  }
  
  // If we have available questions (even if less than target), select them
  // Use the smaller of: target count or available count
  const actualCount = Math.min(targetCount, available.length)
  
  console.log('[QuestionSelector] Will select:', {
    actualCount,
    targetCount,
    availableCount: available.length
  })
  
  // Select randomly from available questions
  return selectRandomQuestionsFromAvailable(pool, actualCount)
}

/**
 * Select random questions from available pool
 */
function selectRandomQuestionsFromAvailable(
  pool: QuestionPool,
  count: number
): { questions: Question[]; updatedPool: QuestionPool; hasEnoughQuestions: boolean } {
  const available = pool.available.filter(q => !pool.used.has(q.id))
  
  // Should not happen, but safety check
  if (available.length === 0) {
    console.warn('[QuestionSelector] selectRandomQuestionsFromAvailable called with no available questions')
    return {
      questions: [],
      updatedPool: pool,
      hasEnoughQuestions: false
    }
  }
  
  // Select all available if count is more than available
  const actualCount = Math.min(count, available.length)
  
  if (actualCount <= 0) {
    console.warn('[QuestionSelector] actualCount is 0 or negative:', { count, availableCount: available.length, actualCount })
    return {
      questions: [],
      updatedPool: pool,
      hasEnoughQuestions: false
    }
  }
  
  // Shuffle and select
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, actualCount)
  
  console.log('[QuestionSelector] Selected questions:', {
    selectedCount: selected.length,
    selectedIds: selected.map(q => q.id)
  })
  
  // Update pool
  const updatedPool: QuestionPool = {
    available: pool.available,
    used: new Set([...pool.used, ...selected.map(q => q.id)]),
    selected: [...pool.selected, ...selected]
  }
  
  return {
    questions: selected,
    updatedPool,
    hasEnoughQuestions: true
  }
}

/**
 * Check if there are enough questions available
 */
export function hasEnoughQuestions(questions: Question[]): boolean {
  const settings = getQASettings()
  return questions.length >= settings.minQuestionCount
}

/**
 * Get question count setting
 */
export function getQuestionCount(): number {
  const settings = getQASettings()
  return settings.questionCount
}

/**
 * Check if pool has available questions
 */
export function hasAvailableQuestions(pool: QuestionPool): boolean {
  const available = pool.available.filter(q => !pool.used.has(q.id))
  return available.length > 0
}

/**
 * Get available question count in pool
 */
export function getAvailableQuestionCount(pool: QuestionPool): number {
  const available = pool.available.filter(q => !pool.used.has(q.id))
  return available.length
}
