/**
 * Fullscreen Toggle Hook
 * Manages fullscreen state for the application using Electron IPC
 */

import { useState, useEffect, useCallback } from 'react'

interface UseFullscreenReturn {
  isFullscreen: boolean
  toggleFullscreen: () => Promise<void>
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => Promise<void>
}

export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Check if currently in fullscreen
  const checkFullscreen = useCallback(async () => {
    if (window.api && window.api.isFullscreen) {
      try {
        const fullscreenState = await window.api.isFullscreen()
        setIsFullscreen(fullscreenState)
      } catch (error) {
        console.error('[useFullscreen] Failed to check fullscreen state:', error)
      }
    }
  }, [])

  // Toggle fullscreen mode using Electron IPC
  const toggleFullscreen = useCallback(async () => {
    if (window.api && window.api.toggleFullscreen) {
      try {
        console.log('[useFullscreen] Toggling fullscreen...')
        const newState = await window.api.toggleFullscreen()
        console.log('[useFullscreen] New fullscreen state:', newState)
        setIsFullscreen(newState)
      } catch (error) {
        console.error('[useFullscreen] Failed to toggle fullscreen:', error)
      }
    } else {
      console.warn('[useFullscreen] Electron API not available')
    }
  }, [])

  // Enter fullscreen mode
  const enterFullscreen = useCallback(async () => {
    const currentState = await window.api?.isFullscreen()
    if (!currentState) {
      await toggleFullscreen()
    }
  }, [toggleFullscreen])

  // Exit fullscreen mode
  const exitFullscreen = useCallback(async () => {
    const currentState = await window.api?.isFullscreen()
    if (currentState) {
      await toggleFullscreen()
    }
  }, [toggleFullscreen])

  // Check initial fullscreen state
  useEffect(() => {
    checkFullscreen()

    // Poll for fullscreen state changes (in case changed by other means)
    const interval = setInterval(checkFullscreen, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [checkFullscreen])

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen
  }
}
