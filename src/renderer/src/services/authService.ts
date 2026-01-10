/**
 * Authentication Service
 * Handles login/logout and session management for admin access
 */

const AUTH_STORAGE_KEY = 'admin_auth_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Default admin password (can be changed in production)
// In a real application, this should be configurable or stored securely
const DEFAULT_ADMIN_PASSWORD = 'admin123'

interface AuthSession {
  isAuthenticated: boolean
  loginTime: number
  expiresAt: number
}

/**
 * Get stored admin password from localStorage or use default
 */
function getAdminPassword(): string {
  try {
    const stored = localStorage.getItem('admin_password')
    return stored || DEFAULT_ADMIN_PASSWORD
  } catch {
    return DEFAULT_ADMIN_PASSWORD
  }
}

/**
 * Set admin password (for future use if needed)
 */
export function setAdminPassword(password: string): void {
  try {
    localStorage.setItem('admin_password', password)
  } catch (error) {
    console.error('[authService] Failed to set admin password:', error)
  }
}

/**
 * Get current authentication session
 */
export function getAuthSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const session: AuthSession = JSON.parse(stored)
    const now = Date.now()

    // Check if session is expired
    if (now > session.expiresAt) {
      // Session expired, clear it
      clearAuthSession()
      return null
    }

    return session
  } catch (error) {
    console.error('[authService] Failed to get auth session:', error)
    return null
  }
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
  const session = getAuthSession()
  return session?.isAuthenticated === true
}

/**
 * Authenticate user with password
 */
export function login(password: string): boolean {
  const adminPassword = getAdminPassword()

  if (password === adminPassword) {
    const now = Date.now()
    const session: AuthSession = {
      isAuthenticated: true,
      loginTime: now,
      expiresAt: now + SESSION_DURATION
    }

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
      return true
    } catch (error) {
      console.error('[authService] Failed to save auth session:', error)
      return false
    }
  }

  return false
}

/**
 * Logout user
 */
export function logout(): void {
  clearAuthSession()
}

/**
 * Clear authentication session
 */
function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('[authService] Failed to clear auth session:', error)
  }
}

/**
 * Extend session (called on activity)
 */
export function extendSession(): void {
  const session = getAuthSession()
  if (session?.isAuthenticated) {
    const now = Date.now()
    const updatedSession: AuthSession = {
      ...session,
      expiresAt: now + SESSION_DURATION
    }

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession))
    } catch (error) {
      console.error('[authService] Failed to extend session:', error)
    }
  }
}
