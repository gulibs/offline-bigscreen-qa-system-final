/**
 * Question Editor Component
 * Step-by-step form for creating/editing questions
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Icon } from '@iconify/react'
import { cn } from '@renderer/utils/cn'
import saveIcon from '@iconify-icons/mdi/content-save'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import addIcon from '@iconify-icons/mdi/plus'
import deleteIcon from '@iconify-icons/mdi/delete'
import { LoadingSpinner } from './LoadingSpinner'
import { getQuestions, addQuestion, updateQuestion } from '../services/questionStorage'
import type { Question, QuestionType, OptionType } from '../types/question'

type Step = 1 | 2 | 3 | 4 | 5

export function QuestionEditor(): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const questionId = searchParams.get('id')

  const [isLoading, setIsLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<QuestionType | ''>('')
  const [optionType, setOptionType] = useState<OptionType | ''>('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [correctAnswer, setCorrectAnswer] = useState<number | number[] | null>(null)
  // Scroll state for header background
  const [isScrolled, setIsScrolled] = useState(false)
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref for cleanup function
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (questionId) {
      loadQuestion()
    } else {
      setIsLoading(false)
    }
  }, [questionId])

  // Ref callback to set up scroll listener when ref is attached
  const setScrollContainerRef = (node: HTMLDivElement | null): void => {
    // Clean up previous listener if exists
    if (scrollCleanupRef.current) {
      scrollCleanupRef.current()
      scrollCleanupRef.current = null
    }

    scrollContainerRef.current = node

    if (node) {
      const handleScroll = (): void => {
        setIsScrolled(node.scrollTop > 0)
      }

      node.addEventListener('scroll', handleScroll, { passive: true })

      // Store cleanup function
      scrollCleanupRef.current = () => {
        node.removeEventListener('scroll', handleScroll)
      }
    }
  }

  const loadQuestion = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const questions = await getQuestions()
      const question = questions.find((q) => q.id === questionId)
      if (question) {
        setQuestionText(question.text)
        setQuestionType(question.questionType)
        setOptionType(question.optionType)
        setOptions(question.options)
        setCorrectAnswer(question.correctAnswer)
        // Auto-advance to step 5 if editing
        setCurrentStep(5)
      }
    } catch (error) {
      console.error('[QuestionEditor] Failed to load question:', error)
      alert('加载题目失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = (): void => {
    navigate('/admin/questions')
  }

  const handleNext = (): void => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step)
    }
  }

  const handlePrev = (): void => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const handleAddOption = (): void => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number): void => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
      // Adjust correct answer if needed
      if (correctAnswer !== null) {
        if (Array.isArray(correctAnswer)) {
          setCorrectAnswer(
            correctAnswer.filter((ans) => ans !== index).map((ans) => (ans > index ? ans - 1 : ans))
          )
        } else if (correctAnswer === index) {
          setCorrectAnswer(null)
        } else if (correctAnswer > index) {
          setCorrectAnswer(correctAnswer - 1)
        }
      }
    }
  }

  const handleOptionChange = (index: number, value: string): void => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCorrectAnswerChange = (index: number): void => {
    if (questionType === 'single') {
      setCorrectAnswer(index)
    } else {
      // Multiple choice
      const current = Array.isArray(correctAnswer) ? correctAnswer : []
      if (current.includes(index)) {
        setCorrectAnswer(current.filter((i) => i !== index))
      } else {
        setCorrectAnswer([...current, index])
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    // Validation
    if (!questionText.trim()) {
      alert('请输入题目内容')
      return
    }
    if (!questionType) {
      alert('请选择题型')
      return
    }
    if (!optionType) {
      alert('请选择选项类型')
      return
    }
    if (optionType === 'letter-options' && options.some((opt) => !opt.trim())) {
      alert('请填写所有选项')
      return
    }
    if (correctAnswer === null) {
      alert('请设置正确答案')
      return
    }
    if (
      questionType === 'multiple' &&
      (!Array.isArray(correctAnswer) || correctAnswer.length === 0)
    ) {
      alert('多选题至少需要选择一个正确答案')
      return
    }

    try {
      const questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> = {
        text: questionText.trim(),
        questionType,
        optionType,
        options: optionType === 'true-false' ? ['正确', '错误'] : options.map((opt) => opt.trim()),
        correctAnswer
      }

      if (questionId) {
        await updateQuestion(questionId, questionData)
        alert('题目更新成功')
      } else {
        await addQuestion(questionData)
        alert('题目添加成功')
      }

      navigate('/admin/questions')
    } catch (error) {
      console.error('[QuestionEditor] Failed to save question:', error)
      alert('保存失败，请重试')
    }
  }

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return questionType !== ''
      case 2:
        return optionType !== ''
      case 3:
        if (optionType === 'true-false') return true
        return options.every((opt) => opt.trim() !== '') && options.length >= 2
      case 4:
        return correctAnswer !== null
      case 5:
        return questionText.trim() !== ''
      default:
        return false
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full relative z-10">
        <LoadingSpinner size="xl" variant="ring" text="加载中..." fullScreen={false} />
      </div>
    )
  }

  return (
    <div
      ref={setScrollContainerRef}
      className="flex flex-col w-full relative z-10 h-screen overflow-y-auto"
    >
      <div className="w-full">
        {/* Header */}
        <div
          className={cn(
            'sticky top-0 py-8 px-36 backdrop-blur-lg z-20 transition-colors duration-200',
            {
              'bg-red-600/80 backdrop-blur-xs': isScrolled
            }
          )}
        >
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBack}
              className="shrink-0 p-2 hover:opacity-80 transition-opacity"
              title="返回答题管理"
            >
              <Icon icon={arrowLeftIcon} className="text-3xl text-white" />
            </button>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {questionId ? '编辑题目' : '添加题目'}
              </h1>
              <p className="text-lg text-red-100">分步骤创建题目</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    step === currentStep
                      ? 'bg-yellow-300 border-yellow-400 text-red-600 font-bold'
                      : step < currentStep
                        ? 'bg-green-500 border-green-600 text-white'
                        : 'bg-gray-300 border-gray-400 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-36">
          <div
            className="p-8 rounded-xl shadow-lg border-2 border-yellow-300"
            style={{ backgroundColor: '#fbfdba' }}
          >
            {/* Step 1: Question Type */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">第一步：选择题型</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setQuestionType('single')
                      setCorrectAnswer(null)
                    }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      questionType === 'single'
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-yellow-400'
                    }`}
                  >
                    <div className="text-xl font-bold text-gray-800 mb-2">单选题</div>
                    <div className="text-sm text-gray-600">只能选择一个答案</div>
                  </button>
                  <button
                    onClick={() => {
                      setQuestionType('multiple')
                      setCorrectAnswer([])
                    }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      questionType === 'multiple'
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-yellow-400'
                    }`}
                  >
                    <div className="text-xl font-bold text-gray-800 mb-2">多选题</div>
                    <div className="text-sm text-gray-600">可以选择多个答案</div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Option Type */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">第二步：选择选项类型</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setOptionType('true-false')
                      setOptions(['正确', '错误'])
                    }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      optionType === 'true-false'
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-yellow-400'
                    }`}
                  >
                    <div className="text-xl font-bold text-gray-800 mb-2">对错题</div>
                    <div className="text-sm text-gray-600">✅ 或 ❌ 按钮</div>
                  </button>
                  <button
                    onClick={() => {
                      setOptionType('letter-options')
                      setOptions(['', ''])
                    }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      optionType === 'letter-options'
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-yellow-400'
                    }`}
                  >
                    <div className="text-xl font-bold text-gray-800 mb-2">选项题</div>
                    <div className="text-sm text-gray-600">A/B/C/D 选项</div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Add Options (only for letter-options) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">第三步：添加选项</h2>
                {optionType === 'true-false' ? (
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                    <p className="text-gray-700">对错题只有两个固定选项：✅ 正确 和 ❌ 错误</p>
                    <p className="text-sm text-gray-600 mt-2">可以直接进入下一步</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-8 text-center font-bold text-gray-700">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                          placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => handleRemoveOption(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="删除选项"
                          >
                            <Icon icon={deleteIcon} className="text-xl" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={handleAddOption}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Icon icon={addIcon} className="text-lg" />
                      <span>添加选项</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Set Correct Answer */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">第四步：设置正确答案</h2>
                <div className="space-y-3">
                  {options.map((option, index) => {
                    const isSelected = Array.isArray(correctAnswer)
                      ? correctAnswer.includes(index)
                      : correctAnswer === index
                    return (
                      <button
                        key={index}
                        onClick={() => handleCorrectAnswerChange(index)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-300 bg-white hover:border-yellow-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 text-center font-bold text-gray-700">
                            {optionType === 'true-false'
                              ? index === 0
                                ? '✅'
                                : '❌'
                              : String.fromCharCode(65 + index)}
                          </span>
                          <span className="flex-1 text-gray-800">{option}</span>
                          {isSelected && (
                            <span className="text-green-600 font-bold text-xl">✓</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {questionType === 'multiple' && (
                  <p className="text-sm text-gray-600 mt-2">提示：多选题可以选择多个正确答案</p>
                )}
              </div>
            )}

            {/* Step 5: Question Text */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">第五步：输入题目内容</h2>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 min-h-[200px] resize-y"
                  placeholder="请输入题目内容..."
                  autoFocus
                />
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <p className="text-sm text-gray-700 font-semibold mb-2">题目预览：</p>
                  <div className="space-y-2">
                    <p className="text-gray-800 font-medium">{questionText || '(未输入)'}</p>
                    <div className="space-y-1">
                      {options.map((option, index) => {
                        const isCorrect = Array.isArray(correctAnswer)
                          ? correctAnswer.includes(index)
                          : correctAnswer === index
                        return (
                          <div
                            key={index}
                            className={`text-sm ${
                              isCorrect ? 'text-green-700 font-bold' : 'text-gray-600'
                            }`}
                          >
                            {optionType === 'true-false'
                              ? index === 0
                                ? '✅ 正确'
                                : '❌ 错误'
                              : `${String.fromCharCode(65 + index)}. ${option}`}
                            {isCorrect && ' ✓'}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-300">
              <button
                onClick={handlePrev}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  currentStep === 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                上一步
              </button>
              {currentStep < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className={`px-6 py-3 rounded-lg transition-colors ${
                    canProceedToNext()
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!canProceedToNext()}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    canProceedToNext()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Icon icon={saveIcon} className="text-xl" />
                  <span>保存题目</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
