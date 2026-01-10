/**
 * Main Q&A Screen Component
 * Displays question, options, and handles user interaction
 * Styled with Tailwind CSS 4
 * With fullscreen support and responsive layout
 */

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import restartIcon from '@iconify-icons/mdi/restart'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import arrowRightIcon from '@iconify-icons/mdi/arrow-right'
import refreshIcon from '@iconify-icons/mdi/refresh'
import settingsIcon from '@iconify-icons/mdi/cog'
import { useQA, useQAState } from '../contexts/QAContext'
import { QAState } from '../store/qaStateMachine'
import { useKeyboardInput } from '../hooks/useKeyboardInput'
import { InputCommand, commandToAnswerIndex } from '../services/inputHandler'
import wrongVideo from '../assets/wrong.mp4'
import rightVideo from '../assets/right.mp4'
import '../assets/animations.css'

export function QAScreen() {
  const navigate = useNavigate()
  const {
    context,
    dispatch,
    getCurrentQuestion,
    progress,
    isLastQuestion,
    isFirstQuestion,
    reloadQuestions,
    questionError,
    checkQuestionPool
  } = useQA()
  const state = useQAState()
  const currentQuestion = getCurrentQuestion()
  const wrongVideoRef = useRef<HTMLVideoElement>(null)
  const rightVideoRef = useRef<HTMLVideoElement>(null)

  // 根据问题文本长度动态调整字体大小
  // 长文本使用较小字体，短文本使用较大字体
  const getQuestionFontSize = (): string => {
    if (!currentQuestion) return 'text-2xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl'

    const textLength = currentQuestion.text.length
    // 根据文本长度选择字体大小
    // 0-30: 正常大小
    // 31-60: 稍小
    // 61-100: 更小
    // 100+: 最小
    if (textLength <= 30) {
      return 'text-2xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl'
    } else if (textLength <= 60) {
      return 'text-xl sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl'
    } else if (textLength <= 100) {
      return 'text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl'
    } else {
      return 'text-base sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl'
    }
  }

  // 根据最长选项文本长度动态调整所有选项的字体大小
  // 如果有一个选项特别长，所有选项都使用较小的字体
  const getOptionFontSize = (): { label: string; text: string } => {
    if (!currentQuestion || !currentQuestion.options || currentQuestion.options.length === 0) {
      return {
        label: 'text-xl sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl',
        text: 'text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl'
      }
    }

    // 找到最长的选项文本长度
    const maxOptionLength = Math.max(...currentQuestion.options.map((opt) => opt.length))

    // 根据最长选项长度选择字体大小
    // 0-20: 正常大小
    // 21-40: 稍小
    // 41-60: 更小
    // 60+: 最小
    if (maxOptionLength <= 20) {
      return {
        label: 'text-xl sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl',
        text: 'text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl'
      }
    } else if (maxOptionLength <= 40) {
      return {
        label: 'text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl',
        text: 'text-base sm:text-base md:text-lg lg:text-xl xl:text-2xl'
      }
    } else if (maxOptionLength <= 60) {
      return {
        label: 'text-base sm:text-base md:text-lg lg:text-xl xl:text-2xl',
        text: 'text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl'
      }
    } else {
      return {
        label: 'text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl',
        text: 'text-xs sm:text-xs md:text-sm lg:text-base xl:text-lg'
      }
    }
  }

  // Handle keyboard input (disabled during animation and completion)
  useKeyboardInput(
    (command) => {
      handleInputCommand(command)
    },
    state !== QAState.ANIMATION_FEEDBACK && state !== QAState.COMPLETED
  )

  // Handle input commands
  const handleInputCommand = (command: InputCommand): void => {
    const answerIndex = commandToAnswerIndex(command)

    if (answerIndex !== null) {
      // Select answer (1/2/3/4 or A/B/C/D)
      if (state === QAState.QUESTION_DISPLAY || state === QAState.ANSWER_SELECTED) {
        dispatch({ type: 'SELECT_ANSWER', answerIndex })
      }
    } else if (command === InputCommand.CONFIRM) {
      // Confirm answer (Enter key)
      if (state === QAState.ANSWER_SELECTED) {
        dispatch({ type: 'CONFIRM_ANSWER' })
      }
    }
    // Note: NEXT command removed - animation auto-advances after 2 seconds
  }

  // Auto-start animation after confirmation
  useEffect(() => {
    if (state === QAState.CONFIRMED) {
      setTimeout(() => {
        dispatch({ type: 'START_ANIMATION' })
      }, 100)
    }
  }, [state, dispatch])

  // Ensure video plays when animation state is active
  useEffect(() => {
    if (state === QAState.ANIMATION_FEEDBACK && currentQuestion) {
      // Calculate if answer is correct
      const calculateIsCorrect = (): boolean => {
        if (context.selectedAnswer === null) return false

        if (currentQuestion.questionType === 'multiple') {
          // Multiple choice: compare arrays
          const correctAnswers = Array.isArray(currentQuestion.correctAnswer)
            ? currentQuestion.correctAnswer
            : [currentQuestion.correctAnswer]
          const selectedAnswers = Array.isArray(context.selectedAnswer)
            ? context.selectedAnswer
            : [context.selectedAnswer]

          if (correctAnswers.length !== selectedAnswers.length) return false

          const sortedCorrect = [...correctAnswers].sort()
          const sortedSelected = [...selectedAnswers].sort()
          return sortedCorrect.every((val, idx) => val === sortedSelected[idx])
        } else {
          // Single choice: compare single numbers
          const correctAnswer = Array.isArray(currentQuestion.correctAnswer)
            ? currentQuestion.correctAnswer[0]
            : currentQuestion.correctAnswer
          const selected = Array.isArray(context.selectedAnswer)
            ? context.selectedAnswer[0]
            : context.selectedAnswer
          return correctAnswer === selected
        }
      }

      const isCorrectForVideo = calculateIsCorrect()
      console.log(
        '[QAScreen] Animation feedback - isCorrectForVideo (for playback):',
        isCorrectForVideo
      )
      console.log('[QAScreen] context.selectedAnswer:', context.selectedAnswer)
      console.log('[QAScreen] currentQuestion.correctAnswer:', currentQuestion.correctAnswer)
      console.log('[QAScreen] Right video ref:', rightVideoRef.current)
      console.log('[QAScreen] Wrong video ref:', wrongVideoRef.current)

      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (isCorrectForVideo && rightVideoRef.current) {
          const video = rightVideoRef.current
          console.log('[QAScreen] Attempting to play right video')
          console.log('[QAScreen] Right video src:', video.src)
          console.log('[QAScreen] Right video readyState:', video.readyState)

          // Ensure video is ready
          if (video.readyState < 2) {
            // Video not loaded yet, wait for it
            video.addEventListener(
              'loadeddata',
              () => {
                console.log('[QAScreen] Right video loaded, attempting to play')
                const playPromise = video.play()
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      console.log('[QAScreen] Right video playing successfully')
                    })
                    .catch((error) => {
                      console.error('[QAScreen] Right video play failed:', error)
                      video.muted = true
                      video.play().catch((err) => {
                        console.error('[QAScreen] Right video play failed even when muted:', err)
                      })
                    })
                }
              },
              { once: true }
            )
          }

          // Load and play video
          video.load()
          const playPromise = video.play()

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('[QAScreen] Right video playing successfully')
              })
              .catch((error) => {
                console.error('[QAScreen] Right video play failed:', error)
                // Try playing with muted (some browsers require this)
                video.muted = true
                video.play().catch((err) => {
                  console.error('[QAScreen] Right video play failed even when muted:', err)
                })
              })
          } else {
            console.warn('[QAScreen] Right video play() returned undefined')
          }
        } else if (!isCorrectForVideo && wrongVideoRef.current) {
          const video = wrongVideoRef.current
          console.log('[QAScreen] Attempting to play wrong video')

          // Load and play video
          video.load()
          const playPromise = video.play()

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('[QAScreen] Wrong video playing successfully')
              })
              .catch((error) => {
                console.error('[QAScreen] Wrong video play failed:', error)
                // Try playing with muted (some browsers require this)
                video.muted = true
                video.play().catch((err) => {
                  console.error('[QAScreen] Wrong video play failed even when muted:', err)
                })
              })
          }
        }
      }, 50)

      return () => clearTimeout(timer)
    }
    // Return undefined for cleanup when condition is false
    return undefined
  }, [state, currentQuestion, context.selectedAnswer])

  // Note: Both correct and wrong answers now use video feedback
  // Both wait for user click to complete animation - no auto-complete

  // Error state
  if (context.error) {
    const isQuestionError = questionError !== null
    return (
      <div className="w-screen h-screen flex flex-col text-white overflow-auto">
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => {
              if (confirm('确定要重新开始吗？当前进度将被清除。')) {
                dispatch({ type: 'RESET_SESSION' })
              }
            }}
            className="p-3 bg-red-700/40 hover:bg-red-500/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-yellow-300/50 hover:border-yellow-400"
            title="重新开始"
          >
            <Icon icon={restartIcon} className="text-3xl text-yellow-300" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 md:px-16">
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 text-yellow-300">
            {isQuestionError ? '⚠️ 暂时没有题目' : '❌ 系统错误'}
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl opacity-90 mb-8 text-center max-w-3xl">
            {context.error}
          </div>
          {isQuestionError && (
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <button
                onClick={() => {
                  navigate('/admin/questions')
                }}
                className="px-8 sm:px-12 py-4 sm:py-5 text-xl sm:text-2xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 border-2 border-yellow-300 hover:border-yellow-400"
                style={{ backgroundColor: '#fbfdba' }}
              >
                <Icon icon={settingsIcon} className="text-2xl sm:text-3xl text-red-600" />
                <span className="text-red-600">前往答题管理</span>
              </button>
              <button
                onClick={async () => {
                  if (confirm('确定要重新选择题目吗？当前进度将被清除。')) {
                    await reloadQuestions()
                  }
                }}
                className="px-8 sm:px-12 py-4 sm:py-5 text-xl sm:text-2xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 border-2 border-yellow-300 hover:border-yellow-400"
                style={{ backgroundColor: '#fbfdba' }}
              >
                <Icon icon={refreshIcon} className="text-2xl sm:text-3xl text-red-600" />
                <span className="text-red-600">重新选择题目</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Loading state
  if (state === QAState.IDLE || !currentQuestion) {
    return (
      <div className="w-screen h-screen flex flex-col text-white overflow-auto">
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => {
              if (confirm('确定要重新开始吗？当前进度将被清除。')) {
                dispatch({ type: 'RESET_SESSION' })
              }
            }}
            className="p-3 bg-red-700/40 hover:bg-red-500/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-yellow-300/50 hover:border-yellow-400"
            title="重新开始"
          >
            <Icon icon={restartIcon} className="text-3xl text-yellow-300" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-8 border-yellow-300/20 border-t-yellow-300 rounded-full animate-spin" />
          <div className="mt-8 text-2xl sm:text-3xl opacity-80">加载中...</div>
        </div>
      </div>
    )
  }

  // Completion state
  if (state === QAState.COMPLETED) {
    const percentage = Math.round(
      (context.results.correctCount / context.results.totalAnswered) * 100
    )
    return (
      <div className="w-screen h-full flex flex-col text-white overflow-auto">
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => {
              if (confirm('确定要重新开始吗？当前进度将被清除。')) {
                dispatch({ type: 'RESET_SESSION' })
              }
            }}
            className="p-3 bg-red-700/40 hover:bg-red-500/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-yellow-300/50 hover:border-yellow-400"
            title="重新开始"
          >
            <Icon icon={restartIcon} className="text-3xl text-yellow-300" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 md:px-16">
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 sm:mb-12">
            🎉 答题完成!
          </div>
          <div className="text-6xl sm:text-7xl md:text-8xl font-bold mb-6 sm:mb-8">
            {percentage}%
          </div>
          <div className="text-2xl sm:text-3xl opacity-90 mb-12 sm:mb-16">
            正确: {context.results.correctCount} / {context.results.totalAnswered}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <button
              className="px-12 sm:px-16 py-5 sm:py-6 text-2xl sm:text-3xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 min-w-[180px] sm:min-w-[200px] flex items-center justify-center gap-3 border-2 border-yellow-300 hover:border-yellow-400"
              style={{ backgroundColor: '#fbfdba' }}
              onClick={async () => {
                const poolStatus = await checkQuestionPool()
                if (!poolStatus.hasAvailable) {
                  if (confirm(`${poolStatus.message}\n\n是否重新开始答题？`)) {
                    dispatch({ type: 'RESET_SESSION' })
                  }
                } else {
                  await reloadQuestions()
                }
              }}
            >
              <Icon icon={refreshIcon} className="text-2xl sm:text-3xl text-red-600" />
              <span className="text-red-600">重新获取题目</span>
            </button>
            <button
              className="px-12 sm:px-16 py-5 sm:py-6 text-2xl sm:text-3xl font-semibold rounded-xl bg-red-700 text-white shadow-lg hover:bg-red-800 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 min-w-[180px] sm:min-w-[200px]"
              onClick={() => dispatch({ type: 'RESET_SESSION' })}
            >
              重新开始
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen flex flex-col text-white font-sans overflow-auto">
      {/* Control Buttons - Top Right (Page-specific controls only) */}
      <div className="fixed top-4 right-4 z-40">
        {/* Restart Button - Page-specific functionality */}
        <button
          onClick={() => {
            if (confirm('确定要重新开始吗？当前进度将被清除。')) {
              dispatch({ type: 'RESET_SESSION' })
            }
          }}
          className="p-3 bg-red-700/40 hover:bg-red-500/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-yellow-300/50 hover:border-yellow-400"
          title="重新开始"
        >
          <Icon icon={restartIcon} className="text-3xl text-red-400" />
        </button>
        {/* Note: Fullscreen button is now global and rendered in App.tsx */}
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col px-4 sm:px-8 md:px-16 py-4 sm:py-6 md:py-8 bg-red-700/10 backdrop-blur-xs gap-4 shrink-0 border-b border-yellow-300/20">
        {/* 进度文本字体大小优化：1366x768 -> 1920x1080 -> 2560x1440 -> 4K */}
        <div className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl opacity-90">
          第 {progress.current} 题 / 共 {progress.total} 题
        </div>
        <div className="h-2 bg-red-800/50 rounded overflow-hidden">
          <div
            className="h-full bg-yellow-300 rounded transition-all duration-300 ease-out shadow-[0_0_10px_rgba(253,224,71,0.5)]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Question and Options - Scrollable Content */}
      <div className="flex-1 flex flex-col gap-6 justify-start px-6 sm:px-8 md:px-16 lg:px-24 pt-6 sm:pt-8 md:pt-10 lg:pt-12 pb-8 sm:pb-12 md:pb-16 overflow-auto">
        {/*
          Windows 常见分辨率字体优化：
          - 1366x768 (HD): text-2xl (24px)
          - 1920x1080 (Full HD): text-3xl (30px)
          - 2560x1440 (2K): text-4xl (36px)
          - 3840x2160 (4K): text-5xl (48px)
          使用更精细的断点确保在各种分辨率下都有良好的可读性
          注意：问题文本区域从顶部开始，避免被进度条遮挡
        */}
        <div
          className={`${getQuestionFontSize()} font-bold leading-relaxed text-left drop-shadow-md max-w-7xl mx-auto w-full wrap-break-word`}
        >
          <span className="whitespace-nowrap">{progress.current}. </span>
          <span className="inline">{currentQuestion.text}</span>
        </div>

        {/* Question Type Indicator - Hidden for buyer preview, uncomment if needed */}
        {/* <div className="flex items-center justify-center gap-4 mb-4">
          <span className="px-4 py-2 rounded-lg text-lg font-semibold bg-yellow-300/20 border-2 border-yellow-300">
            {currentQuestion.questionType === 'multiple' ? '多选题' : '单选题'}
          </span>
          <span className="px-4 py-2 rounded-lg text-lg font-semibold bg-yellow-300/20 border-2 border-yellow-300">
            {currentQuestion.optionType === 'true-false' ? '对错题' : '选项题'}
          </span>
        </div> */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-7xl mx-auto w-full">
          {(() => {
            // 计算所有选项的统一字体大小（基于最长选项）
            const optionFontSize = getOptionFontSize()
            return currentQuestion.options.map((option, index) => {
              // Check if this option is selected (supports both single and multiple choice)
              const isSelected = Array.isArray(context.selectedAnswer)
                ? context.selectedAnswer.includes(index)
                : context.selectedAnswer === index
              const isLocked = context.isAnswerLocked
              const label =
                currentQuestion.optionType === 'true-false'
                  ? index === 0
                    ? '✅'
                    : '❌'
                  : String.fromCharCode(65 + index) // A, B, C, D

              return (
                <button
                  key={index}
                  className={`
                    min-h-[80px] sm:min-h-[90px] md:min-h-[100px] lg:min-h-[120px] xl:min-h-[140px]
                    px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14 py-4 sm:py-5 md:py-6 lg:py-8 xl:py-10
                    border-4 rounded-2xl
                    backdrop-blur-md
                    flex items-center
                    select-none
                    transition-all duration-200
                    ${
                      isSelected
                        ? 'bg-yellow-300/30 border-yellow-400 shadow-[0_0_20px_rgba(253,224,71,0.6)]'
                        : 'bg-yellow-300/10 border-yellow-300/30 hover:bg-yellow-300/20 hover:border-yellow-400/50 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(253,224,71,0.3)]'
                    }
                    ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer active:-translate-y-0.5'}
                  `}
                  onClick={() => {
                    if (!isLocked) {
                      dispatch({ type: 'SELECT_ANSWER', answerIndex: index })
                    }
                  }}
                  disabled={isLocked}
                >
                  {/*
                    选项标签和文本字体大小根据最长选项动态调整：
                    - 所有选项使用相同的字体大小（基于最长选项）
                    - 对错题和选项题都适用
                    - 如果有一个选项特别长，所有选项都使用较小的字体
                  */}
                  <span
                    className={`font-bold ${optionFontSize.label} mr-3 sm:mr-4 md:mr-6 min-w-[30px] sm:min-w-[35px] md:min-w-[40px] lg:min-w-[45px]`}
                  >
                    {label}
                  </span>
                  <span className={`flex-1 text-left ${optionFontSize.text}`}>{option}</span>
                  {isSelected && currentQuestion.questionType === 'multiple' && (
                    <span className={`ml-2 text-yellow-300 ${optionFontSize.label}`}>✓</span>
                  )}
                </button>
              )
            })
          })()}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="px-4 sm:px-8 md:px-16 py-4 sm:py-6 md:py-8 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-8 shrink-0 bg-red-700/10">
        {/* Navigation Buttons */}
        <div className="flex gap-3 sm:gap-4">
          {/* 导航按钮字体大小优化：1366x768 -> 1920x1080 -> 2560x1440 -> 4K */}
          <button
            className={`
              px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-7
              text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold rounded-lg
              min-w-[100px] sm:min-w-[120px] md:min-w-[140px] lg:min-w-[160px] xl:min-w-[180px]
              shadow-md
              transition-all duration-200
              flex items-center justify-center gap-2
              ${
                isFirstQuestion || state === QAState.ANIMATION_FEEDBACK
                  ? 'bg-red-700/30 text-yellow-200/50 opacity-50 cursor-not-allowed border border-yellow-300/30'
                  : 'bg-red-700 text-white hover:bg-red-800 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 border-2 border-yellow-300'
              }
            `}
            onClick={() => dispatch({ type: 'PREVIOUS_QUESTION' })}
            disabled={isFirstQuestion || state === QAState.ANIMATION_FEEDBACK}
            title="上一题"
          >
            <Icon
              icon={arrowLeftIcon}
              className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl"
            />
            <span>上一题</span>
          </button>
          <button
            className={`
              px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-7
              text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold rounded-lg
              min-w-[100px] sm:min-w-[120px] md:min-w-[140px] lg:min-w-[160px] xl:min-w-[180px]
              shadow-md
              transition-all duration-200
              flex items-center justify-center gap-2
              ${
                isLastQuestion || state === QAState.ANIMATION_FEEDBACK
                  ? 'bg-red-700/30 text-yellow-200/50 opacity-50 cursor-not-allowed border border-yellow-300/30'
                  : 'bg-red-700 text-white hover:bg-red-800 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 border-2 border-yellow-300'
              }
            `}
            onClick={() => dispatch({ type: 'NEXT_QUESTION' })}
            disabled={isLastQuestion || state === QAState.ANIMATION_FEEDBACK}
            title="下一题"
          >
            <span>下一题</span>
            <Icon
              icon={arrowRightIcon}
              className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl"
            />
          </button>
        </div>

        {/* 确认答案按钮字体大小优化：1366x768 -> 1920x1080 -> 2560x1440 -> 4K */}
        <button
          className={`
            px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-7
            text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold rounded-lg
            min-w-[140px] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px] xl:min-w-[220px]
            shadow-md
            transition-all duration-200
            ${
              context.selectedAnswer === null ||
              context.isAnswerLocked ||
              state !== QAState.ANSWER_SELECTED
                ? 'bg-red-700/30 text-yellow-200/50 opacity-50 cursor-not-allowed border border-yellow-300/30'
                : 'bg-yellow-300 text-red-600 hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 border-2 border-yellow-300'
            }
          `}
          onClick={() => dispatch({ type: 'CONFIRM_ANSWER' })}
          disabled={
            context.selectedAnswer === null ||
            context.isAnswerLocked ||
            state !== QAState.ANSWER_SELECTED ||
            (currentQuestion.questionType === 'multiple' &&
              Array.isArray(context.selectedAnswer) &&
              context.selectedAnswer.length === 0)
          }
        >
          确认答案
        </button>

        {/* 重新选题按钮 */}
        <button
          className={`
            px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-7
            text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold rounded-lg
            min-w-[140px] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px] xl:min-w-[220px]
            shadow-md
            transition-all duration-200
            flex items-center justify-center gap-2
            ${
              state === QAState.ANIMATION_FEEDBACK
                ? 'bg-red-700/30 text-yellow-200/50 opacity-50 cursor-not-allowed border border-yellow-300/30'
                : 'bg-red-700 text-white hover:bg-red-800 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 border-2 border-yellow-300'
            }
          `}
          onClick={async () => {
            if (confirm('确定要重新选择题目吗？当前进度将被清除。')) {
              try {
                // 先重置状态，然后重新加载题目
                dispatch({ type: 'RESET_SESSION' })
                // 等待一小段时间确保状态已重置，然后重新加载题目
                await new Promise((resolve) => setTimeout(resolve, 100))
                await reloadQuestions()
              } catch (error) {
                console.error('[QAScreen] Failed to reload questions:', error)
              }
            }
          }}
          disabled={state === QAState.ANIMATION_FEEDBACK}
          title="重新选择题目"
        >
          <Icon
            icon={refreshIcon}
            className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl"
          />
          <span>重新选题</span>
        </button>
      </div>

      {/* Animation Overlay */}
      {state === QAState.ANIMATION_FEEDBACK && (
        <>
          {(() => {
            // Use the same calculation logic as in useEffect
            const isCorrectForDisplay = (() => {
              if (context.selectedAnswer === null) return false

              if (currentQuestion.questionType === 'multiple') {
                const correctAnswers = Array.isArray(currentQuestion.correctAnswer)
                  ? currentQuestion.correctAnswer
                  : [currentQuestion.correctAnswer]
                const selectedAnswers = Array.isArray(context.selectedAnswer)
                  ? context.selectedAnswer
                  : [context.selectedAnswer]

                if (correctAnswers.length !== selectedAnswers.length) return false

                const sortedCorrect = [...correctAnswers].sort()
                const sortedSelected = [...selectedAnswers].sort()
                return sortedCorrect.every((val, idx) => val === sortedSelected[idx])
              } else {
                const correctAnswer = Array.isArray(currentQuestion.correctAnswer)
                  ? currentQuestion.correctAnswer[0]
                  : currentQuestion.correctAnswer
                const selected = Array.isArray(context.selectedAnswer)
                  ? context.selectedAnswer[0]
                  : context.selectedAnswer
                return correctAnswer === selected
              }
            })()

            console.log('[QAScreen] Rendering animation overlay')
            console.log('[QAScreen] isCorrectForDisplay (for rendering):', isCorrectForDisplay)
            console.log('[QAScreen] context.selectedAnswer:', context.selectedAnswer)
            console.log('[QAScreen] currentQuestion.correctAnswer:', currentQuestion.correctAnswer)

            if (!isCorrectForDisplay) {
              return (
                // 答错题时播放视频
                <>
                  <video
                    ref={wrongVideoRef}
                    src={wrongVideo}
                    autoPlay
                    playsInline
                    muted
                    loop={false}
                    preload="auto"
                    className="fixed inset-0 w-full h-full object-cover z-40"
                    style={{
                      zIndex: 40
                    }}
                    onError={(e) => {
                      console.error('[QAScreen] Wrong video playback error:', e)
                      console.error('[QAScreen] Video element:', wrongVideoRef.current)
                      console.error('[QAScreen] Video src:', wrongVideoRef.current?.src)
                      console.error('[QAScreen] Video error details:', wrongVideoRef.current?.error)
                      // 如果视频加载失败，显示文本反馈
                    }}
                    onLoadedData={() => {
                      console.log('[QAScreen] Wrong video loaded successfully')
                      if (wrongVideoRef.current) {
                        const video = wrongVideoRef.current
                        console.log('[QAScreen] Wrong video dimensions:', {
                          videoWidth: video.videoWidth,
                          videoHeight: video.videoHeight,
                          clientWidth: video.clientWidth,
                          clientHeight: video.clientHeight,
                          offsetWidth: video.offsetWidth,
                          offsetHeight: video.offsetHeight
                        })
                      }
                    }}
                    onCanPlay={() => {
                      console.log('[QAScreen] Wrong video can play')
                    }}
                    onEnded={() => {
                      // 视频播放完成后，停留在最后一帧，不自动隐藏
                      // 等待用户点击屏幕
                      console.log('[QAScreen] Wrong video ended, waiting for user click')
                    }}
                  />
                  {/* 答错文字提示 - 无背景 */}
                  <div className="fixed inset-0 flex flex-col gap-6 items-center justify-center z-50 pointer-events-none">
                    <div
                      className={`
                  text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] 2xl:text-[16rem] animate-scale-in
                  text-red-300 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]
                `}
                    >
                      ✗ 错误
                    </div>
                  </div>
                  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl opacity-80 text-yellow-200 z-50 pointer-events-none">
                    点击屏幕继续
                  </div>
                  {/* 点击区域 - 覆盖整个屏幕 */}
                  <div
                    className="fixed inset-0 cursor-pointer z-50"
                    onClick={() => {
                      // 停止视频播放
                      if (wrongVideoRef.current) {
                        wrongVideoRef.current.pause()
                        wrongVideoRef.current.currentTime = 0
                      }
                      dispatch({ type: 'ANIMATION_COMPLETE' })
                    }}
                  />
                </>
              )
            } else {
              return (
                // 答对题时播放视频
                <>
                  <video
                    ref={rightVideoRef}
                    src={rightVideo}
                    autoPlay
                    playsInline
                    muted
                    loop={false}
                    preload="auto"
                    className="fixed inset-0 w-full h-full object-cover z-40"
                    style={{
                      zIndex: 40
                    }}
                    onError={(e) => {
                      console.error('[QAScreen] Right video playback error:', e)
                      if (rightVideoRef.current) {
                        const video = rightVideoRef.current
                        console.error('[QAScreen] Video element:', video)
                        console.error('[QAScreen] Video src:', video.src)
                        console.error('[QAScreen] Video error details:', video.error)
                        console.error('[QAScreen] Video error code:', video.error?.code)
                        console.error('[QAScreen] Video error message:', video.error?.message)
                        console.error('[QAScreen] Video dimensions:', {
                          videoWidth: video.videoWidth,
                          videoHeight: video.videoHeight
                        })
                      }
                      // 如果视频加载失败，显示文本反馈
                    }}
                    onLoadedData={() => {
                      console.log('[QAScreen] Right video loaded successfully')
                      if (rightVideoRef.current) {
                        const video = rightVideoRef.current
                        console.log('[QAScreen] Right video dimensions:', {
                          videoWidth: video.videoWidth,
                          videoHeight: video.videoHeight,
                          clientWidth: video.clientWidth,
                          clientHeight: video.clientHeight,
                          offsetWidth: video.offsetWidth,
                          offsetHeight: video.offsetHeight,
                          readyState: video.readyState,
                          duration: video.duration,
                          error: video.error,
                          getBoundingClientRect: video.getBoundingClientRect(),
                          computedStyle: {
                            display: window.getComputedStyle(video).display,
                            visibility: window.getComputedStyle(video).visibility,
                            opacity: window.getComputedStyle(video).opacity,
                            zIndex: window.getComputedStyle(video).zIndex,
                            position: window.getComputedStyle(video).position
                          }
                        })
                        // 如果视频尺寸为 0，尝试重新加载
                        if (video.videoWidth === 0 || video.videoHeight === 0) {
                          console.warn(
                            '[QAScreen] Right video has zero dimensions, attempting to reload'
                          )
                          video.load()
                        }
                      }
                    }}
                    onLoadedMetadata={() => {
                      console.log('[QAScreen] Right video metadata loaded')
                      if (rightVideoRef.current) {
                        const video = rightVideoRef.current
                        console.log('[QAScreen] Right video metadata:', {
                          videoWidth: video.videoWidth,
                          videoHeight: video.videoHeight,
                          duration: video.duration,
                          readyState: video.readyState
                        })
                      }
                    }}
                    onCanPlay={() => {
                      console.log('[QAScreen] Right video can play')
                    }}
                    onEnded={() => {
                      // 视频播放完成后，停留在最后一帧，不自动隐藏
                      // 等待用户点击屏幕
                      console.log('[QAScreen] Right video ended, waiting for user click')
                    }}
                  />
                  {/* 答对文字提示 - 无背景 */}
                  <div className="fixed inset-0 flex flex-col gap-6 items-center justify-center z-50 pointer-events-none">
                    <div
                      className={`
                  text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] 2xl:text-[16rem] animate-scale-in
                  text-yellow-300 drop-shadow-[0_0_20px_rgba(253,224,71,0.8)]
                `}
                    >
                      ✓ 正确
                    </div>
                  </div>
                  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl opacity-80 text-yellow-200 z-50 pointer-events-none">
                    点击屏幕继续
                  </div>
                  {/* 点击区域 - 覆盖整个屏幕 */}
                  <div
                    className="fixed inset-0 cursor-pointer z-50"
                    onClick={() => {
                      // 停止视频播放
                      if (rightVideoRef.current) {
                        rightVideoRef.current.pause()
                        rightVideoRef.current.currentTime = 0
                      }
                      dispatch({ type: 'ANIMATION_COMPLETE' })
                    }}
                  />
                </>
              )
            }
          })()}
        </>
      )}
    </div>
  )
}
