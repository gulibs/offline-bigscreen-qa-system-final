/**
 * Category Management Component
 * Manage directory modules (categories)
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'

import addIcon from '@iconify-icons/mdi/plus'
import editIcon from '@iconify-icons/mdi/pencil'
import deleteIcon from '@iconify-icons/mdi/delete'
import folderIcon from '@iconify-icons/mdi/folder'
import fileDocumentEditIcon from '@iconify-icons/mdi/file-document-edit'
import closeIcon from '@iconify-icons/mdi/close'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import logoutIcon from '@iconify-icons/mdi/logout'
import { LoadingSpinner } from './LoadingSpinner'
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory
} from '../services/adminStorage'
import type { Category } from '../types/admin'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '@renderer/utils/cn'

export function CategoryManagement(): React.JSX.Element {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleBack = (): void => {
    navigate('/admin')
  }

  const handleLogout = (): void => {
    if (confirm('确定要退出登录吗？')) {
      logout()
    }
  }

  const handleManageEntries = (categoryId: string): void => {
    navigate(`/admin/entries/${categoryId}`)
  }
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', order: 0 })
  // Scroll state for header background
  const [isScrolled, setIsScrolled] = useState(false)
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref for cleanup function
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  // Ref callback to set up scroll listener when ref is attached
  const setScrollContainerRef = (node: HTMLDivElement | null): void => {
    // Clean up previous listener if exists
    if (scrollCleanupRef.current) {
      scrollCleanupRef.current()
      scrollCleanupRef.current = null
    }

    scrollContainerRef.current = node

    if (node) {
      console.log('[CategoryManagement] Container ref set, attaching scroll listener')
      const handleScroll = (): void => {
        setIsScrolled(node.scrollTop > 0)
      }

      node.addEventListener('scroll', handleScroll, { passive: true })
      console.log('[CategoryManagement] Scroll listener attached')

      // Store cleanup function
      scrollCleanupRef.current = () => {
        console.log('[CategoryManagement] Cleanup: removing scroll listener')
        node.removeEventListener('scroll', handleScroll)
      }
    }
  }

  const loadCategories = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const loaded = await getCategories()
      setCategories(loaded.sort((a, b) => a.order - b.order))
    } catch (error) {
      console.error('[CategoryManagement] Failed to load categories:', error)
      alert('加载类别失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = (): void => {
    setShowAddForm(true)
    setEditingCategory(null)
    setFormData({ name: '', description: '', order: categories.length + 1 })
  }

  const handleEdit = (category: Category): void => {
    console.log('[CategoryManagement] Editing category:', category)
    // Set formData synchronously before showing form
    const newFormData = {
      name: category.name,
      description: category.description,
      order: category.order
    }
    console.log('[CategoryManagement] Setting formData:', newFormData)
    setFormData(newFormData)
    setEditingCategory(category)
    setShowAddForm(true)
  }

  const handleDelete = async (category: Category): Promise<void> => {
    if (confirm(`确定要删除类别"${category.name}"吗？这将删除该类别下的所有条目。`)) {
      try {
        await deleteCategory(category.id)
        await loadCategories()
      } catch (error) {
        console.error('[CategoryManagement] Failed to delete category:', error)
        alert('删除类别失败，请重试')
      }
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!formData.name.trim()) {
      alert('请输入类别名称')
      return
    }

    try {
      if (editingCategory) {
        console.log('[CategoryManagement] Updating category:', editingCategory.id, formData)
        const updated = await updateCategory(editingCategory.id, formData)
        if (updated) {
          console.log('[CategoryManagement] Category updated successfully:', updated)
          alert('类别更新成功')
        } else {
          throw new Error('更新失败：返回值为空')
        }
      } else {
        await addCategory(formData)
        alert('类别添加成功')
      }

      setShowAddForm(false)
      setEditingCategory(null)
      setFormData({ name: '', description: '', order: 0 })
      await loadCategories()
    } catch (error) {
      console.error('[CategoryManagement] Failed to save category:', error)
      alert(`保存类别失败：${error instanceof Error ? error.message : '未知错误'}，请重试`)
    }
  }

  const handleCancel = (): void => {
    setShowAddForm(false)
    setEditingCategory(null)
    setFormData({ name: '', description: '', order: 0 })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full relative z-10">
        <LoadingSpinner size="xl" variant="ring" text="加载中..." fullScreen={false} />
      </div>
    )
  }

  return (
    <div
      ref={setScrollContainerRef}
      className="flex flex-col w-full relative z-10 h-screen overflow-y-auto"
    >
      <div className="w-full">
        {/* Header */}
        <div
          className={cn(
            'sticky top-0 py-8 px-36 backdrop-blur-lg z-20 transition-colors duration-200',
            {
              'bg-red-600/80 backdrop-blur-xs': isScrolled
            }
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Page Back Button - Left of Title */}
              <button
                onClick={handleBack}
                className="shrink-0 p-2 hover:opacity-80 transition-opacity"
                title="返回管理后台"
              >
                <Icon icon={arrowLeftIcon} className="text-3xl text-white" />
              </button>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">目录管理</h1>
                <p className="text-lg text-red-100">管理查询类别</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                style={{
                  backgroundColor: '#fbfdba'
                }}
              >
                <Icon icon={addIcon} className="text-xl" />
                <span>添加类别</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90 border-2 border-yellow-300"
                style={{
                  backgroundColor: '#fbfdba'
                }}
                title="退出登录"
              >
                <Icon icon={logoutIcon} className="text-xl" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit Form - Dialog/Modal */}
        {showAddForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={handleCancel}
          >
            <div
              key={editingCategory?.id || 'new'}
              className="w-full max-w-2xl p-6 rounded-xl shadow-2xl border-2 border-yellow-300 max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: '#fbfdba' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingCategory ? '编辑类别' : '添加类别'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-800 hover:text-red-600 transition-colors"
                  title="关闭"
                >
                  <Icon icon={closeIcon} className="text-2xl" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">类别名称</label>
                  <input
                    key={`name-${editingCategory?.id || 'new'}`}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="请输入类别名称"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">描述</label>
                  <input
                    key={`description-${editingCategory?.id || 'new'}`}
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="请输入描述"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">排序</label>
                  <input
                    key={`order-${editingCategory?.id || 'new'}`}
                    type="number"
                    value={formData.order}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        setFormData({ ...formData, order: 0 })
                      } else {
                        const numValue = parseInt(value, 10)
                        if (!Number.isNaN(numValue)) {
                          setFormData({ ...formData, order: numValue })
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (value === '' || Number.isNaN(parseInt(value, 10))) {
                        setFormData({ ...formData, order: 0 })
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="排序数字"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSubmit}
                    className="group flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-100 font-bold shadow-lg hover:shadow-xl border-2 border-red-600 hover:border-red-700"
                    style={{ backgroundColor: '#fbfdba' }}
                  >
                    <span className="text-red-600 group-hover:text-red-700">保存</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors shadow-md hover:shadow-lg"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8 px-36">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group rounded-xl shadow-lg border-2 border-yellow-300 hover:border-yellow-400 transition-all duration-200 p-6 hover:shadow-xl"
              style={{ backgroundColor: '#fbfdba' }}
            >
              {/* Header with Number and Icon */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  {/* Category Number Circle */}
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-white">
                    {category.order}
                  </div>
                  {/* Folder Icon Overlay */}
                  <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border-2 border-white shadow-md">
                    <Icon icon={folderIcon} className="text-lg text-white" />
                  </div>
                </div>
              </div>

              {/* Category Name */}
              <div className="text-center mb-3">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300">
                  {category.name}
                </h3>
              </div>

              {/* Description */}
              <p className="text-gray-700 mb-4 text-center text-sm min-h-[40px] line-clamp-2">
                {category.description}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleManageEntries(category.id)}
                  className="group flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-100 text-sm font-bold shadow-lg hover:shadow-xl border-2 border-red-600 hover:border-red-700"
                  style={{ backgroundColor: '#fbfdba' }}
                >
                  <Icon
                    icon={fileDocumentEditIcon}
                    className="text-lg text-red-600 group-hover:text-red-700"
                  />
                  <span className="text-red-600 group-hover:text-red-700">管理条目</span>
                </button>
                <button
                  onClick={() => handleEdit(category)}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors shadow-md hover:shadow-lg"
                  title="编辑"
                >
                  <Icon icon={editIcon} className="text-lg" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors shadow-md hover:shadow-lg"
                  title="删除"
                >
                  <Icon icon={deleteIcon} className="text-lg" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
