/**
 * Authentication Context
 * Provides global authentication state and methods
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router'
import * as authService from '../services/authService'

interface AuthContextType {
  isAuthenticated: boolean
  login: (password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated())
  const navigate = useNavigate()
  const location = useLocation()

  // Check authentication status periodically
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)

      // If session expired while on admin page, redirect to login
      if (!authenticated && location.pathname.startsWith('/admin')) {
        navigate('/admin/login', { replace: true })
      }
    }, 60000) // Check every minute

    return () => clearInterval(checkInterval)
  }, [navigate, location.pathname])

  // Extend session on user activity
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const handleActivity = (): void => {
      authService.extendSession()
    }

    // Listen to various user activities
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated])

  const login = useCallback(async (password: string): Promise<boolean> => {
    const success = authService.login(password)
    if (success) {
      setIsAuthenticated(true)
      // Extend session on login
      authService.extendSession()
    }
    return success
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setIsAuthenticated(false)
    // Redirect to login if on admin page
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin/login', { replace: true })
    }
  }, [navigate, location.pathname])

  const checkAuth = useCallback((): boolean => {
    const authenticated = authService.isAuthenticated()
    setIsAuthenticated(authenticated)
    return authenticated
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
