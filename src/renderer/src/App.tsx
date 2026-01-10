/**
 * Main App Component
 * Big Screen Touchscreen Q&A System
 * With React Router for URL-based navigation, global fullscreen button, and global background
 */

import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router'
import { QAProvider } from './contexts/QAContext'
import { AuthProvider } from './contexts/AuthContext'
import { QAScreen } from './components/QAScreen'
import { HomePage } from './components/HomePage'
import { QueryScreen } from './components/QueryScreen'
import { CategoryViewer } from './components/CategoryViewer'
import { AdminScreen } from './components/AdminScreen'
import { LoginScreen } from './components/LoginScreen'
import { ActivationScreen } from './components/ActivationScreen'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CategoryManagement } from './components/CategoryManagement'
import { EntryManagement } from './components/EntryManagement'
import { EntryEditor } from './components/EntryEditor'
import { QuestionManagement } from './components/QuestionManagement'
import { QuestionEditor } from './components/QuestionEditor'
import { QASettings } from './components/QASettings'
import { GlobalFullscreenButton } from './components/GlobalFullscreenButton'
import { GlobalBackToHomeButton } from './components/GlobalBackToHomeButton'
import { DebugPanel } from './components/DebugPanel'
import bg02Image from './assets/bg-02.png'

function App(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [needsActivation, setNeedsActivation] = useState<boolean | null>(null)

  // Check if activation is needed
  useEffect(() => {
    window.api.license
      .needsActivation()
      .then((needs) => {
        console.log('[App] Activation check result:', needs)
        setNeedsActivation(needs)
      })
      .catch((err) => {
        console.error('[App] Failed to check activation status:', err)
        // If check fails, assume activation is needed (safer for license enforcement)
        // This ensures the app requires activation if license check fails
        setNeedsActivation(true)
      })
  }, [])

  // With HashRouter, pathname is always '/' and routing is done via hash
  // Ensure initial route is '/' (empty hash means '/')
  React.useEffect(() => {
    // If hash is empty or just '#', navigate to '/'
    const currentHash = window.location.hash
    if (currentHash === '' || currentHash === '#') {
      // Already at home, no action needed
      return
    }

    // If hash doesn't start with '#/', it's invalid, redirect to '/'
    if (currentHash && !currentHash.startsWith('#/')) {
      console.log('[App] Invalid hash detected, redirecting to /:', currentHash)
      navigate('/', { replace: true })
      return
    }
  }, [location.pathname, navigate])

  // Debug: Log current route
  React.useEffect(() => {
    console.log('[App] Current route:', location.pathname)
    console.log('[App] Route state:', location.state)
    console.log('[App] Route key:', location.key)
  }, [location.pathname, location.state, location.key])

  // Show activation screen if needed
  if (needsActivation === null) {
    return (
      <div className="min-h-screen w-full bg-red-600 flex items-center justify-center">
        <div className="text-white text-2xl">加载中...</div>
      </div>
    )
  }

  if (needsActivation) {
    return <ActivationScreen />
  }

  return (
    <QAProvider>
      <AuthProvider>
        {/* Global Background Container - bg-02.png for all pages except home and category viewer */}
        <div className="fixed inset-0 w-full h-full -z-10">
          <img
            src={bg02Image}
            alt=""
            className="w-full h-full object-cover"
            style={{ pointerEvents: 'none' }}
          />
        </div>

        {/* Global Debug Panel - Configurable via environment variables */}
        <DebugPanel />

        {/* Global Fullscreen Button - Visible on all pages */}
        <GlobalFullscreenButton />

        {/* Global Back to Home Button - Visible on all pages (except home) */}
        <GlobalBackToHomeButton />

        {/* Page Content - React Router Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Redirect empty path and any invalid paths to home */}
          <Route path="" element={<Navigate to="/" replace />} />
          {/* Catch-all route: redirect any unmatched paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/qa" element={<QAScreen />} />
          <Route path="/query" element={<QueryScreen />} />
          <Route path="/category/:id" element={<CategoryViewer />} />
          {/* Admin routes - protected by authentication */}
          <Route path="/admin/login" element={<LoginScreen />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute>
                <CategoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/entries/:categoryId"
            element={
              <ProtectedRoute>
                <EntryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/entries/:categoryId/edit"
            element={
              <ProtectedRoute>
                <EntryEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute>
                <QuestionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions/edit"
            element={
              <ProtectedRoute>
                <QuestionEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qa-settings"
            element={
              <ProtectedRoute>
                <QASettings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </QAProvider>
  )
}

export default App
