/**
 * Q&A State Machine
 * Manages the flow: Idle → Question Display → Answer Selected → Confirmed → Animation → Next/Complete
 */

import type { Question, Answer, SessionResults } from '../types/question'

/**
 * State machine states
 */
export enum QAState {
  /** Initial state before session starts */
  IDLE = 'IDLE',
  /** Displaying question, waiting for answer selection */
  QUESTION_DISPLAY = 'QUESTION_DISPLAY',
  /** User has selected an answer but not confirmed */
  ANSWER_SELECTED = 'ANSWER_SELECTED',
  /** Answer confirmed, locked, preparing for animation */
  CONFIRMED = 'CONFIRMED',
  /** Playing feedback animation (correct/wrong) */
  ANIMATION_FEEDBACK = 'ANIMATION_FEEDBACK',
  /** Session completed, all questions answered */
  COMPLETED = 'COMPLETED'
}

/**
 * Complete state machine context
 */
export interface QAStateMachineContext {
  /** Current state */
  state: QAState
  /** All questions in session */
  questions: Question[]
  /** Current question index */
  currentQuestionIndex: number
  /** Currently selected answer(s) - single number for single choice, array for multiple choice, null if none selected */
  selectedAnswer: number | number[] | null
  /** Whether current answer is locked (cannot change after confirmation) */
  isAnswerLocked: boolean
  /** Whether last confirmed answer was correct (used for animation routing) */
  lastAnswerCorrect: boolean | null
  /** Session results */
  results: SessionResults
  /** Error message if any */
  error: string | null
}

/**
 * State machine actions
 */
export type QAAction =
  | { type: 'START_SESSION'; questions: Question[] }
  | { type: 'RESTORE_STATE'; restoredContext: QAStateMachineContext }
  | { type: 'SELECT_ANSWER'; answerIndex: number }
  | { type: 'CONFIRM_ANSWER' }
  | { type: 'START_ANIMATION' }
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREVIOUS_QUESTION' }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'RESET_SESSION' }
  | { type: 'ERROR'; message: string }

/**
 * Initialize state machine context
 */
export function createInitialContext(): QAStateMachineContext {
  return {
    state: QAState.IDLE,
    questions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    isAnswerLocked: false,
    lastAnswerCorrect: null,
    results: {
      answers: [],
      correctCount: 0,
      totalAnswered: 0,
      startTime: 0
    },
    error: null
  }
}

/**
 * Get current question
 */
function getCurrentQuestion(context: QAStateMachineContext): Question | undefined {
  return context.questions[context.currentQuestionIndex]
}

/**
 * Check if answer is correct
 * Supports both single choice (number) and multiple choice (number[])
 */
function isAnswerCorrect(question: Question, selectedAnswer: number | number[]): boolean {
  if (question.questionType === 'multiple') {
    // Multiple choice: compare arrays (order doesn't matter)
    const correctAnswers = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer]
    const selectedAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer]
    
    // Both arrays must have the same length and contain the same values
    if (correctAnswers.length !== selectedAnswers.length) {
      return false
    }
    
    // Sort both arrays for comparison
    const sortedCorrect = [...correctAnswers].sort()
    const sortedSelected = [...selectedAnswers].sort()
    
    return sortedCorrect.every((val, idx) => val === sortedSelected[idx])
  } else {
    // Single choice: compare single numbers
    const correctAnswer = Array.isArray(question.correctAnswer)
      ? question.correctAnswer[0]
      : question.correctAnswer
    const selected = Array.isArray(selectedAnswer) ? selectedAnswer[0] : selectedAnswer
    return correctAnswer === selected
  }
}

/**
 * State machine reducer
 * Handles state transitions based on actions
 */
