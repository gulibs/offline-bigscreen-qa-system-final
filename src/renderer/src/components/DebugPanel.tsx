/**
 * Global Debug Panel Component
 * Displays route information, console logs, and errors
 * Can be enabled/disabled via configuration
 */

import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { Icon } from '@iconify/react'
import closeIcon from '@iconify-icons/mdi/close'
import chevronDownIcon from '@iconify-icons/mdi/chevron-down'
import chevronUpIcon from '@iconify-icons/mdi/chevron-up'
import trashIcon from '@iconify-icons/mdi/trash-can-outline'
import { enableConsole, disableConsole, isConsoleEnabled } from '../utils/consoleControl'

interface LogEntry {
  id: string
  timestamp: number
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  source?: string
}

interface DebugPanelConfig {
  enabled: boolean
  showRouteInfo: boolean
  showConsoleLogs: boolean
  showErrors: boolean
  maxLogEntries: number
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

// Default configuration - can be overridden by environment variables
const DEFAULT_CONFIG: DebugPanelConfig = {
  enabled:
    !import.meta.env.PROD && (import.meta.env.DEV || import.meta.env.VITE_DEBUG_ENABLED === 'true'),
  showRouteInfo: true,
  showConsoleLogs: true,
  showErrors: true,
  maxLogEntries: 100,
  position: 'top-left'
}

// Get configuration from environment variables
function getConfig(): DebugPanelConfig {
  // Check if explicitly disabled via environment variable
  const explicitlyDisabled = import.meta.env.VITE_DEBUG_ENABLED === 'false'

  // Check localStorage override
  const localStorageEnabled = localStorage.getItem('debug-panel-enabled')
  const localStorageDisabled = localStorageEnabled === 'false'

  // Determine if enabled
  let enabled: boolean
  const isProduction = import.meta.env.PROD || !import.meta.env.DEV

  if (explicitlyDisabled || localStorageDisabled) {
    // Explicitly disabled
    enabled = false
  } else if (import.meta.env.VITE_DEBUG_ENABLED === 'true') {
    // Explicitly enabled via env var (even in production if needed)
    enabled = true
  } else if (localStorageEnabled === 'true' && !isProduction) {
    // Explicitly enabled via localStorage (only in dev mode, not in production)
    enabled = true
  } else {
    // Default: enabled in dev, disabled in production
    // In production builds, always disable unless explicitly enabled via VITE_DEBUG_ENABLED
    enabled = !isProduction
  }

  return {
    enabled,
    showRouteInfo: import.meta.env.VITE_DEBUG_SHOW_ROUTE !== 'false',
    showConsoleLogs: import.meta.env.VITE_DEBUG_SHOW_LOGS !== 'false',
    showErrors: import.meta.env.VITE_DEBUG_SHOW_ERRORS !== 'false',
    maxLogEntries: Number(import.meta.env.VITE_DEBUG_MAX_LOGS) || DEFAULT_CONFIG.maxLogEntries,
    position:
      (import.meta.env.VITE_DEBUG_POSITION as DebugPanelConfig['position']) ||
      DEFAULT_CONFIG.position
  }
}

export function DebugPanel(): React.JSX.Element | null {
  const location = useLocation()
  const [config, setConfig] = useState<DebugPanelConfig>(getConfig)
  const [isMinimized, setIsMinimized] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [mounted, setMounted] = useState(false)
  const [consoleEnabled, setConsoleEnabled] = useState(isConsoleEnabled())
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Update mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isMinimized])

  // Intercept console methods
  useEffect(() => {
    if (!config.enabled || !config.showConsoleLogs) {
      return
    }

    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error
    const originalInfo = console.info
    const originalDebug = console.debug

    const addLog = (level: LogEntry['level'], ...args: unknown[]): void => {
      // Use setTimeout to defer state update and avoid setState during render
      setTimeout(() => {
        const message = args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
          .join(' ')
        const source = new Error().stack?.split('\n')[2]?.trim()

        setLogs((prev) => {
          const newLog: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            level,
            message,
            source
          }
          const updated = [...prev, newLog]
          // Keep only the last maxLogEntries
          return updated.slice(-config.maxLogEntries)
        })
      }, 0)
    }

    console.log = (...args: unknown[]) => {
      originalLog(...args)
      addLog('log', ...args)
    }

    console.warn = (...args: unknown[]) => {
      originalWarn(...args)
      addLog('warn', ...args)
    }

    console.error = (...args: unknown[]) => {
      originalError(...args)
      addLog('error', ...args)
    }

    console.info = (...args: unknown[]) => {
      originalInfo(...args)
      addLog('info', ...args)
    }

    console.debug = (...args: unknown[]) => {
      originalDebug(...args)
      addLog('debug', ...args)
    }

    return () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
      console.info = originalInfo
      console.debug = originalDebug
    }
  }, [config.enabled, config.showConsoleLogs, config.maxLogEntries])

  // Handle global errors
  useEffect(() => {
    if (!config.enabled || !config.showErrors) {
      return
    }

    const handleError = (event: ErrorEvent): void => {
      // Use setTimeout to defer state update and avoid setState during render
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            level: 'error',
            message: `${event.message}${event.filename ? ` (${event.filename}:${event.lineno})` : ''}`,
            source: event.filename
          }
        ])
      }, 0)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      // Use setTimeout to defer state update and avoid setState during render
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            level: 'error',
            message: `Unhandled Promise Rejection: ${event.reason}`,
            source: 'Promise'
          }
        ])
      }, 0)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [config.enabled, config.showErrors])

  // Don't render if disabled
  if (!config.enabled) {
    return null
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const getLevelColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error':
        return 'text-red-400'
      case 'warn':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      case 'debug':
        return 'text-gray-400'
      default:
        return 'text-green-400'
    }
  }

  const clearLogs = (): void => {
    setLogs([])
  }

  return (
    <div
      className={`fixed ${positionClasses[config.position]} z-9999 bg-black/90 text-white rounded-lg text-sm font-mono shadow-2xl border-2 border-yellow-400 transition-all duration-300 ${
        isMinimized ? 'w-80' : 'w-[500px]'
      }`}
      style={{ maxHeight: isMinimized ? 'auto' : '80vh', zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-yellow-400/50 bg-yellow-400/10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-yellow-400">🔍 Debug Panel</span>
          {!isMinimized && <span className="text-xs text-gray-400">({logs.length} logs)</span>}
        </div>
        <div className="flex items-center gap-2">
          {!isMinimized && config.showConsoleLogs && (
            <>
              <button
                onClick={() => {
                  if (consoleEnabled) {
                    disableConsole()
                  } else {
                    enableConsole()
                  }
                  setConsoleEnabled(!consoleEnabled)
                }}
                className={`p-1 rounded transition-colors ${
                  consoleEnabled
                    ? 'hover:bg-green-500/20 text-green-400'
                    : 'hover:bg-gray-500/20 text-gray-400'
                }`}
                title={
                  consoleEnabled
                    ? 'Console Enabled (Click to disable)'
                    : 'Console Disabled (Click to enable)'
                }
              >
                <span className="text-xs font-bold">{consoleEnabled ? '📢' : '🔇'}</span>
              </button>
              <button
                onClick={clearLogs}
                className="p-1 hover:bg-yellow-400/20 rounded transition-colors"
                title="Clear logs"
              >
                <Icon icon={trashIcon} className="text-lg" />
              </button>
            </>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-yellow-400/20 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Icon icon={isMinimized ? chevronDownIcon : chevronUpIcon} className="text-lg" />
          </button>
          <button
            onClick={() => {
              setConfig((prev) => ({ ...prev, enabled: false }))
              localStorage.setItem('debug-panel-enabled', 'false')
            }}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Close"
          >
            <Icon icon={closeIcon} className="text-lg" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {/* Route Info */}
          {config.showRouteInfo && (
            <div className="px-4 py-3 border-b border-yellow-400/30">
              <div className="font-bold text-yellow-400 mb-2">📍 Route Info</div>
              <div className="space-y-1 text-xs">
                <div>
                  Path: <span className="text-green-400">{location.pathname || '(empty)'}</span>
                </div>
                <div>
                  Mounted:{' '}
                  <span className={mounted ? 'text-green-400' : 'text-red-400'}>
                    {mounted ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  Key: <span className="text-blue-400">{location.key || '(none)'}</span>
                </div>
                <div>
                  Console:{' '}
                  <span className={consoleEnabled ? 'text-green-400' : 'text-gray-400'}>
                    {consoleEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-gray-400">{new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          )}

          {/* Console Logs */}
          {config.showConsoleLogs && (
            <div className="px-4 py-3">
              <div className="font-bold text-yellow-400 mb-2">📝 Console Logs</div>
              <div className="space-y-1 text-xs max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-400 italic">No logs yet...</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="border-l-2 border-yellow-400/30 pl-2 py-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${getLevelColor(log.level)}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-gray-400 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-200 wrap-break-word">{log.message}</div>
                      {log.source && (
                        <div className="text-gray-500 text-[10px] mt-1 truncate">{log.source}</div>
                      )}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
