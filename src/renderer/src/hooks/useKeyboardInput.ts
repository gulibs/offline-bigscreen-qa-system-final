/**
 * React hook for handling keyboard input from main process
 */

import { useEffect, useRef } from 'react'
import {
  keyboardEventToCommand,
  createDebouncer,
  type KeyboardInputEvent,
  type InputCommand,
  DEFAULT_INPUT_CONFIG
} from '../services/inputHandler'

/**
 * Hook to listen for keyboard inputs and convert to commands
 * @param onCommand Callback when valid command is received
 * @param enabled Whether input handling is enabled
 * @param debounceMs Debounce delay (default: 300ms)
 */
export function useKeyboardInput(
  onCommand: (command: InputCommand) => void,
  enabled = true,
  debounceMs = DEFAULT_INPUT_CONFIG.debounceMs
) {
  const debouncer = useRef(createDebouncer(debounceMs))

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyboardInput = (_event: unknown, data: KeyboardInputEvent) => {
      // Debounce rapid inputs
      if (!debouncer.current()) {
        console.log('[KeyboardInput] Debounced input:', data.key)
        return
      }

      // Convert keyboard event to command
      const command = keyboardEventToCommand(data)
      if (command) {
        console.log('[KeyboardInput] Command:', command, 'from key:', data.key)
        onCommand(command)
      }
    }

    // Listen for keyboard input events from main process
    window.electron.ipcRenderer.on('keyboard-input', handleKeyboardInput)

    return () => {
      window.electron.ipcRenderer.removeListener('keyboard-input', handleKeyboardInput)
    }
  }, [onCommand, enabled, debounceMs])
}

