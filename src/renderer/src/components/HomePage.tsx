/**
 * Home Page Component
 * Main entry point with navigation to different features
 * Left: Image with "党规党纪" text overlay
 * Right: Two vertical buttons (制度查询, 互动答题)
 */

import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import settingsIcon from '@iconify-icons/mdi/cog'
import homeLeftIcon from '../assets/home-left-icon.png'
import btnImage from '../assets/btn.png'
import bgHomeImage from '../assets/bg-home.png'
import { PillButton } from './PillButton'

export function HomePage(): React.JSX.Element {
  const navigate = useNavigate()

  const handleQueryClick = (): void => {
    navigate('/query')
  }

  const handleQAClick = (): void => {
    navigate('/qa')
  }

  const handleAdminClick = (): void => {
    navigate('/admin')
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full relative z-10">
      {/* Home page specific background - overrides global background */}
      <div className="fixed inset-0 w-full h-full -z-10">
        <img
          src={bgHomeImage}
          alt=""
          className="w-full h-full object-cover"
          style={{ pointerEvents: 'none' }}
        />
      </div>
      <div className="flex items-center justify-center gap-12 max-w-7xl w-full px-8 py-12">
        {/* Left side: Image with text overlay */}
        <div className="flex-1 max-w-96">
          <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden">
            {/* Background image */}
            <img src={homeLeftIcon} alt="党规党纪" className="w-full h-full object-cover" />

            {/* Overlay for better text readability */}
            {/* <div className="absolute inset-0 bg-black/20" /> */}

            {/* Centered text "党规党纪" */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 text-red-600">
              <h1 className="text-xl md:text-2xl lg:text-4xl font-bold  drop-shadow-2xl text-center px-8">
                党规党纪
              </h1>
              <text className="text-2xl">（汇编）</text>
            </div>
          </div>
        </div>

        {/* Right side: Two vertical buttons */}
        <div className="flex-1 max-w-md flex flex-col gap-8">
          {/* Button 1: 制度查询 */}
          <button
            onClick={handleQueryClick}
            data-home-button="query"
            className="group relative w-full p-8 flex items-center justify-center rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-100 overflow-hidden"
          >
            {/* Button background image */}
            <img src={btnImage} alt="" className="absolute inset-0 w-full h-full object-contain" />
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-1">
              <div className="text-4xl md:text-5xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300">
                制度查询
              </div>
              <div className="text-lg text-gray-600 group-hover:text-red-700 transition-colors duration-300">
                查询相关制度规定
              </div>
            </div>
          </button>

          {/* Button 2: 互动答题 */}
          <button
            onClick={handleQAClick}
            data-home-button="qa"
            className="group relative w-full p-8 flex items-center justify-center rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-100 overflow-hidden"
          >
            <img src={btnImage} alt="" className="absolute inset-0 w-full h-full object-contain" />
            <div className="relative z-10 flex flex-col items-center justify-center gap-1">
              <div className="text-4xl md:text-5xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300">
                互动答题
              </div>
              <div className="text-lg text-gray-600 group-hover:text-red-700 transition-colors duration-300">
                开始答题
              </div>
            </div>
          </button>
        </div>
      </div>
      <PillButton floating size="md" onClick={handleAdminClick}>
        <div className="relative z-10 flex items-center gap-2">
          <Icon
            icon={settingsIcon}
            className="text-xl text-red-600 group-hover:rotate-90 transition-transform duration-300"
          />
          <span className="text-lg font-bold text-red-600">管理</span>
        </div>
      </PillButton>
    </div>
  )
}
