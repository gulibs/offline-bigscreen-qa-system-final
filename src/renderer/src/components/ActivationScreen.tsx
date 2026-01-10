/**
 * Activation Screen Component
 * Software activation page with activation code input
 */

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import keyIcon from '@iconify-icons/mdi/key'
import contentCopyIcon from '@iconify-icons/mdi/content-copy'

/**
 * Format activation code with dashes: XXXX-XXXX-XXXX-XXXX
 * Removes all non-alphanumeric characters and adds dashes every 4 characters
 */
function formatActivationCode(input: string): string {
  // Remove all non-alphanumeric characters
  const cleaned = input.replace(/[^A-Z0-9]/gi, '').toUpperCase()

  // Limit to 16 characters (4 groups of 4)
  const limited = cleaned.substring(0, 16)

  // Add dashes every 4 characters
  const formatted = limited.replace(/(.{4})/g, '$1-').replace(/-$/, '')

  return formatted
}

/**
 * Remove formatting from activation code (remove dashes)
 */
function cleanActivationCode(formatted: string): string {
  return formatted.replace(/-/g, '').toUpperCase()
}

export function ActivationScreen(): React.JSX.Element {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null)
  const [showFingerprint, setShowFingerprint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load device fingerprint
  useEffect(() => {
    const loadFingerprint = async (): Promise<void> => {
      try {
        const fingerprint = await window.api.license.getDeviceFingerprint()
        setDeviceFingerprint(fingerprint)
      } catch (err) {
        console.error('[ActivationScreen] Failed to get device fingerprint:', err)
      }
    }
    loadFingerprint()
  }, [])

  const handleActivate = async (): Promise<void> => {
    // Clean the code (remove dashes) before sending
    const cleanCode = cleanActivationCode(code)

    if (!cleanCode.trim()) {
      setError('请输入激活码')
      return
    }

    // Validate length (should be 16 characters)
    if (cleanCode.length !== 16) {
      setError('激活码格式不正确，应为16位字符')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Send cleaned code (without dashes) to backend
      const result = await window.api.license.activate(cleanCode)
      if (result.success) {
        // Reload the app to refresh license status
        window.location.reload()
      } else {
        setError(result.error || '激活失败')
      }
    } catch (err) {
      console.error('[ActivationScreen] Activation error:', err)
      setError('激活失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !loading) {
      handleActivate()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const input = e.target.value
    // Format the input automatically
    const formatted = formatActivationCode(input)
    setCode(formatted)
    setError(null)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    // Don't prevent default if we're using native handler
    // The native handler will take care of it
    const pastedText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text')
    if (pastedText) {
      e.preventDefault()
      e.stopPropagation()

      // Format the pasted text
      const formatted = formatActivationCode(pastedText)
      setCode(formatted)
      setError(null)
      // Move cursor to end after state update
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const length = formatted.length
          inputRef.current.setSelectionRange(length, length)
          inputRef.current.focus()
        }
      })
    }
  }

  // Handle native paste event (primary handler for better Electron compatibility)
  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleNativePaste = (e: ClipboardEvent): void => {
      // Only handle if input is focused or the event target is the input
      if (document.activeElement !== input && e.target !== input) return

      try {
        const pastedText =
          e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text')
        if (pastedText && pastedText.trim()) {
          e.preventDefault()
          e.stopPropagation()

          const formatted = formatActivationCode(pastedText)
          setCode(formatted)
          setError(null)

          // Use requestAnimationFrame to ensure state is updated before setting cursor
          requestAnimationFrame(() => {
            if (inputRef.current) {
              const length = formatted.length
              inputRef.current.setSelectionRange(length, length)
              inputRef.current.focus()
            }
          })
        }
      } catch (err) {
        console.error('[ActivationScreen] Native paste error:', err)
      }
    }

    // Use capture phase to catch event before React's synthetic event
    input.addEventListener('paste', handleNativePaste, { capture: true, passive: false })

    return () => {
      input.removeEventListener('paste', handleNativePaste, {
        capture: true
      } as EventListenerOptions)
    }
  }, [])

  return (
    <div className="min-h-screen w-full bg-red-600 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div
          className="p-8 md:p-12 rounded-2xl shadow-2xl border-2 border-yellow-300"
          style={{ backgroundColor: '#fbfdba' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center border-4 border-yellow-300">
                <Icon icon={keyIcon} className="text-4xl text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">软件激活</h1>
            <p className="text-lg text-gray-600">请输入激活码以激活软件</p>
          </div>

          {/* Device Fingerprint Section */}
          {deviceFingerprint && (
            <div className="mb-6 p-4 rounded-lg border-2 border-yellow-300 bg-white">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">设备指纹：</label>
                <button
                  onClick={() => {
                    setShowFingerprint(!showFingerprint)
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  {showFingerprint ? '隐藏' : '显示'}
                </button>
              </div>
              {showFingerprint && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-mono text-gray-800 break-all">
                    {deviceFingerprint}
                  </code>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(deviceFingerprint)
                        // Show feedback (you can add a toast notification here)
                        alert('设备指纹已复制到剪贴板')
                      } catch (err) {
                        console.error('[ActivationScreen] Failed to copy fingerprint:', err)
                        alert('复制失败，请手动复制')
                      }
                    }}
                    className="px-3 py-2 rounded border-2 border-yellow-300 hover:border-yellow-400 transition-colors"
                    style={{ backgroundColor: '#fbfdba' }}
                    title="复制设备指纹"
                  >
                    <Icon icon={contentCopyIcon} className="text-lg text-red-600" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                提示：如需生成设备绑定的激活码，请将设备指纹提供给管理员
              </p>
            </div>
          )}

          {/* Activation Form */}
          <div className="space-y-6">
            <div>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={handleChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                disabled={loading}
                readOnly={false}
                maxLength={19}
                className="w-full px-4 py-3 rounded-lg border-2 border-yellow-300 text-xl text-center font-mono tracking-wider text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#fff', color: '#1f2937' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                inputMode="text"
              />
              <p className="text-sm text-gray-500 text-center mt-2">支持复制粘贴，自动格式化</p>
            </div>

            {error && (
              <div className="text-red-600 text-center text-lg font-semibold bg-red-50 py-2 px-4 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              onClick={handleActivate}
              disabled={loading || !code.trim()}
              className="w-full px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-100 border-2 border-yellow-300 hover:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ backgroundColor: '#fbfdba' }}
            >
              <span className="text-xl font-bold text-red-600">
                {loading ? '激活中...' : '激活'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
