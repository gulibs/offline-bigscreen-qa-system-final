/**
 * Category Viewer Component
 * Redesign: Left sidebar with gradient buttons, right panel with red background
 * Based on the provided design reference
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import chevronDownIcon from '@iconify-icons/mdi/chevron-down'
import chevronRightIcon from '@iconify-icons/mdi/chevron-right'
import folderIcon from '@iconify-icons/mdi/folder'
import folderOutlineIcon from '@iconify-icons/mdi/folder-outline'
import fileDocumentIcon from '@iconify-icons/mdi/file-document'
import fileDocumentOutlineIcon from '@iconify-icons/mdi/file-document-outline'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import { LoadingSpinner } from './LoadingSpinner'
import { getCategories, getEntriesByCategory } from '../services/adminStorage'
import type { Category, Entry } from '../types/admin'
import bg01Image from '../assets/bg-01.png'

export function CategoryViewer(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const categoryId = id ?? ''

  const handleBack = (): void => {
    navigate('/query')
  }
  const [category, setCategory] = useState<Category | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Track expanded state for parent entries (like shadcn Sidebar)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  // Refs for drag scrolling
  const sidebarListRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartYRef = useRef(0)
  const scrollStartRef = useRef(0)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setIsLoading(true)
        console.log('[CategoryViewer] ========== 开始加载数据 ==========')
        console.log('[CategoryViewer] categoryId:', categoryId)

        // Load category
        const categories = await getCategories()
        console.log('[CategoryViewer] 加载的类别数量:', categories.length)
        const foundCategory = categories.find((cat) => cat.id === categoryId)
        console.log('[CategoryViewer] 找到的类别:', foundCategory)
        if (foundCategory) {
          setCategory(foundCategory)
        }

        // Load entries
        const categoryEntries = await getEntriesByCategory(categoryId)
        console.log('[CategoryViewer] ========== 加载的条目数据 ==========')
        console.log('[CategoryViewer] 条目总数:', categoryEntries.length)
        categoryEntries.forEach((entry, index) => {
          const entryInfo = {
            id: entry.id,
            title: entry.title,
            parentEntryId: entry.parentEntryId,
            chapterOrder: entry.chapterOrder,
            hasContent: !!(
              entry.content &&
              entry.content.trim() !== '' &&
              entry.content !== '<p></p>'
            ),
            contentLength: entry.content?.length || 0,
            contentPreview: entry.content?.substring(0, 100) || '(空)'
          }
          console.log(`[CategoryViewer] 条目 ${index + 1}:`, entryInfo)
          // 同时输出 JSON 格式以便查看完整数据
          console.log(
            `[CategoryViewer] 条目 ${index + 1} (JSON):`,
            JSON.stringify(entryInfo, null, 2)
          )
        })

        // 检查数据关系
        console.log('[CategoryViewer] ========== 数据关系检查 ==========')
        const topLevelEntries = categoryEntries.filter(
          (e) => !e.parentEntryId || e.parentEntryId === null || e.parentEntryId === ''
        )
        const childEntries = categoryEntries.filter(
          (e) => e.parentEntryId && e.parentEntryId.trim() !== ''
        )
        console.log('[CategoryViewer] 顶层条目数量:', topLevelEntries.length)
        console.log('[CategoryViewer] 子条目数量:', childEntries.length)

        if (childEntries.length > 0) {
          console.log('[CategoryViewer] 子条目列表:')
          childEntries.forEach((e) => {
            const parent = categoryEntries.find((p) => p.id === e.parentEntryId)
            console.log(
              `[CategoryViewer]   - "${e.title}" 的父条目是: "${parent?.title || e.parentEntryId}"`
            )
          })
        } else {
          console.log('[CategoryViewer] ⚠️ 警告：没有找到任何子条目！所有条目都是顶层条目')
          console.log('[CategoryViewer] ⚠️ 如果应该有父子关系，请检查数据的 parentEntryId 字段')
        }
        setEntries(categoryEntries)

        // Auto-select first non-parent entry if available and no entry is selected
        if (categoryEntries.length > 0) {
          // Build children map to check for parent entries
          const childrenMap = new Map<string, Entry[]>()
          categoryEntries.forEach((entry) => {
            if (entry.parentEntryId && entry.parentEntryId.trim() !== '') {
              if (!childrenMap.has(entry.parentEntryId)) {
                childrenMap.set(entry.parentEntryId, [])
              }
              childrenMap.get(entry.parentEntryId)!.push(entry)
            }
          })

          // Find first entry that is not a parent entry (has content or is a child)
          const firstEntryWithContent = categoryEntries.find((entry) => {
            const isEmptyContent =
              !entry.content || entry.content.trim() === '' || entry.content === '<p></p>'
            const isTopLevel =
              !entry.parentEntryId || entry.parentEntryId === null || entry.parentEntryId === ''
            const hasChildren = (childrenMap.get(entry.id) || []).length > 0
            const isParentEntry = isTopLevel && isEmptyContent && hasChildren
            return !isParentEntry
          })

          // Only auto-select if no entry is currently selected
          setSelectedEntry((prev) => {
            if (prev) {
              // If there's a selected entry, check if it still exists and is valid
              const entry = categoryEntries.find((e) => e.id === prev.id)
              if (entry) {
                const isEmptyContent =
                  !entry.content || entry.content.trim() === '' || entry.content === '<p></p>'
                const isTopLevel =
                  !entry.parentEntryId || entry.parentEntryId === null || entry.parentEntryId === ''
                const hasChildren = (childrenMap.get(entry.id) || []).length > 0
                const isParentEntry = isTopLevel && isEmptyContent && hasChildren
                if (!isParentEntry) {
                  return prev
                }
              }
              return firstEntryWithContent || null
            }
            return firstEntryWithContent || null
          })
        } else {
          setSelectedEntry(null)
        }
      } catch (error) {
        console.error('[CategoryViewer] Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [categoryId])

  const handleEntryClick = (entry: Entry): void => {
    console.log('[CategoryViewer] ========== 点击条目 ==========')
    const clickInfo = {
      id: entry.id,
      title: entry.title,
      parentEntryId: entry.parentEntryId,
      chapterOrder: entry.chapterOrder,
      content: entry.content?.substring(0, 50) + '...'
    }
    console.log('[CategoryViewer] 点击的条目:', clickInfo)
    console.log('[CategoryViewer] 点击的条目 (JSON):', JSON.stringify(clickInfo, null, 2))

    // Check if this is a parent entry (top-level, has children, and empty content)
    const isEmptyContent =
      !entry.content || entry.content.trim() === '' || entry.content === '<p></p>'
    const isTopLevelParent =
      !entry.parentEntryId || entry.parentEntryId === null || entry.parentEntryId === ''
    const children = treeStructure.childrenMap.get(entry.id) || []
    const hasChildren = children.length > 0
    const isParentEntry = isTopLevelParent && isEmptyContent && hasChildren

    const analysisInfo = {
      isEmptyContent,
      isTopLevelParent,
      hasChildren,
      childrenCount: children.length,
      isParentEntry,
      children: children.map((c) => ({ id: c.id, title: c.title }))
    }
    console.log('[CategoryViewer] 条目分析:', analysisInfo)
    console.log('[CategoryViewer] 条目分析 (JSON):', JSON.stringify(analysisInfo, null, 2))

    // If it's a parent entry with children, only toggle expand/collapse, don't show content
    if (isParentEntry) {
      console.log('[CategoryViewer] 这是父条目，只展开/折叠，不显示内容')
      setExpandedEntries((prev) => {
        const newSet = new Set(prev)
        const wasExpanded = newSet.has(entry.id)
        if (wasExpanded) {
          newSet.delete(entry.id)
          console.log('[CategoryViewer] 折叠父条目:', entry.id)
        } else {
          newSet.add(entry.id)
          console.log('[CategoryViewer] 展开父条目:', entry.id)
        }
        console.log('[CategoryViewer] 当前展开状态:', Array.from(newSet))
        return newSet
      })
      return
    }

    // For regular entries (with content), show the content
    console.log('[CategoryViewer] 这是普通条目，显示内容')
    setSelectedEntry(entry)
  }

  // Toggle expand/collapse for parent entries
  const toggleExpand = (entryId: string, event: React.MouseEvent): void => {
    event.stopPropagation()
    setExpandedEntries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  // Drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (!sidebarListRef.current) return
    // Don't start drag if clicking on a button or interactive element
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) return

    isDraggingRef.current = true
    dragStartYRef.current = e.clientY
    scrollStartRef.current = sidebarListRef.current.scrollTop
    sidebarListRef.current.style.cursor = 'grabbing'
    sidebarListRef.current.style.userSelect = 'none'
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDraggingRef.current || !sidebarListRef.current) return
    const deltaY = dragStartYRef.current - e.clientY
    sidebarListRef.current.scrollTop = scrollStartRef.current + deltaY
    e.preventDefault()
  }

  const handleMouseUp = (): void => {
    if (!sidebarListRef.current) return
    isDraggingRef.current = false
    sidebarListRef.current.style.cursor = 'grab'
    sidebarListRef.current.style.userSelect = ''
  }

  const handleMouseLeave = (): void => {
    handleMouseUp()
  }

  // Touch handlers for mobile/touchscreen
  const handleTouchStart = (e: React.TouchEvent): void => {
    if (!sidebarListRef.current) return
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) return

    isDraggingRef.current = true
    dragStartYRef.current = e.touches[0].clientY
    scrollStartRef.current = sidebarListRef.current.scrollTop
    e.preventDefault()
  }

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (!isDraggingRef.current || !sidebarListRef.current) return
    const deltaY = dragStartYRef.current - e.touches[0].clientY
    sidebarListRef.current.scrollTop = scrollStartRef.current + deltaY
    e.preventDefault()
  }

  const handleTouchEnd = (): void => {
    isDraggingRef.current = false
  }

  // Global mouse event handlers for drag scrolling
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent): void => {
      if (isDraggingRef.current && sidebarListRef.current) {
        const deltaY = dragStartYRef.current - e.clientY
        sidebarListRef.current.scrollTop = scrollStartRef.current + deltaY
        e.preventDefault()
      }
    }

    const handleGlobalMouseUp = (): void => {
      if (sidebarListRef.current) {
        isDraggingRef.current = false
        sidebarListRef.current.style.cursor = 'grab'
        sidebarListRef.current.style.userSelect = ''
      }
    }

    if (isDraggingRef.current) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false })
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

  // Build tree structure
  const treeStructure = useMemo(() => {
    console.log('[CategoryViewer] ========== 构建树结构 ==========')
    console.log('[CategoryViewer] 所有条目数量:', entries.length)

    const parentEntries = entries.filter(
      (e) => !e.parentEntryId || e.parentEntryId === null || e.parentEntryId === ''
    )
    console.log('[CategoryViewer] 父条目数量:', parentEntries.length)
    const parentEntriesInfo = parentEntries.map((e) => ({
      id: e.id,
      title: e.title,
      chapterOrder: e.chapterOrder,
      parentEntryId: e.parentEntryId,
      hasContent: !!(e.content && e.content.trim() !== '' && e.content !== '<p></p>'),
      contentLength: e.content?.length || 0
    }))
    console.log('[CategoryViewer] 父条目列表:', parentEntriesInfo)
    console.log('[CategoryViewer] 父条目列表 (JSON):', JSON.stringify(parentEntriesInfo, null, 2))

    // Sort parent entries by chapterOrder
    parentEntries.sort((a, b) => (a.chapterOrder || 0) - (b.chapterOrder || 0))
    const sortedParentEntriesInfo = parentEntries.map((e) => ({
      id: e.id,
      title: e.title,
      chapterOrder: e.chapterOrder,
      parentEntryId: e.parentEntryId,
      hasContent: !!(e.content && e.content.trim() !== '' && e.content !== '<p></p>')
    }))
    console.log('[CategoryViewer] 排序后的父条目:', sortedParentEntriesInfo)
    console.log(
      '[CategoryViewer] 排序后的父条目 (JSON):',
      JSON.stringify(sortedParentEntriesInfo, null, 2)
    )

    const childrenMap = new Map<string, Entry[]>()

    entries.forEach((entry) => {
      if (entry.parentEntryId && entry.parentEntryId.trim() !== '') {
        if (!childrenMap.has(entry.parentEntryId)) {
          childrenMap.set(entry.parentEntryId, [])
        }
        childrenMap.get(entry.parentEntryId)!.push(entry)
      }
    })

    console.log('[CategoryViewer] 子条目映射:')
    if (childrenMap.size === 0) {
      console.log('[CategoryViewer]   警告：没有找到任何子条目！所有条目都是顶层条目')
      console.log('[CategoryViewer]   检查数据：是否有条目的 parentEntryId 指向其他条目？')
      entries.forEach((e) => {
        if (e.parentEntryId) {
          console.log(
            `[CategoryViewer]   找到子条目: ${e.title} (parentEntryId: ${e.parentEntryId})`
          )
        }
      })
    } else {
      childrenMap.forEach((children, parentId) => {
        const parentTitle = entries.find((e) => e.id === parentId)?.title || '未知'
        console.log(
          `[CategoryViewer]   父条目 "${parentTitle}" (${parentId}) 有 ${children.length} 个子条目:`,
          children.map((c) => ({ id: c.id, title: c.title, chapterOrder: c.chapterOrder }))
        )
      })
    }

    // Sort children by chapterOrder
    childrenMap.forEach((children) => {
      children.sort((a, b) => (a.chapterOrder || 0) - (b.chapterOrder || 0))
    })

    console.log('[CategoryViewer] ========== 树结构构建完成 ==========')
    return { parentEntries, childrenMap }
  }, [entries])

  // Auto-expand all parent entries with children when entries are loaded
  useEffect(() => {
    if (entries.length > 0 && treeStructure.childrenMap.size > 0) {
      const parentIdsWithChildren = new Set<string>()
      // Get all parent entry IDs that have children
      treeStructure.childrenMap.forEach((_children, parentId) => {
        parentIdsWithChildren.add(parentId)
      })
      // Also include top-level entries that have children
      treeStructure.parentEntries.forEach((entry) => {
        const hasChildren = (treeStructure.childrenMap.get(entry.id) || []).length > 0
        if (hasChildren) {
          parentIdsWithChildren.add(entry.id)
        }
      })
      setExpandedEntries(parentIdsWithChildren)
      console.log('[CategoryViewer] 自动展开所有父条目:', Array.from(parentIdsWithChildren))
    }
  }, [entries.length, treeStructure.childrenMap.size, treeStructure.parentEntries])

  // Recursive component to render entry with nested children (shadcn Sidebar style)
  const renderEntryWithChildren = (entry: Entry, level = 0): React.JSX.Element => {
    const isEmptyContent =
      !entry.content || entry.content.trim() === '' || entry.content === '<p></p>'
    // Parent entry: no parentEntryId (top-level entry) and has children but no content
    const isTopLevelParent =
      !entry.parentEntryId || entry.parentEntryId === null || entry.parentEntryId === ''
    const children = treeStructure.childrenMap.get(entry.id) || []
    const hasChildren = children.length > 0
    const isParentEntry = isTopLevelParent && isEmptyContent && hasChildren
    const isExpanded = expandedEntries.has(entry.id)
    // Determine if this is a child entry (has parentEntryId)
    const isChildEntry = !isTopLevelParent

    if (level === 0) {
      const renderInfo = {
        id: entry.id,
        title: entry.title,
        isTopLevelParent,
        isEmptyContent,
        hasChildren,
        isParentEntry,
        isExpanded,
        chapterOrder: entry.chapterOrder,
        parentEntryId: entry.parentEntryId
      }
      console.log('[CategoryViewer] 渲染顶层条目:', renderInfo)
      console.log('[CategoryViewer] 渲染顶层条目 (JSON):', JSON.stringify(renderInfo, null, 2))
    }

    return (
      <div key={entry.id} className="space-y-1" style={{ paddingLeft: level > 0 ? '1rem' : '0' }}>
        <button
          onClick={() => handleEntryClick(entry)}
          className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 ${
            selectedEntry?.id === entry.id && !isParentEntry
              ? 'shadow-lg scale-105 border-2 border-yellow-300'
              : 'hover:shadow-md border-2 border-transparent'
          }`}
          style={{
            backgroundColor:
              selectedEntry?.id === entry.id && !isParentEntry ? '#fbfdba' : '#fbfdba',
            opacity: selectedEntry?.id === entry.id && !isParentEntry ? 1 : level > 0 ? 0.85 : 0.9
          }}
        >
          <div className="flex items-center gap-1.5">
            {/* Expand/Collapse Button (only for entries with children) */}
            {hasChildren && (
              <button
                onClick={(e) => toggleExpand(entry.id, e)}
                className="p-0.5 rounded hover:bg-yellow-200 transition-colors shrink-0"
                title={isExpanded ? '折叠' : '展开'}
              >
                <Icon
                  icon={isExpanded ? chevronDownIcon : chevronRightIcon}
                  className="text-base text-gray-700"
                />
              </button>
            )}
            {!hasChildren && <div className="w-6" />} {/* Spacer for alignment */}
            {/* Icon indicator for parent/child entry */}
            <div
              className="shrink-0"
              title={isParentEntry ? '父条目' : isChildEntry ? '子条目' : '条目'}
            >
              {isParentEntry ? (
                <Icon
                  icon={isExpanded ? folderIcon : folderOutlineIcon}
                  className="text-base text-red-600"
                />
              ) : isChildEntry ? (
                <Icon icon={fileDocumentOutlineIcon} className="text-base text-red-400" />
              ) : (
                <Icon icon={fileDocumentIcon} className="text-base text-gray-600" />
              )}
            </div>
            <div
              className={`flex-1 min-w-0 ${level === 0 ? 'font-semibold text-sm' : 'font-medium text-xs'} leading-relaxed line-clamp-2 ${
                selectedEntry?.id === entry.id && !isParentEntry
                  ? 'text-gray-800'
                  : level > 0
                    ? 'text-gray-600'
                    : 'text-gray-700'
              }`}
            >
              {entry.title}
            </div>
            {/* Badge: Show child count for parent entries */}
            {isParentEntry && hasChildren && (
              <span
                className="shrink-0 px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white border border-yellow-300"
                title={`包含 ${children.length} 个子条目`}
              >
                {children.length}
              </span>
            )}
          </div>
        </button>

        {/* Render children nested below parent (only if expanded) */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {children.map((child) => renderEntryWithChildren(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full relative z-10 items-center justify-center">
        <LoadingSpinner size="xl" variant="ring" text="加载中..." fullScreen={false} />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full relative z-10">
      {/* Category viewer specific background - overrides global background */}
      <div className="fixed inset-0 w-full h-full -z-10">
        <img
          src={bg01Image}
          alt=""
          className="w-full h-full object-cover"
          style={{ pointerEvents: 'none' }}
        />
      </div>
      {/* Left Sidebar - Entry List with Gradient Buttons */}
      <div className="w-96 shrink-0 overflow-y-auto flex flex-col">
        {/* Category Header */}
        <div className="p-6">
          <div className="flex items-center gap-4">
            {/* Page Back Button - Left of Title */}
            <button
              onClick={handleBack}
              className="shrink-0 p-2 hover:opacity-80 transition-opacity"
              title="返回查询目录"
            >
              <Icon icon={arrowLeftIcon} className="text-3xl text-white" />
            </button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                {category?.name || '加载中...'}
              </h2>
              <p className="text-sm text-red-200">{category?.description || ''}</p>
            </div>
          </div>
        </div>

        {/* Entry List - Collapsible Tree Structure (shadcn Sidebar style) */}
        <div
          ref={sidebarListRef}
          className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden"
          style={{ cursor: 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {entries.length === 0 ? (
            <div className="text-center py-12 text-red-200">
              <p className="text-lg">暂无条目</p>
              <p className="text-sm mt-2">请在管理页面添加条目</p>
            </div>
          ) : (
            treeStructure.parentEntries
              .sort((a, b) => (a.chapterOrder || 0) - (b.chapterOrder || 0))
              .map((entry) => renderEntryWithChildren(entry))
          )}
        </div>

        {/* Decorative Footer - Placeholder for Tiananmen/Party Emblem */}
        {/* <div className="p-4 border-t border-red-600 bg-red-800">
          <div className="h-24 bg-linear-to-br from-red-600 to-yellow-600 rounded-lg flex items-center justify-center opacity-50">
            <div className="text-white text-xs text-center">
              <div className="text-lg mb-1">★</div>
              <div>中华人民共和国</div>
            </div>
          </div>
        </div> */}
      </div>

      {/* Right Panel - Red Background Content Display */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        {selectedEntry ? (
          <div className="flex-1 p-8 md:p-12 lg:p-16">
            <div className="max-w-5xl mx-auto">
              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {selectedEntry.title}
              </h1>

              {/* Subtitle - Date and Approval Info */}
              <div className="text-lg md:text-xl text-red-100 mb-10 pb-4 border-b border-red-500">
                更新时间: {new Date(selectedEntry.updatedAt).toLocaleString('zh-CN')}
              </div>

              {/* Content - Render HTML with background */}
              <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
                <div
                  className="text-gray-800 leading-relaxed text-lg md:text-xl entry-content prose prose-lg max-w-none"
                  style={
                    {
                      // Allow inline styles from Word documents
                      // Preserve font sizes, colors, alignments, etc.
                    }
                  }
                  dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-200">
              <p className="text-3xl mb-4">请从左侧选择条目</p>
              <p className="text-lg">点击条目标题查看内容</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
