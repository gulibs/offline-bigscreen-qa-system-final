/**
 * Question data types for Q&A system
 */

/**
 * Question type: single choice or multiple choice
 */
export type QuestionType = 'single' | 'multiple'

/**
 * Option type: true/false (✅/❌) or letter options (A/B/C/D)
 */
export type OptionType = 'true-false' | 'letter-options'

/**
 * Single question with multiple choice options
 */
export interface Question {
  /** Unique question identifier */
  id: string
  /** Question text to display */
  text: string
  /** Question type: single or multiple choice */
  questionType: QuestionType
  /** Option type: true-false or letter-options */
  optionType: OptionType
  /** Array of answer options */
  options: string[]
  /** Index(es) of correct answer(s) - single number for single choice, array for multiple choice */
  correctAnswer: number | number[]
  /** Created timestamp */
  createdAt: number
  /** Updated timestamp */
  updatedAt: number
}

/**
 * Question bank metadata
 */
export interface QuestionMeta {
  /** Version of question data format */
  version: string
  /** Total number of questions */
  totalQuestions: number
  /** Description of question set */
  description?: string
}

/**
 * Complete question bank structure (legacy format for JSON import)
 */
export interface QuestionBank {
  /** Metadata about question set */
  meta: QuestionMeta
  /** Array of questions (legacy format) */
  questions: LegacyQuestion[]
}

/**
 * Legacy question format (for JSON import compatibility)
 */
export interface LegacyQuestion {
  id: number
  text: string
  options: [string, string, string, string]
  correctAnswer: 0 | 1 | 2 | 3
}

/**
 * User's answer to a question
 */
export interface Answer {
  /** Question ID this answer is for */
  questionId: string
  /** Selected answer index(es) */
  selectedAnswer: number | number[]
  /** Whether the answer was correct */
  isCorrect: boolean
  /** Timestamp when answer was submitted */
  timestamp: number
}

/**
 * Session results tracking all answers
 */
export interface SessionResults {
  /** Array of all submitted answers */
  answers: Answer[]
  /** Total number of correct answers */
  correctCount: number
  /** Total number of questions answered */
  totalAnswered: number
  /** Session start time */
  startTime: number
  /** Session end time (if completed) */
  endTime?: number
}

/**
 * Validation result for question data
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean
  /** Array of error messages if validation failed */
  errors: string[]
}
