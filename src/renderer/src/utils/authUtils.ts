/**
 * Authentication Utilities
 * Helper functions for checking authentication status before operations
 */

import * as authService from '../services/authService'

/**
 * Check if user is authenticated before performing admin operations
 * Returns true if authenticated, false otherwise
 * Shows alert if not authenticated
 */
export function requireAuth(): boolean {
  const isAuthenticated = authService.isAuthenticated()
  if (!isAuthenticated) {
    alert('请先登录后再进行操作')
    return false
  }
  return true
}

/**
 * Check authentication and execute callback if authenticated
 */
export function withAuth<T extends unknown[]>(
  callback: (...args: T) => void | Promise<void>
): (...args: T) => void | Promise<void> {
  return (...args: T) => {
    if (requireAuth()) {
      return callback(...args)
    }
  }
}