export function qaStateMachineReducer(
  context: QAStateMachineContext,
  action: QAAction
): QAStateMachineContext {
  console.log(`[StateMachine] State: ${context.state}, Action: ${action.type}`)

  switch (action.type) {
    case 'START_SESSION': {
      if (context.state !== QAState.IDLE) {
        console.warn('[StateMachine] Cannot start session from current state')
        return context
      }

      return {
        ...context,
        state: QAState.QUESTION_DISPLAY,
        questions: action.questions,
        currentQuestionIndex: 0,
        selectedAnswer: null,
        isAnswerLocked: false,
        lastAnswerCorrect: null,
        results: {
          answers: [],
          correctCount: 0,
          totalAnswered: 0,
          startTime: Date.now()
        },
        error: null
      }
    }

    case 'RESTORE_STATE': {
      console.log('[StateMachine] Restoring state from persistence')
      return action.restoredContext
    }

    case 'SELECT_ANSWER': {
      // Can only select answer in QUESTION_DISPLAY or ANSWER_SELECTED state
      if (context.state !== QAState.QUESTION_DISPLAY && context.state !== QAState.ANSWER_SELECTED) {
        console.warn('[StateMachine] Cannot select answer in current state')
        return context
      }

      // Cannot change answer if locked
      if (context.isAnswerLocked) {
        console.warn('[StateMachine] Answer is locked, cannot change')
        return context
      }

      // Validate answer index
      if (![0, 1, 2, 3].includes(action.answerIndex)) {
        console.error('[StateMachine] Invalid answer index:', action.answerIndex)
        return context
      }

      const currentQuestion = getCurrentQuestion(context)
      if (!currentQuestion) {
        console.error('[StateMachine] No current question')
        return context
      }

      // Handle selection based on question type
      let newSelectedAnswer: number | number[] | null

      if (currentQuestion.questionType === 'multiple') {
        // Multiple choice: toggle selection
        const currentSelected = Array.isArray(context.selectedAnswer)
          ? context.selectedAnswer
          : context.selectedAnswer !== null
            ? [context.selectedAnswer]
            : []
        
        if (currentSelected.includes(action.answerIndex)) {
          // Deselect if already selected
          newSelectedAnswer = currentSelected.filter(idx => idx !== action.answerIndex)
          // If no answers selected, set to null
          if (newSelectedAnswer.length === 0) {
            newSelectedAnswer = null
          }
        } else {
          // Add to selection
          newSelectedAnswer = [...currentSelected, action.answerIndex].sort()
        }
      } else {
        // Single choice: replace selection
        newSelectedAnswer = action.answerIndex
      }

      return {
        ...context,
        state: QAState.ANSWER_SELECTED,
        selectedAnswer: newSelectedAnswer
      }
    }

    case 'CONFIRM_ANSWER': {
      if (context.state !== QAState.ANSWER_SELECTED) {
        console.warn('[StateMachine] Cannot confirm answer in current state')
        return context
      }

      if (context.selectedAnswer === null) {
        console.error('[StateMachine] No answer selected to confirm')
        return context
      }

      const currentQuestion = getCurrentQuestion(context)
      if (!currentQuestion) {
        console.error('[StateMachine] No current question')
        return context
      }

      // For multiple choice, ensure at least one answer is selected
      if (currentQuestion.questionType === 'multiple') {
        const selectedArray = Array.isArray(context.selectedAnswer)
          ? context.selectedAnswer
          : [context.selectedAnswer]
        if (selectedArray.length === 0) {
          console.error('[StateMachine] Multiple choice question requires at least one answer')
          return context
        }
      }

      const isCorrect = isAnswerCorrect(currentQuestion, context.selectedAnswer)

      // Create answer record
      const answer: Answer = {
        questionId: currentQuestion.id,
        selectedAnswer: context.selectedAnswer,
        isCorrect,
        timestamp: Date.now()
      }

      // Update results
      const newResults: SessionResults = {
        answers: [...context.results.answers, answer],
        correctCount: context.results.correctCount + (isCorrect ? 1 : 0),
        totalAnswered: context.results.totalAnswered + 1,
        startTime: context.results.startTime
      }

      return {
        ...context,
        state: QAState.CONFIRMED,
        isAnswerLocked: true,
        lastAnswerCorrect: isCorrect, // Save whether answer was correct
        results: newResults
      }
    }

    case 'START_ANIMATION': {
      if (context.state !== QAState.CONFIRMED) {
        console.warn('[StateMachine] Cannot start animation in current state')
        return context
      }

      return {
        ...context,
        state: QAState.ANIMATION_FEEDBACK
      }
    }

    case 'ANIMATION_COMPLETE': {
      if (context.state !== QAState.ANIMATION_FEEDBACK) {
        console.warn('[StateMachine] Cannot complete animation in current state')
        return context
      }

      // If answer was correct, advance to next question or completion
      if (context.lastAnswerCorrect === true) {
        const isLastQuestion = context.currentQuestionIndex >= context.questions.length - 1

        if (isLastQuestion) {
          // Last question answered correctly - go to completion screen
          return {
            ...context,
            state: QAState.COMPLETED,
            lastAnswerCorrect: null,
            results: {
              ...context.results,
              endTime: Date.now()
            }
          }
        }

        // More questions remain - advance to next question
        const nextIndex = context.currentQuestionIndex + 1
        return {
          ...context,
          state: QAState.QUESTION_DISPLAY,
          currentQuestionIndex: nextIndex,
          selectedAnswer: null,
          isAnswerLocked: false,
          lastAnswerCorrect: null
        }
      }

      // Answer was wrong - reset current question for retry
      console.log('[StateMachine] Wrong answer - resetting current question for retry')
      return {
        ...context,
        state: QAState.QUESTION_DISPLAY,
        selectedAnswer: null,
        isAnswerLocked: false,
        lastAnswerCorrect: null
        // Keep currentQuestionIndex unchanged - retry same question
      }
    }

    case 'NEXT_QUESTION': {
      // Allow navigation in QUESTION_DISPLAY or ANSWER_SELECTED state (before confirmation)
      if (context.state !== QAState.QUESTION_DISPLAY && context.state !== QAState.ANSWER_SELECTED && context.state !== QAState.ANIMATION_FEEDBACK) {
        console.warn('[StateMachine] Cannot advance to next question in current state')
        return context
      }

      const nextIndex = context.currentQuestionIndex + 1

      if (nextIndex >= context.questions.length) {
        // Last question - stay on current question
        console.log('[StateMachine] Already at last question')
        return context
      }

      // Advance to next question
      return {
        ...context,
        state: QAState.QUESTION_DISPLAY,
        currentQuestionIndex: nextIndex,
        selectedAnswer: null,
        isAnswerLocked: false,
        lastAnswerCorrect: null
      }
    }

    case 'PREVIOUS_QUESTION': {
      // Allow navigation in QUESTION_DISPLAY or ANSWER_SELECTED state (before confirmation)
      if (context.state !== QAState.QUESTION_DISPLAY && context.state !== QAState.ANSWER_SELECTED && context.state !== QAState.ANIMATION_FEEDBACK) {
        console.warn('[StateMachine] Cannot go to previous question in current state')
        return context
      }

      const prevIndex = context.currentQuestionIndex - 1

      if (prevIndex < 0) {
        // First question - stay on current question
        console.log('[StateMachine] Already at first question')
        return context
      }

      // Go to previous question
      return {
        ...context,
        state: QAState.QUESTION_DISPLAY,
        currentQuestionIndex: prevIndex,
        selectedAnswer: null,
        isAnswerLocked: false,
        lastAnswerCorrect: null
      }
    }

    case 'COMPLETE_SESSION': {
      return {
        ...context,
        state: QAState.COMPLETED,
        results: {
          ...context.results,
          endTime: Date.now()
        }
      }
    }

    case 'RESET_SESSION': {
      // Clear persisted state when resetting
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem('qa-session-state')
        } catch (error) {
          console.error('[StateMachine] Failed to clear persisted state:', error)
        }
      }
      return createInitialContext()
    }

    case 'ERROR': {
      return {
        ...context,
        error: action.message
      }
    }

    default:
      return context
  }
}

/**
 * Helper to check if action is allowed in current state
 */
export function isActionAllowed(state: QAState, actionType: QAAction['type']): boolean {
  const transitions: Record<QAState, QAAction['type'][]> = {
    [QAState.IDLE]: ['START_SESSION'],
    [QAState.QUESTION_DISPLAY]: ['SELECT_ANSWER'],
    [QAState.ANSWER_SELECTED]: ['SELECT_ANSWER', 'CONFIRM_ANSWER'],
    [QAState.CONFIRMED]: ['START_ANIMATION'],
    [QAState.ANIMATION_FEEDBACK]: ['ANIMATION_COMPLETE', 'NEXT_QUESTION'],
    [QAState.COMPLETED]: ['RESET_SESSION']
  }

  return transitions[state]?.includes(actionType) ?? false
}
