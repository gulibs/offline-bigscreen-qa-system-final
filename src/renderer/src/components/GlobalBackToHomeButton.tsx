/**
 * Global Back to Home Button Component
 * Circular icon button that navigates to home page
 * Visible on all pages (except home page itself)
 */

import { useLocation, useNavigate } from 'react-router'
import backBtnImage from '../assets/back-btn.png'

export function GlobalBackToHomeButton(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBackToHome = (): void => {
    console.log('[GlobalBackToHomeButton] Navigating to home')
    console.log(
      '[GlobalBackToHomeButton] Current location:',
      location.pathname,
      'hash:',
      window.location.hash
    )
    navigate('/', { replace: true })
    console.log('[GlobalBackToHomeButton] Navigated to home')
  }

  // Don't show on home page
  // Check both pathname and ensure it's actually the home route
  const isHomePage =
    location.pathname === '/' ||
    location.pathname === '' ||
    !location.pathname ||
    location.pathname === '/index.html'
  if (isHomePage) {
    return <></>
  }

  return (
    <button
      onClick={handleBackToHome}
      className="group fixed bottom-4 right-6 z-50 transition-all duration-300 transform hover:scale-110 active:scale-100 overflow-hidden flex flex-col items-center justify-center"
      // style={{ backgroundColor: '#fbfdba' }}
      title="返回首页"
    >
      {/* Button background image */}
      <img
        src={backBtnImage}
        alt=""
        className="inset-0 w-20 h-20 object-contain rounded-full pointer-events-none"
        onError={(e) => {
          // Hide image if it fails to load, fallback to background color
          e.currentTarget.style.display = 'none'
        }}
      />
      <span className="text-lg font-bold text-yellow-200 group-hover:text-yellow-300 transition-colors duration-300">
        返回首页
      </span>
    </button>
  )
}
