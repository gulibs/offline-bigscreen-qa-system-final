/**
 * Input handling service
 * Abstracts touch and keyboard inputs into unified commands
 */

/**
 * Input commands that the Q&A system understands
 */
export enum InputCommand {
  SELECT_A = 'SELECT_A',
  SELECT_B = 'SELECT_B',
  SELECT_C = 'SELECT_C',
  SELECT_D = 'SELECT_D',
  CONFIRM = 'CONFIRM'
  // Note: NEXT removed - animation auto-advances after 2 seconds
}

/**
 * Map input command to answer index
 */
export function commandToAnswerIndex(command: InputCommand): number | null {
  switch (command) {
    case InputCommand.SELECT_A:
      return 0
    case InputCommand.SELECT_B:
      return 1
    case InputCommand.SELECT_C:
      return 2
    case InputCommand.SELECT_D:
      return 3
    default:
      return null
  }
}

/**
 * Default keyboard mappings
 * Can be overridden via configuration
 */
export const DEFAULT_KEY_MAPPINGS: Record<string, InputCommand> = {
  '1': InputCommand.SELECT_A,
  '2': InputCommand.SELECT_B,
  '3': InputCommand.SELECT_C,
  '4': InputCommand.SELECT_D,
  a: InputCommand.SELECT_A,
  b: InputCommand.SELECT_B,
  c: InputCommand.SELECT_C,
  d: InputCommand.SELECT_D,
  A: InputCommand.SELECT_A,
  B: InputCommand.SELECT_B,
  C: InputCommand.SELECT_C,
  D: InputCommand.SELECT_D,
  Enter: InputCommand.CONFIRM
  // Spacebar and Arrow keys removed - animation auto-advances
}

/**
 * Keyboard input data from main process
 */
export interface KeyboardInputEvent {
  key: string
  code: string
  shift: boolean
  control: boolean
  alt: boolean
  meta: boolean
}

/**
 * Map keyboard event to input command
 */
export function keyboardEventToCommand(
  event: KeyboardInputEvent,
  mappings: Record<string, InputCommand> = DEFAULT_KEY_MAPPINGS
): InputCommand | null {
  const key = event.key
  return mappings[key] ?? null
}

/**
 * Debounce utility for preventing rapid inputs
 */
export function createDebouncer(delayMs: number) {
  let lastCallTime = 0

  return function shouldAllow(): boolean {
    const now = Date.now()
    if (now - lastCallTime >= delayMs) {
      lastCallTime = now
      return true
    }
    return false
  }
}

/**
 * Input handler configuration
 */
export interface InputConfig {
  /** Debounce delay in milliseconds */
  debounceMs: number
  /** Custom key mappings (optional) */
  keyMappings?: Record<string, InputCommand>
}

/**
 * Default input configuration
 */
export const DEFAULT_INPUT_CONFIG: InputConfig = {
  debounceMs: 300,
  keyMappings: DEFAULT_KEY_MAPPINGS
}

