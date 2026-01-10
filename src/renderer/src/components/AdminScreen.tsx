/**
 * Admin Screen Component
 * Admin entry point with navigation to management pages
 */

import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import logoutIcon from '@iconify-icons/mdi/logout'
import { useAuth } from '../contexts/AuthContext'
import { PillButton } from './PillButton'

export function AdminScreen(): React.JSX.Element {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleManageCategories = (): void => {
    navigate('/admin/categories')
  }

  const handleManageQuestions = (): void => {
    navigate('/admin/questions')
  }

  const handleQASettings = (): void => {
    navigate('/admin/qa-settings')
  }

  const handleLogout = (): void => {
    if (confirm('确定要退出登录吗？')) {
      logout()
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen w-full relative z-10 px-8 py-12">
      <PillButton size="sm" floating className="fixed top-6 right-6" onClick={handleLogout}>
        <Icon icon={logoutIcon} className="text-xl text-red-600" />
        <span className="text-lg font-bold text-red-600">退出登录</span>
      </PillButton>

      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">管理后台</h1>
        <p className="text-xl md:text-2xl text-red-100">系统管理功能</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl w-full">
        <button
          onClick={handleManageCategories}
          className="group relative py-12 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-100 border-2 border-yellow-300 hover:border-yellow-400"
          style={{ backgroundColor: '#fbfdba' }}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-4xl md:text-5xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300">
              目录管理
            </div>
            <div className="text-lg text-gray-600 group-hover:text-red-700 transition-colors duration-300">
              管理查询类别和条目
            </div>
          </div>
        </button>

        <button
          onClick={handleManageQuestions}
          className="group relative py-12 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-100 border-2 border-yellow-300 hover:border-yellow-400"
          style={{ backgroundColor: '#fbfdba' }}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-4xl md:text-5xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300">
              答题管理
            </div>
            <div className="text-lg text-gray-600 group-hover:text-red-700 transition-colors duration-300">
              管理答题题目和选项
            </div>
          </div>
        </button>

        <button
          onClick={handleQASettings}
          className="group relative py-12 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-100 border-2 border-yellow-300 hover:border-yellow-400"
          style={{ backgroundColor: '#fbfdba' }}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-4xl md:text-5xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300">
              答题设置
            </div>
            <div className="text-lg text-gray-600 group-hover:text-red-700 transition-colors duration-300">
              配置出题数量和规则
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
