/**
 * Custom error classes for Q&A system
 */

/**
 * Base error for Q&A system
 */
export class QASystemError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'QASystemError'
  }
}

/**
 * Error when question data cannot be loaded
 */
export class QuestionLoadError extends QASystemError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, 'QUESTION_LOAD_ERROR')
    this.name = 'QuestionLoadError'
  }
}

/**
 * Error when question data validation fails
 */
export class QuestionValidationError extends QASystemError {
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message, 'QUESTION_VALIDATION_ERROR')
    this.name = 'QuestionValidationError'
  }
}

/**
 * Error when question data is missing or empty
 */
export class QuestionDataMissingError extends QASystemError {
  constructor(message = 'Question data file is missing or empty') {
    super(message, 'QUESTION_DATA_MISSING')
    this.name = 'QuestionDataMissingError'
  }
}

/**
 * Format error message for display to users
 */
export function formatErrorForDisplay(error: unknown): {
  title: string
  message: string
  details?: string
} {
  if (error instanceof QuestionValidationError) {
    return {
      title: '题目数据格式错误',
      message: '题目数据文件格式不正确,请检查配置。',
      details: error.validationErrors.join('\n')
    }
  }

  if (error instanceof QuestionDataMissingError) {
    return {
      title: '题目数据缺失',
      message: '未找到题目数据文件,请确保 questions.json 文件存在。',
      details: error.message
    }
  }

  if (error instanceof QuestionLoadError) {
    return {
      title: '加载题目失败',
      message: '无法加载题目数据,请检查文件是否存在且格式正确。',
      details: error.cause ? String(error.cause) : error.message
    }
  }

  if (error instanceof Error) {
    return {
      title: '系统错误',
      message: error.message,
      details: error.stack
    }
  }

  return {
    title: '未知错误',
    message: String(error)
  }
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(_error: unknown): boolean {
  // Most question loading errors are not recoverable without fixing the data file
  return false
}

