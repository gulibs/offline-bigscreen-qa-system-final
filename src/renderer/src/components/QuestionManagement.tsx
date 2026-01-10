/**
 * Question Management Component
 * Manage questions for Q&A system
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import { cn } from '@renderer/utils/cn'
import addIcon from '@iconify-icons/mdi/plus'
import editIcon from '@iconify-icons/mdi/pencil'
import deleteIcon from '@iconify-icons/mdi/delete'
import uploadIcon from '@iconify-icons/mdi/upload'
import downloadIcon from '@iconify-icons/mdi/download'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import checkboxIcon from '@iconify-icons/mdi/checkbox-marked'
import checkboxBlankIcon from '@iconify-icons/mdi/checkbox-blank-outline'
import logoutIcon from '@iconify-icons/mdi/logout'
import { LoadingSpinner } from './LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import { ImportResultDialog, type ImportResult } from './ImportResultDialog'
import { getQuestions, deleteQuestion, importQuestions } from '../services/questionStorage'
import {
  generateQuestionsTemplate,
  parseQuestionsFromExcel,
  validateQuestionsExcelFormat
} from '../services/templateGenerator'
import type { Question } from '../types/question'

export function QuestionManagement(): React.JSX.Element {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'single' | 'multiple'>('all')
  const [filterOptionType, setFilterOptionType] = useState<'all' | 'true-false' | 'letter-options'>(
    'all'
  )
  // Import result dialog state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  // Selection state for batch operations
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  // Scroll state for header background
  const [isScrolled, setIsScrolled] = useState(false)
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref for cleanup function
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  // 加载题目函数，区分数据库错误和空结果
  const loadQuestions = async (showError = true): Promise<void> => {
    try {
      setIsLoading(true)
      const loaded = await getQuestions()
      // 查询成功，即使返回空数组也是正常情况，不需要提示错误
      setQuestions(loaded)
    } catch (error) {
      // 只有在真正的数据库错误时才提示
      if (showError) {
        console.error('[QuestionManagement] Failed to load questions:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        // 检查是否是数据库连接问题
        if (
          errorMessage.includes('Database API not available') ||
          errorMessage.includes('Failed to get questions')
        ) {
          alert('加载题目失败：数据库连接错误，请重试')
        } else {
          alert('加载题目失败，请重试')
        }
      } else {
        // 静默失败，只记录日志
        console.error('[QuestionManagement] Failed to load questions:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // 初始加载时显示错误提示
    loadQuestions(true)
  }, [])

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

  const handleBack = (): void => {
    navigate('/admin')
  }

  const handleLogout = (): void => {
    if (confirm('确定要退出登录吗？')) {
      logout()
    }
  }

  const handleAdd = (): void => {
    navigate('/admin/questions/edit')
  }

  const handleEdit = (question: Question): void => {
    navigate(`/admin/questions/edit?id=${question.id}`)
  }

  const handleDelete = async (question: Question): Promise<void> => {
    if (!confirm(`确定要删除题目"${question.text.substring(0, 30)}..."吗？`)) {
      return
    }

    try {
      const success = await deleteQuestion(question.id)
      if (success) {
        // 删除后重新加载，不显示错误（空结果也是正常的）
        await loadQuestions(false)
        // Remove from selection if selected
        setSelectedQuestions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(question.id)
          return newSet
        })
        alert('题目删除成功')
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('[QuestionManagement] Failed to delete question:', error)
      alert('删除题目失败，请重试')
    }
  }

  // Handle question selection
  const handleQuestionSelect = (questionId: string, checked: boolean): void => {
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(questionId)
      } else {
        newSet.delete(questionId)
      }
      return newSet
    })
  }

  // Check if all filtered questions are selected
  const areAllFilteredSelected = (): boolean => {
    if (filteredQuestions.length === 0) return false
    return filteredQuestions.every((q) => selectedQuestions.has(q.id))
  }

  // Handle select all / deselect all
  const handleSelectAll = (): void => {
    if (areAllFilteredSelected()) {
      // Deselect all filtered questions
      setSelectedQuestions((prev) => {
        const newSet = new Set(prev)
        filteredQuestions.forEach((q) => newSet.delete(q.id))
        return newSet
      })
    } else {
      // Select all filtered questions
      setSelectedQuestions((prev) => {
        const newSet = new Set(prev)
        filteredQuestions.forEach((q) => newSet.add(q.id))
        return newSet
      })
    }
  }

  // Handle batch delete
  const handleBatchDelete = async (): Promise<void> => {
    if (selectedQuestions.size === 0) {
      alert('请先选择要删除的题目')
      return
    }

    const selectedCount = selectedQuestions.size
    const message = `确定要删除选中的 ${selectedCount} 道题目吗？`

    if (confirm(message)) {
      try {
        const questionsToDelete = Array.from(selectedQuestions)
        let successCount = 0
        let failCount = 0

        for (const questionId of questionsToDelete) {
          try {
            const success = await deleteQuestion(questionId)
            if (success) {
              successCount++
            } else {
              failCount++
            }
          } catch (error) {
            console.error(`[QuestionManagement] Failed to delete question ${questionId}:`, error)
            failCount++
          }
        }

        // Clear selection
        setSelectedQuestions(new Set())

        // Reload questions
        await loadQuestions(false)

        if (failCount === 0) {
          alert(`成功删除 ${successCount} 道题目`)
        } else {
          alert(`删除完成：成功 ${successCount} 道，失败 ${failCount} 道`)
        }
      } catch (error) {
        console.error('[QuestionManagement] Failed to batch delete questions:', error)
        alert('批量删除失败，请重试')
      }
    }
  }

  const handleImport = async (): Promise<void> => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        // Step 1: Validate Excel format first
        const validation = await validateQuestionsExcelFormat(file)

        if (!validation.isValid) {
          // Show validation errors in dialog
          const result: ImportResult = {
            successCount: 0,
            totalCount: 0,
            errors: validation.errors.map((err) => ({
              index: err.row - 1, // Convert to 0-based index
              message: err.row === 0 ? err.message : `第 ${err.row} 行：${err.message}`
            }))
          }
          setImportResult(result)
          setShowImportDialog(true)
          return
        }

        // Step 2: If validation passed, parse and import
        const parsedQuestions = await parseQuestionsFromExcel(file)

        if (parsedQuestions.length === 0) {
          const result: ImportResult = {
            successCount: 0,
            totalCount: 0,
            errors: [{ index: 0, message: '文件中没有有效的题目数据' }]
          }
          setImportResult(result)
          setShowImportDialog(true)
          return
        }

        // Step 3: Import questions with validation
        const result: ImportResult = {
          successCount: 0,
          totalCount: parsedQuestions.length,
          errors: []
        }

        const convertedQuestions: Question[] = []
        for (let i = 0; i < parsedQuestions.length; i++) {
          const q = parsedQuestions[i]
          try {
            // Additional validation
            if (!q.text || q.text.trim() === '') {
              result.errors.push({ index: i, message: '题目内容不能为空' })
              continue
            }

            // Validate based on option type
            if (q.optionType === 'true-false') {
              // True-false questions: must have exactly 2 options ['正确', '错误']
              if (q.options.length !== 2) {
                result.errors.push({
                  index: i,
                  message: '对错题的选项数量必须为2个（正确、错误）'
                })
                continue
              }
              if (q.options[0] !== '正确' || q.options[1] !== '错误') {
                result.errors.push({
                  index: i,
                  message: '对错题的选项必须为["正确", "错误"]'
                })
                continue
              }
              // Validate correct answer for true-false (0 or 1)
              if (typeof q.correctAnswer !== 'number' || ![0, 1].includes(q.correctAnswer)) {
                result.errors.push({
                  index: i,
                  message: '对错题的正确答案必须是 0（正确）或 1（错误）'
                })
                continue
              }
            } else {
              // Letter-options questions: must have exactly 4 options
              if (q.options.length !== 4) {
                result.errors.push({ index: i, message: '选项题的选项数量必须为4个（A/B/C/D）' })
                continue
              }
              if (q.options.some((opt) => !opt || opt.trim() === '')) {
                result.errors.push({ index: i, message: '选项题的所有选项（A/B/C/D）都不能为空' })
                continue
              }
              // Validate correct answer for letter-options
              // Handle both single choice (number) and multiple choice (number[])
              if (q.questionType === 'multiple') {
                // Multiple choice: validate array of numbers (0-3)
                if (!Array.isArray(q.correctAnswer)) {
                  result.errors.push({
                    index: i,
                    message: '多选题的正确答案必须是数组格式'
                  })
                  continue
                }
                const invalidAnswers = (q.correctAnswer as number[]).filter(
                  (a) => typeof a !== 'number' || ![0, 1, 2, 3].includes(a)
                )
                if (invalidAnswers.length > 0) {
                  result.errors.push({
                    index: i,
                    message: `选项题的正确答案必须为 0、1、2 或 3（对应A/B/C/D），当前包含无效数字：${invalidAnswers.join(', ')}`
                  })
                  continue
                }
              } else {
                // Single choice: validate single number (0-3)
                if (
                  typeof q.correctAnswer !== 'number' ||
                  ![0, 1, 2, 3].includes(q.correctAnswer)
                ) {
                  result.errors.push({
                    index: i,
                    message: '选项题的正确答案必须是 0、1、2 或 3（对应A/B/C/D）'
                  })
                  continue
                }
              }
            }

            convertedQuestions.push({
              ...q,
              id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: Date.now(),
              updatedAt: Date.now()
            })
            result.successCount++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误'
            result.errors.push({ index: i, message: errorMessage })
          }
        }

        // Step 4: Import valid questions to database
        if (convertedQuestions.length > 0) {
          await importQuestions(convertedQuestions)
          // 导入后重新加载，不显示错误（空结果也是正常的）
          await loadQuestions(false)
        }

        // Step 5: Show result dialog
        setImportResult(result)
        setShowImportDialog(true)

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('[QuestionManagement] Import warnings:', validation.warnings)
        }
      } catch (error) {
        console.error('[QuestionManagement] Failed to import questions:', error)
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        const result: ImportResult = {
          successCount: 0,
          totalCount: 0,
          errors: [{ index: 0, message: `导入失败：${errorMessage}` }]
        }
        setImportResult(result)
        setShowImportDialog(true)
      }
    }
    input.click()
  }

  const filteredQuestions = questions.filter((q) => {
    if (filterType !== 'all' && q.questionType !== filterType) return false
    if (filterOptionType !== 'all' && q.optionType !== filterOptionType) return false
    return true
  })

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Page Back Button - Left of Title */}
              <button
                onClick={handleBack}
                className="shrink-0 p-2 hover:opacity-80 transition-opacity"
                title="返回管理后台"
              >
                <Icon icon={arrowLeftIcon} className="text-3xl text-white" />
              </button>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">答题管理</h1>
                <p className="text-lg text-red-100">管理答题题目和选项</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await generateQuestionsTemplate()
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                style={{ backgroundColor: '#fbfdba' }}
                title="下载导入模板"
              >
                <Icon icon={downloadIcon} className="text-xl" />
                <span>下载模板</span>
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                style={{ backgroundColor: '#fbfdba' }}
              >
                <Icon icon={uploadIcon} className="text-xl" />
                <span>导入题目</span>
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                style={{ backgroundColor: '#fbfdba' }}
              >
                <Icon icon={addIcon} className="text-xl" />
                <span>添加题目</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90 border-2 border-yellow-300"
                style={{ backgroundColor: '#fbfdba' }}
                title="退出登录"
              >
                <Icon icon={logoutIcon} className="text-xl" />
                <span>退出登录</span>
              </button>
            </div>
          </div>

          {/* Filters and Selection */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">题型：</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'single' | 'multiple')}
                  className="px-3 py-1 rounded border-2 border-yellow-300 bg-white text-gray-800"
                >
                  <option value="all">全部</option>
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">选项类型：</span>
                <select
                  value={filterOptionType}
                  onChange={(e) =>
                    setFilterOptionType(e.target.value as 'all' | 'true-false' | 'letter-options')
                  }
                  className="px-3 py-1 rounded border-2 border-yellow-300 bg-white text-gray-800"
                >
                  <option value="all">全部</option>
                  <option value="true-false">对错题</option>
                  <option value="letter-options">选项题</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Select All Button */}
              {filteredQuestions.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-md text-gray-800 font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#fbfdba' }}
                >
                  {areAllFilteredSelected() ? (
                    <Icon icon={checkboxIcon} className="text-xl text-red-600" />
                  ) : (
                    <Icon icon={checkboxBlankIcon} className="text-xl text-gray-600" />
                  )}
                  <span>{areAllFilteredSelected() ? '取消全选' : '全选'}</span>
                </button>
              )}
              {/* Batch Delete Button */}
              {selectedQuestions.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors shadow-md font-semibold"
                >
                  <Icon icon={deleteIcon} className="text-lg" />
                  <span>批量删除 ({selectedQuestions.size})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Questions List */}

        <div className="space-y-4 px-36 py-4">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-red-200 mb-2">暂无题目</p>
              <p className="text-sm text-red-300">点击"添加题目"开始创建</p>
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <div
                key={question.id}
                className="p-6 rounded-xl shadow-lg border-2 border-yellow-300 hover:border-yellow-400 transition-all"
                style={{ backgroundColor: '#fbfdba' }}
              >
                <div className="flex items-start justify-between">
                  {/* Checkbox */}
                  <button
                    onClick={() =>
                      handleQuestionSelect(question.id, !selectedQuestions.has(question.id))
                    }
                    className="mr-3 mt-1 shrink-0"
                    title={selectedQuestions.has(question.id) ? '取消选择' : '选择'}
                  >
                    {selectedQuestions.has(question.id) ? (
                      <Icon icon={checkboxIcon} className="text-2xl text-red-600" />
                    ) : (
                      <Icon icon={checkboxBlankIcon} className="text-2xl text-gray-600" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-600 text-white">
                        {question.questionType === 'single' ? '单选' : '多选'}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-600 text-white">
                        {question.optionType === 'true-false' ? '对错题' : '选项题'}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 mb-3">{question.text}</p>
                    <div className="space-y-1">
                      {question.options.map((option, index) => {
                        const isCorrect = Array.isArray(question.correctAnswer)
                          ? question.correctAnswer.includes(index)
                          : question.correctAnswer === index
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-2 text-sm ${
                              isCorrect ? 'text-green-700 font-bold' : 'text-gray-600'
                            }`}
                          >
                            <span className="w-6 text-center">
                              {question.optionType === 'true-false'
                                ? index === 0
                                  ? '✅'
                                  : '❌'
                                : String.fromCharCode(65 + index)}
                            </span>
                            <span>{option}</span>
                            {isCorrect && <span className="text-green-600">✓</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(question)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="编辑"
                    >
                      <Icon icon={editIcon} className="text-lg" />
                    </button>
                    <button
                      onClick={() => handleDelete(question)}
                      className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
                      title="删除"
                    >
                      <Icon icon={deleteIcon} className="text-lg" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Import Result Dialog */}
      <ImportResultDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        result={importResult}
      />
    </div>
  )
}
