/**
 * Question data loader and validator service
 * Loads questions from main process and validates data integrity
 */

import type { QuestionBank, ValidationResult } from '../types/question'
import { QuestionLoadError, QuestionDataMissingError, QuestionValidationError } from '../utils/errors'

/**
 * Load questions from main process via IPC
 */
export async function loadQuestions(): Promise<QuestionBank> {
  try {
    const data = await window.electron.ipcRenderer.invoke('load-questions')
    if (!data) {
      throw new QuestionDataMissingError()
    }
    return data as QuestionBank
  } catch (error) {
    console.error('[QuestionLoader] Failed to load questions:', error)
    if (error instanceof QuestionDataMissingError) {
      throw error
    }
    throw new QuestionLoadError('Failed to load question data from file', error)
  }
}

/**
 * Validate question bank data structure and content
 */
export function validateQuestionBank(data: unknown): ValidationResult {
  const errors: string[] = []

  // Check if data is an object
  if (!data || typeof data !== 'object') {
    errors.push('Question data must be an object')
    return { isValid: false, errors }
  }

  const questionBank = data as Record<string, unknown>

  // Validate meta field
  if (!questionBank.meta || typeof questionBank.meta !== 'object') {
    errors.push('Missing or invalid meta field')
  } else {
    const meta = questionBank.meta as Record<string, unknown>
    if (typeof meta.version !== 'string') {
      errors.push('meta.version must be a string')
    }
    if (typeof meta.totalQuestions !== 'number') {
      errors.push('meta.totalQuestions must be a number')
    }
  }

  // Validate questions array
  if (!Array.isArray(questionBank.questions)) {
    errors.push('questions must be an array')
    return { isValid: false, errors }
  }

  const questions = questionBank.questions as unknown[]

  // Check question count (recommended 15-25)
  if (questions.length < 15 || questions.length > 25) {
    errors.push(
      `Question count (${questions.length}) is outside recommended range (15-25). This may impact user experience.`
    )
  }

  // Validate each question
  questions.forEach((q, index) => {
    if (!q || typeof q !== 'object') {
      errors.push(`Question ${index + 1}: Must be an object`)
      return
    }

    const question = q as Record<string, unknown>

    // Validate id
    if (typeof question.id !== 'number') {
      errors.push(`Question ${index + 1}: id must be a number`)
    }

    // Validate text
    if (typeof question.text !== 'string' || question.text.trim() === '') {
      errors.push(`Question ${index + 1}: text must be a non-empty string`)
    }

    // Validate options
    if (!Array.isArray(question.options)) {
      errors.push(`Question ${index + 1}: options must be an array`)
    } else if (question.options.length !== 4) {
      errors.push(`Question ${index + 1}: options must have exactly 4 elements (A, B, C, D)`)
    } else {
      question.options.forEach((opt, optIndex) => {
        if (typeof opt !== 'string' || opt.trim() === '') {
          errors.push(
            `Question ${index + 1}, Option ${String.fromCharCode(65 + optIndex)}: must be a non-empty string`
          )
        }
      })
    }

    // Validate correctAnswer
    if (typeof question.correctAnswer !== 'number') {
      errors.push(`Question ${index + 1}: correctAnswer must be a number`)
    } else if (![0, 1, 2, 3].includes(question.correctAnswer)) {
      errors.push(`Question ${index + 1}: correctAnswer must be 0, 1, 2, or 3`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate and load questions, throwing error if invalid
 */
export async function loadAndValidateQuestions(): Promise<QuestionBank> {
  const data = await loadQuestions()
  const validation = validateQuestionBank(data)

  if (!validation.isValid) {
    console.error('[QuestionLoader] Validation errors:', validation.errors)
    throw new QuestionValidationError(
      'Question data validation failed',
      validation.errors
    )
  }

  console.log(`[QuestionLoader] Successfully loaded ${data.questions.length} questions`)
  return data
}

