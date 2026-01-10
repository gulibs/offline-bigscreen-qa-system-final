/**
 * Console Control Utility
 * Disables console output in production unless enabled via environment variable
 */

// Check if console output is enabled via environment variable
const CONSOLE_ENABLED =
  import.meta.env.DEV ||
  import.meta.env.VITE_CONSOLE_ENABLED === 'true' ||
  localStorage.getItem('console-enabled') === 'true'

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
  table: console.table,
  group: console.group,
  groupEnd: console.groupEnd,
  groupCollapsed: console.groupCollapsed,
  time: console.time,
  timeEnd: console.timeEnd,
  assert: console.assert,
  clear: console.clear
}

// Disable console in production unless enabled
if (!CONSOLE_ENABLED) {
  // Override all console methods to no-op
  console.log = () => {}
  console.warn = () => {}
  console.error = () => {}
  console.info = () => {}
  console.debug = () => {}
  console.trace = () => {}
  console.table = () => {}
  console.group = () => {}
  console.groupEnd = () => {}
  console.groupCollapsed = () => {}
  console.time = () => {}
  console.timeEnd = () => {}
  console.assert = () => {}
  console.clear = () => {}
}

/**
 * Enable console output (runtime)
 */
export function enableConsole(): void {
  Object.assign(console, originalConsole)
  localStorage.setItem('console-enabled', 'true')
}

/**
 * Disable console output (runtime)
 */
export function disableConsole(): void {
  console.log = () => {}
  console.warn = () => {}
  console.error = () => {}
  console.info = () => {}
  console.debug = () => {}
  console.trace = () => {}
  console.table = () => {}
  console.group = () => {}
  console.groupEnd = () => {}
  console.groupCollapsed = () => {}
  console.time = () => {}
  console.timeEnd = () => {}
  console.assert = () => {}
  console.clear = () => {}
  localStorage.setItem('console-enabled', 'false')
}

/**
 * Check if console is currently enabled
 */
export function isConsoleEnabled(): boolean {
  return CONSOLE_ENABLED || localStorage.getItem('console-enabled') === 'true'
}
