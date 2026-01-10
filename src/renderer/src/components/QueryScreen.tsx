/**
 * Query Screen Component
 * System Query page with 5 category buttons in grid layout
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { LoadingSpinner } from './LoadingSpinner'
import { getCategories } from '../services/adminStorage'
import type { Category } from '../types/admin'

export function QueryScreen(): React.JSX.Element {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCategories = async (): Promise<void> => {
      try {
        setIsLoading(true)
        const loadedCategories = await getCategories()
        setCategories(loadedCategories.sort((a, b) => a.order - b.order))
      } catch (error) {
        console.error('[QueryScreen] Failed to load categories:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCategories()
  }, [])

  const handleCategoryClick = (category: Category): void => {
    navigate(`/category/${category.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full relative z-10">
        <LoadingSpinner size="xl" variant="ring" text="加载中..." fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen w-full relative z-10 px-8 py-16">
      {/* Page Title */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-4xl lg:text-5xl font-bold text-white mb-4">制度查询目录</h1>
        <p className="text-xl md:text-2xl text-red-100">请选择查询类别</p>
      </div>

      {/* Grid Layout - Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl w-full mb-8">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className="group relative col-span-1 py-6 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-100 border-2 border-transparent hover:border-yellow-300 overflow-hidden min-h-[160px]"
            style={{
              backgroundColor: '#fbfdba'
            }}
          >
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 h-full">
              {/* Category Number */}
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-white">
                {category.order}
              </div>

              {/* Category Name */}
              <div className="text-2xl md:text-3xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300 text-center">
                {category.name}
              </div>

              {/* Description */}
              <div className="text-sm md:text-base text-gray-600 group-hover:text-red-700 transition-colors duration-300 text-center">
                {category.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
