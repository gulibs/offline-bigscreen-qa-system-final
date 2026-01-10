/**
 * Protected Route Component
 * Wraps routes that require authentication
 */

import { useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps): React.JSX.Element {
  const { isAuthenticated, checkAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check authentication status
    const authenticated = checkAuth()
    if (!authenticated) {
      // Save the attempted location to redirect after login
      navigate('/admin/login', {
        replace: true,
        state: { from: location.pathname }
      })
    }
  }, [isAuthenticated, checkAuth, navigate, location.pathname])

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full relative z-10">
        <LoadingSpinner size="xl" variant="ring" text="验证中..." fullScreen={false} />
      </div>
    )
  }

  return <>{children}</>
}
