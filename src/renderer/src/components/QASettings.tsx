/**
 * Q&A Settings Component
 * Allows users to configure Q&A system settings
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import {
  getQASettings,
  saveQASettings,
  resetQASettings,
  type QASettings
} from '../services/qaSettings'
import { cn } from '@renderer/utils/cn'

export function QASettings(): React.JSX.Element {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<QASettings>(getQASettings())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  // Temporary string state for question count input to allow clearing
  const [questionCountInput, setQuestionCountInput] = useState<string>('')
  // Scroll state for header background
  const [isScrolled, setIsScrolled] = useState(false)
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref for cleanup function
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const loadedSettings = getQASettings()
    setSettings(loadedSettings)
    setQuestionCountInput(String(loadedSettings.questionCount))
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

  const handleSave = (): void => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      // Save the current settings state
      saveQASettings(settings)
      // Reload to verify save
      const saved = getQASettings()
      console.log('[QASettings] Settings saved:', saved)
      setSaveMessage('设置已保存')
      setTimeout(() => {
        setSaveMessage(null)
      }, 2000)
    } catch (error) {
      console.error('[QASettings] Failed to save settings:', error)
      setSaveMessage('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = (): void => {
    if (confirm('确定要重置为默认设置吗？')) {
      resetQASettings()
      const resetSettings = getQASettings()
      setSettings(resetSettings)
      setQuestionCountInput(String(resetSettings.questionCount))
      setSaveMessage('已重置为默认设置')
      setTimeout(() => {
        setSaveMessage(null)
      }, 2000)
    }
  }

  const handleQuestionCountChange = (value: number): void => {
    const newValue = Math.max(settings.minQuestionCount, Math.min(settings.maxQuestionCount, value))
    setSettings({ ...settings, questionCount: newValue })
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
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">答题设置</h1>
                <p className="text-lg text-red-100">配置答题系统的参数</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="px-36">
          <div
            className="p-8 rounded-2xl shadow-xl border-2 border-yellow-300 mb-8"
            style={{ backgroundColor: '#fbfdba' }}
          >
            {/* Question Count Setting */}
            <div className="mb-8">
              <label className="block text-2xl font-bold text-gray-800 mb-4">出题数量</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    min={settings.minQuestionCount}
                    max={settings.maxQuestionCount}
                    value={questionCountInput}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty input and any valid input
                      setQuestionCountInput(value)
                      if (value !== '') {
                        const numValue = Number.parseInt(value, 10)
                        if (!Number.isNaN(numValue)) {
                          handleQuestionCountChange(numValue)
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (value === '' || Number.isNaN(Number.parseInt(value, 10))) {
                        // Reset to min value if empty or invalid
                        const minValue = settings.minQuestionCount
                        setQuestionCountInput(String(minValue))
                        handleQuestionCountChange(minValue)
                      } else {
                        const numValue = Number.parseInt(value, 10)
                        const clampedValue = Math.max(
                          settings.minQuestionCount,
                          Math.min(settings.maxQuestionCount, numValue)
                        )
                        setQuestionCountInput(String(clampedValue))
                        handleQuestionCountChange(clampedValue)
                      }
                    }}
                    className="w-full px-6 py-4 text-2xl rounded-xl border-2 border-yellow-300 focus:border-yellow-400 focus:outline-none text-gray-800"
                    style={{ backgroundColor: '#fff' }}
                  />
                  <p className="mt-2 text-lg text-gray-600">
                    范围: {settings.minQuestionCount} - {settings.maxQuestionCount} 题
                  </p>
                </div>
              </div>
              <p className="mt-4 text-lg text-gray-700">
                每次答题时，系统会从数据库中随机选择指定数量的题目。已选过的题目不会重复出现，直到所有题目都被选过。
              </p>
            </div>

            {/* Info Section */}
            <div className="mb-8 p-6 rounded-xl bg-yellow-50 border-2 border-yellow-200">
              <h3 className="text-xl font-bold text-gray-800 mb-3">说明</h3>
              <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
                <li>出题数量决定了每次答题会话中包含的题目数量</li>
                <li>系统会随机选择题目，确保每次答题的题目组合不同</li>
                <li>已选过的题目会被标记，避免重复出现</li>
                <li>当所有题目都被选过后，系统会重置题目池，重新开始选择</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={handleReset}
                className="px-8 py-4 text-xl font-semibold rounded-xl bg-gray-300 text-gray-800 shadow-lg hover:bg-gray-400 hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
              >
                重置为默认
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-4 text-xl font-semibold rounded-xl bg-red-600 text-white shadow-lg hover:bg-red-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? '保存中...' : '保存设置'}
              </button>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`mt-4 p-4 rounded-xl text-center text-lg font-semibold ${
                  saveMessage.includes('失败')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
