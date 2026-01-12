/**
 * Login Screen Component
 * Admin login page with password authentication
 */

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { Icon } from '@iconify/react'
import lockIcon from '@iconify-icons/mdi/lock'
import eyeIcon from '@iconify-icons/mdi/eye'
import eyeOffIcon from '@iconify-icons/mdi/eye-off'
import { useAuth } from '../contexts/AuthContext'

export function LoginScreen(): React.JSX.Element {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const { login, isAuthenticated } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Redirect to the page they were trying to access, or admin home
      const from = (location.state as { from?: string } | null)?.from || '/admin'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location.state])

  // Reset state and focus input on mount and when component becomes visible
  // Use useLayoutEffect to ensure state is reset and focus is set before browser paint
  // This is especially important after logout on Windows systems
  // Immediately sync reset state to prevent input from being disabled
  useLayoutEffect((): (() => void) => {
    // Only execute on login page when not authenticated
    if (location.pathname === '/admin/login' && !isAuthenticated) {
      // Immediately sync reset state to ensure input is not disabled
      setIsLoading(false)
      setPassword('')
      setError(null)

      // Then set focus after state is reset
      let retryCount = 0
      const maxRetries = 5
      let timeoutId: NodeJS.Timeout | null = null

      const focusInput = (): void => {
        const input = passwordInputRef.current
        if (input && !input.disabled) {
          const isVisible = input.offsetParent !== null
          const rect = input.getBoundingClientRect()
          const isInViewport = rect.height > 0 && rect.width > 0

          if (isVisible && isInViewport) {
            try {
              input.focus()
              // Verify focus was successfully set
              if (document.activeElement === input) {
                console.log('[LoginScreen] Focus set successfully')
                return
              }
            } catch (err) {
              console.warn('[LoginScreen] Focus error:', err)
            }
          }

          // If focus setting failed, retry with exponential backoff
          if (retryCount < maxRetries) {
            retryCount++
            timeoutId = setTimeout(focusInput, 100 * retryCount)
          } else {
            console.warn('[LoginScreen] Failed to set focus after', maxRetries, 'retries')
          }
        }
      }

      // Use requestAnimationFrame to ensure we're in the next frame
      requestAnimationFrame(() => {
        timeoutId = setTimeout(focusInput, 50)
      })

      // Cleanup function to clear timeout if component unmounts
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }
    // Return empty cleanup function when not on login page or authenticated
    return () => {
      // No cleanup needed
    }
  }, [isAuthenticated, location.pathname]) // Re-focus when auth state or route changes

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const success = await login(password)
      if (success) {
        // Redirect to the page they were trying to access, or admin home
        const from = (location.state as { from?: string } | null)?.from || '/admin'
        navigate(from, { replace: true })
      } else {
        setError('密码错误，请重试')
        setPassword('')
        // Use requestAnimationFrame + setTimeout to ensure focus after state update
        requestAnimationFrame(() => {
          setTimeout(() => {
            const input = passwordInputRef.current
            if (input && input.offsetParent !== null && !input.disabled) {
              input.focus()
            }
          }, 50)
        })
      }
    } catch (err) {
      setError('登录失败，请重试')
      console.error('[LoginScreen] Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value)
    setError(null) // Clear error when user types
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e)
    }
  }

  // Handle click on input container to ensure focus
  // If input is disabled, force enable it first
  const handleInputContainerClick = (e: React.MouseEvent): void => {
    // Stop event propagation to avoid triggering other click events
    e.stopPropagation()

    const input = passwordInputRef.current
    if (input) {
      // If input is disabled, immediately enable it
      if (input.disabled) {
        setIsLoading(false)
        // Wait for state update then focus
        setTimeout(() => {
          input.focus()
        }, 0)
      } else {
        // Input is already enabled, focus immediately
        input.focus()
      }
    }
  }

  return (
    <div className="flex justify-center min-h-screen w-full relative z-10 px-8 py-20">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div
          className="p-8 md:p-12 rounded-2xl shadow-2xl border-2 border-yellow-300"
          style={{ backgroundColor: '#fbfdba' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center border-4 border-yellow-300">
                <Icon icon={lockIcon} className="text-4xl text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">管理员登录</h1>
            <p className="text-lg text-gray-600">请输入管理员密码</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-lg font-semibold text-gray-800 mb-2">
                密码
              </label>
              <div className="relative" onClick={handleInputContainerClick}>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="w-full px-4 py-4 pr-12 text-xl rounded-xl border-2 border-yellow-300 focus:border-yellow-400 focus:outline-none transition-colors duration-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:opacity-70 transition-opacity"
                  tabIndex={-1}
                >
                  <Icon
                    icon={showPassword ? eyeOffIcon : eyeIcon}
                    className="text-2xl text-gray-600"
                  />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-100 border-2 border-red-400">
                <p className="text-red-700 font-semibold text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full py-4 px-6 text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-300 hover:border-yellow-400"
              style={{
                backgroundColor: isLoading || !password.trim() ? '#e5e7eb' : '#dc2626',
                color: 'white'
              }}
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-red-600 transition-colors duration-200 text-sm"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
