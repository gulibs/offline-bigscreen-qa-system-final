/**
 * Question Data Storage Service
 * Manages questions using SQLite via IPC
 */

import type { Question } from '../types/question'

/**
 * Wait for API to be available
 */
function waitForAPI(maxWait = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const checkAPI = (): void => {
      if (window.api?.db) {
        resolve()
      } else if (Date.now() - startTime > maxWait) {
        reject(new Error('Database API not available after waiting'))
      } else {
        setTimeout(checkAPI, 100)
      }
    }
    checkAPI()
  })
}

/**
 * Get all questions
 */
export async function getQuestions(): Promise<Question[]> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.getQuestions()
  } catch (error) {
    console.error('[questionStorage] Failed to get questions:', error)
    throw error
  }
}

/**
 * Add a new question
 */
export async function addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<Question> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.addQuestion(question)
  } catch (error) {
    console.error('[questionStorage] Failed to add question:', error)
    throw error
  }
}

/**
 * Update a question
 */
export async function updateQuestion(id: string, updates: Partial<Omit<Question, 'id' | 'createdAt'>>): Promise<Question | null> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.updateQuestion(id, updates)
  } catch (error) {
    console.error('[questionStorage] Failed to update question:', error)
    throw error
  }
}

/**
 * Delete a question
 */
export async function deleteQuestion(id: string): Promise<boolean> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.deleteQuestion(id)
  } catch (error) {
    console.error('[questionStorage] Failed to delete question:', error)
    throw error
  }
}

/**
 * Import questions from array
 */
export async function importQuestions(questions: Question[]): Promise<number> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.importQuestions(questions)
  } catch (error) {
    console.error('[questionStorage] Failed to import questions:', error)
    throw error
  }
}
