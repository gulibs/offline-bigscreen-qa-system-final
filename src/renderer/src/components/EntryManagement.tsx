/**
 * Entry Management Component
 * Manage entries within a category
 */

import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import chevronDownIcon from '@iconify-icons/mdi/chevron-down'
import chevronRightIcon from '@iconify-icons/mdi/chevron-right'
import deleteIcon from '@iconify-icons/mdi/delete'
import addChildIcon from '@iconify-icons/mdi/folder-plus'
import editIcon from '@iconify-icons/mdi/pencil'
import addIcon from '@iconify-icons/mdi/plus'
import uploadIcon from '@iconify-icons/mdi/upload'
import { Icon } from '@iconify/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
// import downloadIcon from '@iconify-icons/mdi/download' // Hidden for buyer preview
import checkboxBlankIcon from '@iconify-icons/mdi/checkbox-blank-outline'
import checkboxIndeterminateIcon from '@iconify-icons/mdi/checkbox-indeterminate'
import checkboxIcon from '@iconify-icons/mdi/checkbox-marked'
import dragIcon from '@iconify-icons/mdi/drag'
import logoutIcon from '@iconify-icons/mdi/logout'
import { useAuth } from '../contexts/AuthContext'
import {
  addEntry,
  deleteEntry,
  getCategories,
  getEntriesByCategory,
  updateEntry
} from '../services/adminStorage'
import type { Category, Entry } from '../types/admin'
import { getHtmlPreview } from '../utils/htmlUtils'
import { ImportResultDialog, type ImportResult } from './ImportResultDialog'
import { LoadingSpinner } from './LoadingSpinner'
import { WordImportDialog, type ImportMethod } from './WordImportDialog'

import { cn } from '@renderer/utils/cn'
import { parseWordDocuments } from '../services/wordParser'

export function EntryManagement(): React.JSX.Element {
  const { categoryId: categoryIdParam } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const categoryId = categoryIdParam ?? ''

  const handleBack = (): void => {
    navigate('/admin/categories')
  }

  const handleLogout = (): void => {
    // CRITICAL FIX: Do NOT use window.confirm() in Electron!
    // window.confirm() breaks input focus on Windows (Electron bug #31917)
    // Direct logout - window focus is handled by AuthContext
    logout()
  }
  const [category, setCategory] = useState<Category | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Track expanded state for parent entries (like shadcn Sidebar)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showWordImportDialog, setShowWordImportDialog] = useState(false)
  // Selection state for batch delete
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  // Drag and drop state (native HTML5)
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null)
  const [dragOverEntryId, setDragOverEntryId] = useState<string | null>(null)
  const [externalDropZoneActive, setExternalDropZoneActive] = useState(false)
  const dragOverTimeoutRef = useRef<number | null>(null)
  // Scroll state for header background
  const [isScrolled, setIsScrolled] = useState(false)
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref for cleanup function
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    loadData()
  }, [categoryId])

  // Ref callback to set up scroll listener when ref is attached
  const setScrollContainerRef = (node: HTMLDivElement | null): void => {
    // Clean up previous listener if exists
    if (scrollCleanupRef.current) {
      scrollCleanupRef.current()
      scrollCleanupRef.current = null
    }

    scrollContainerRef.current = node

    if (node) {
      const handleScroll = (): void => {
        setIsScrolled(node.scrollTop > 0)
      }

      node.addEventListener('scroll', handleScroll, { passive: true })

      // Store cleanup function
      scrollCleanupRef.current = () => {
        node.removeEventListener('scroll', handleScroll)
      }
    }
  }

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const categories = await getCategories()
      const foundCategory = categories.find((cat) => cat.id === categoryId)
      if (foundCategory) {
        setCategory(foundCategory)
      }

      const categoryEntries = await getEntriesByCategory(categoryId)
      setEntries(categoryEntries)
    } catch (error) {
      console.error('[EntryManagement] Failed to load data:', error)
      alert('加载数据失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = (): void => {
    navigate(`/admin/entries/${categoryId}/edit`)
  }

  const handleAddChild = (parentId: string): void => {
    navigate(`/admin/entries/${categoryId}/edit?parentId=${parentId}`)
  }

  const handleEdit = (entry: Entry): void => {
    navigate(`/admin/entries/${categoryId}/edit?entryId=${entry.id}`)
  }

  const handleDelete = async (entry: Entry): Promise<void> => {
    // Check if entry has children
    const hasChildren = entries.some((e) => e.parentEntryId === entry.id)
    const message = hasChildren
      ? `确定要删除条目"${entry.title}"吗？\n\n注意：这将同时删除所有子条目（共 ${entries.filter((e) => e.parentEntryId === entry.id).length} 个）。`
      : `确定要删除条目"${entry.title}"吗？`

    if (confirm(message)) {
      try {
        await deleteEntry(entry.id, categoryId)
        await loadData()
      } catch (error) {
        console.error('[EntryManagement] Failed to delete entry:', error)
        alert('删除条目失败，请重试')
      }
    }
  }

  // Get all children IDs recursively
  const getAllChildrenIds = (entryId: string): string[] => {
    const children = treeStructure.childrenMap.get(entryId) || []
    const allIds: string[] = []
    children.forEach((child) => {
      allIds.push(child.id)
      allIds.push(...getAllChildrenIds(child.id))
    })
    return allIds
  }

  // Handle checkbox selection with tree logic
  const handleEntrySelect = (entryId: string, checked: boolean): void => {
    setSelectedEntries((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        // Select entry and all its children
        newSet.add(entryId)
        const childrenIds = getAllChildrenIds(entryId)
        childrenIds.forEach((id) => newSet.add(id))
      } else {
        // Unselect entry (but don't affect parent selection)
        newSet.delete(entryId)
        // Note: We don't unselect children when unselecting parent
        // Children can be individually unselected
      }
      return newSet
    })
  }

  // Get selection state for an entry (checked, indeterminate, or unchecked)
  const getSelectionState = (entryId: string): 'checked' | 'indeterminate' | 'unchecked' => {
    const isSelected = selectedEntries.has(entryId)
    const children = treeStructure.childrenMap.get(entryId) || []
    if (children.length === 0) {
      return isSelected ? 'checked' : 'unchecked'
    }
    // Check if all children are selected
    const allChildrenSelected = children.every((child) => {
      const childState = getSelectionState(child.id)
      return childState === 'checked'
    })
    if (allChildrenSelected && isSelected) {
      return 'checked'
    }
    // Check if any child is selected
    const anyChildSelected = children.some((child) => {
      const childState = getSelectionState(child.id)
      return childState === 'checked' || childState === 'indeterminate'
    })
    if (anyChildSelected || isSelected) {
      return 'indeterminate'
    }
    return 'unchecked'
  }

  // Get all entry IDs (including all children recursively)
  const getAllEntryIds = (): string[] => {
    const allIds: string[] = []
    const addEntryAndChildren = (entry: Entry): void => {
      allIds.push(entry.id)
      const children = treeStructure.childrenMap.get(entry.id) || []
      children.forEach((child) => addEntryAndChildren(child))
    }
    treeStructure.parentEntries.forEach((entry) => addEntryAndChildren(entry))
    return allIds
  }

  // Check if all entries are selected
  const areAllEntriesSelected = (): boolean => {
    const allIds = getAllEntryIds()
    if (allIds.length === 0) return false
    return allIds.every((id) => selectedEntries.has(id))
  }

  // Handle select all / deselect all
  const handleSelectAll = (): void => {
    const allIds = getAllEntryIds()
    if (areAllEntriesSelected()) {
      // Deselect all
      setSelectedEntries(new Set())
    } else {
      // Select all
      setSelectedEntries(new Set(allIds))
    }
  }

  // Handle batch delete
  const handleBatchDelete = async (): Promise<void> => {
    if (selectedEntries.size === 0) {
      alert('请先选择要删除的条目')
      return
    }

    const selectedCount = selectedEntries.size
    const message = `确定要删除选中的 ${selectedCount} 个条目吗？\n\n注意：如果选中的条目包含父条目，其所有子条目也会被删除。`

    if (confirm(message)) {
      try {
        // Delete entries one by one
        const entriesToDelete = Array.from(selectedEntries)
        for (const entryId of entriesToDelete) {
          await deleteEntry(entryId, categoryId)
        }
        setSelectedEntries(new Set())
        await loadData()
      } catch (error) {
        console.error('[EntryManagement] Failed to batch delete entries:', error)
        alert('批量删除失败，请重试')
      }
    }
  }

  // Handle drag start (native HTML5)
  const handleDragStart = (e: React.DragEvent, entryId: string): void => {
    const entry = entries.find((e) => e.id === entryId)
    if (!entry) return

    // Check if entry is a parent entry (no parentEntryId and no content)
    const isEmptyContent =
      !entry.content || entry.content.trim() === '' || entry.content === '<p></p>'
    const isParentEntry = !entry.parentEntryId && isEmptyContent

    // Parent entries cannot be dragged
    if (isParentEntry) {
      e.preventDefault()
      return
    }

    setDraggedEntryId(entryId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', entryId)

    // Create a custom drag image to replace the default globe icon
    const dragImage = document.createElement('div')
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-9999px'
    dragImage.style.width = '200px'
    dragImage.style.padding = '12px'
    dragImage.style.backgroundColor = '#fbfdba'
    dragImage.style.border = '2px solid #fde047'
    dragImage.style.borderRadius = '12px'
    dragImage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
    dragImage.style.opacity = '0.8'
    dragImage.textContent = entry.title
    dragImage.style.fontSize = '14px'
    dragImage.style.fontWeight = 'bold'
    dragImage.style.color = '#1f2937'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 100, 20)
    // Clean up after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 0)
  }

  // Handle drag end (native HTML5)
  const handleDragEnd = (): void => {
    // Clear timeout if exists
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current)
      dragOverTimeoutRef.current = null
    }
    setDraggedEntryId(null)
    setDragOverEntryId(null)
    setExternalDropZoneActive(false)
  }

  // Handle drag over (native HTML5) - with debounce to prevent jitter
  const handleDragOver = (e: React.DragEvent, entryId: string): void => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    // Debounce dragOver updates to prevent jitter
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current)
    }
    dragOverTimeoutRef.current = window.setTimeout(() => {
      setDragOverEntryId(entryId)
    }, 10)
  }

  // Handle drag leave (native HTML5)
  const handleDragLeave = (e: React.DragEvent): void => {
    // Only clear if we're actually leaving the element
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      if (dragOverTimeoutRef.current) {
        clearTimeout(dragOverTimeoutRef.current)
        dragOverTimeoutRef.current = null
      }
      setDragOverEntryId(null)
    }
  }

  // Handle drop (native HTML5)
  const handleDrop = async (e: React.DragEvent, targetEntryId: string): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()

    // Clear timeout
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current)
      dragOverTimeoutRef.current = null
    }

    setDragOverEntryId(null)

    if (!draggedEntryId || draggedEntryId === targetEntryId) {
      setDraggedEntryId(null)
      return
    }

    const draggedEntry = entries.find((e) => e.id === draggedEntryId)
    const targetEntry = entries.find((e) => e.id === targetEntryId)

    if (!draggedEntry || !targetEntry) {
      setDraggedEntryId(null)
      return
    }

    try {
      // Check if dragged entry is a normal entry (no parentEntryId but has content)
      // Note: Parent entries cannot be dragged (blocked in handleDragStart)
      const draggedIsNormal =
        !draggedEntry.parentEntryId &&
        draggedEntry.content &&
        draggedEntry.content.trim() !== '' &&
        draggedEntry.content !== '<p></p>'
      // Check if dragged entry is a child (has parentEntryId)
      const draggedIsChild = !!draggedEntry.parentEntryId

      // Check if target entry is a parent entry (no parentEntryId and no content)
      const targetIsParentEntry =
        !targetEntry.parentEntryId &&
        (!targetEntry.content ||
          targetEntry.content.trim() === '' ||
          targetEntry.content === '<p></p>')
      // Check if target entry is a normal entry (no parentEntryId but has content)
      const targetIsNormal =
        !targetEntry.parentEntryId &&
        targetEntry.content &&
        targetEntry.content.trim() !== '' &&
        targetEntry.content !== '<p></p>'
      // Check if target entry is a child (has parentEntryId)
      const targetIsChild = !!targetEntry.parentEntryId

      // Case 1: Moving normal entry (普通条目) to parent entry (becomes child)
      if (draggedIsNormal && targetIsParentEntry) {
        // Normal entry becomes child of target parent
        const targetChildren = entries.filter((e) => e.parentEntryId === targetEntryId)
        const maxChapterOrder =
          targetChildren.length > 0
            ? Math.max(...targetChildren.map((c) => c.chapterOrder || 0))
            : -1
        await updateEntry(draggedEntryId, categoryId, {
          parentEntryId: targetEntryId,
          chapterOrder: maxChapterOrder + 1
        })
      }
      // Case 2: Moving child to different parent entry
      else if (draggedIsChild && targetIsParentEntry) {
        // Move child to target parent
        const targetChildren = entries.filter((e) => e.parentEntryId === targetEntryId)
        const maxChapterOrder =
          targetChildren.length > 0
            ? Math.max(...targetChildren.map((c) => c.chapterOrder || 0))
            : -1
        await updateEntry(draggedEntryId, categoryId, {
          parentEntryId: targetEntryId,
          chapterOrder: maxChapterOrder + 1
        })
      }
      // Case 3: Moving child to reorder within same parent
      else if (
        draggedIsChild &&
        targetIsChild &&
        draggedEntry.parentEntryId === targetEntry.parentEntryId
      ) {
        // Both are children of the same parent, swap chapterOrder
        const draggedOrder = draggedEntry.chapterOrder || 0
        const targetOrder = targetEntry.chapterOrder || 0
        await updateEntry(draggedEntryId, categoryId, { chapterOrder: targetOrder })
        await updateEntry(targetEntryId, categoryId, { chapterOrder: draggedOrder })
      }
      // Case 4: Moving child to different parent's child (change parent)
      else if (
        draggedIsChild &&
        targetIsChild &&
        draggedEntry.parentEntryId !== targetEntry.parentEntryId
      ) {
        // Move child to target's parent
        await updateEntry(draggedEntryId, categoryId, {
          parentEntryId: targetEntry.parentEntryId,
          chapterOrder: targetEntry.chapterOrder || 0
        })
      }
      // Case 5: Moving child to normal entry (remove from parent, become normal entry)
      else if (draggedIsChild && targetIsNormal) {
        // Child becomes normal entry (remove parentEntryId)
        await updateEntry(draggedEntryId, categoryId, {
          parentEntryId: null,
          chapterOrder: targetEntry.chapterOrder || 0
        })
      }
      // Case 6: Moving normal entry to reorder with other normal entries
      else if (draggedIsNormal && targetIsNormal) {
        // Both are normal entries, swap chapterOrder
        const draggedOrder = draggedEntry.chapterOrder || 0
        const targetOrder = targetEntry.chapterOrder || 0
        await updateEntry(draggedEntryId, categoryId, { chapterOrder: targetOrder })
        await updateEntry(targetEntryId, categoryId, { chapterOrder: draggedOrder })
      }

      await loadData()
    } catch (error) {
      console.error('[EntryManagement] Failed to update entry order:', error)
      alert('更新条目顺序失败，请重试')
    } finally {
      setDraggedEntryId(null)
    }
  }

  // Handle drop on external zone (to remove from parent)
  const handleExternalDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedEntryId) return

    const draggedEntry = entries.find((e) => e.id === draggedEntryId)
    if (!draggedEntry) {
      setDraggedEntryId(null)
      return
    }

    const draggedIsChild = !!draggedEntry.parentEntryId
    if (draggedIsChild) {
      try {
        // Get max chapterOrder of normal entries
        const normalEntries = entries.filter(
          (e) => !e.parentEntryId && e.content && e.content.trim() !== '' && e.content !== '<p></p>'
        )
        const maxChapterOrder =
          normalEntries.length > 0 ? Math.max(...normalEntries.map((c) => c.chapterOrder || 0)) : -1
        await updateEntry(draggedEntryId, categoryId, {
          parentEntryId: null,
          chapterOrder: maxChapterOrder + 1
        })
        await loadData()
      } catch (error) {
        console.error('[EntryManagement] Failed to remove from parent:', error)
        alert('移除父条目失败，请重试')
      }
    }

    setDraggedEntryId(null)
    setDragOverEntryId(null)
  }

  // Download template function - Hidden for buyer preview, uncomment if needed
  // const handleDownloadTemplate = async (): Promise<void> => {
  //   if (!category) {
  //     alert('类别信息加载中，请稍候')
  //     return
  //   }
  //   await generateEntriesTemplateForCategory(category.name)
  // }

  const handleImportEntries = (): void => {
    if (!category) {
      alert('类别信息加载中，请稍候')
      return
    }
    setShowWordImportDialog(true)
  }

  const handleWordImport = async (
    method: ImportMethod,
    files: File[],
    parentTitle?: string
  ): Promise<void> => {
    if (!category) {
      throw new Error('类别信息加载中，请稍候')
    }

    if (files.length === 0) {
      throw new Error('请至少选择一个 Word 文档')
    }

    try {
      // Parse all Word documents
      const parsedDocs = await parseWordDocuments(files)

      // Reload existing entries to check for duplicates
      const existingEntries = await getEntriesByCategory(categoryId)

      const result: ImportResult = {
        successCount: 0,
        totalCount: parsedDocs.length,
        errors: []
      }

      let parentEntryId: string | null = null

      // Method 1: Create parent entry first, then import children
      if (method === 'parent-child') {
        if (!parentTitle || !parentTitle.trim()) {
          throw new Error('父条目名称不能为空')
        }

        // Check if parent entry already exists
        const existingParent = existingEntries.find(
          (e) => e.title.trim() === parentTitle.trim() && !e.parentEntryId
        )

        if (existingParent) {
          parentEntryId = existingParent.id
        } else {
          // Create parent entry (no content)
          const parentEntry = await addEntry({
            title: parentTitle.trim(),
            content: '<p></p>', // Empty content for parent entry
            parentEntryId: null,
            chapterOrder: 0,
            categoryId
          })
          parentEntryId = parentEntry.id
        }
      }

      // Import all documents
      for (let i = 0; i < parsedDocs.length; i++) {
        const doc = parsedDocs[i]

        // Check for parsing errors
        if (doc.error) {
          result.errors.push({
            index: i,
            message: `解析失败：${doc.error}`
          })
          continue
        }

        try {
          // Validate entry
          if (!doc.title || doc.title.trim() === '') {
            result.errors.push({
              index: i,
              message: '条目标题不能为空'
            })
            continue
          }

          const normalizedTitle = doc.title.trim()
          const normalizedParentId = parentEntryId || null

          // Check for duplicate entries
          const existingInDb = existingEntries.some((e) => {
            const eTitle = e.title.trim()
            const eParentId = e.parentEntryId || null
            const normalizedEParentId = eParentId || null
            return (
              eTitle === normalizedTitle &&
              normalizedEParentId === normalizedParentId &&
              e.categoryId === categoryId
            )
          })

          if (existingInDb) {
            result.errors.push({
              index: i,
              message: `条目"${doc.title}"已存在，跳过导入`
            })
            continue
          }

          // Create entry
          await addEntry({
            title: doc.title,
            content: doc.content || '<p></p>',
            parentEntryId: normalizedParentId,
            chapterOrder: i + 1, // Use index as chapter order
            categoryId
          })

          result.successCount++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误'
          result.errors.push({
            index: i,
            message: `导入失败：${errorMessage}`
          })
        }
      }

      // Show result dialog
      setImportResult(result)
      setShowImportDialog(true)

      // Reload entries to refresh data
      await loadData()
    } catch (error) {
      console.error('[EntryManagement] Failed to import Word documents:', error)
      throw error
    }
  }

  // Build tree structure with nested children
  const treeStructure = useMemo(() => {
    // Filter parent entries: entries with no parentEntryId (or null/empty string)
    const parentEntries = entries.filter(
      (e) => !e.parentEntryId || e.parentEntryId === null || e.parentEntryId === ''
    )
    const childrenMap = new Map<string, Entry[]>()

    // Create a set of all entry IDs for validation
    const entryIds = new Set(entries.map((e) => e.id))

    // Build children map: group children by their parentEntryId
    entries.forEach((entry) => {
      // Only process entries that have a parentEntryId
      if (entry.parentEntryId && entry.parentEntryId.trim() !== '') {
        // Validate: parentEntryId must exist in entries
        if (!entryIds.has(entry.parentEntryId)) {
          console.warn('[EntryManagement] Invalid parentEntryId:', {
            entryId: entry.id,
            entryTitle: entry.title,
            parentEntryId: entry.parentEntryId,
            message: 'Parent entry does not exist'
          })
          return // Skip this entry
        }

        // Validate: parentEntryId should point to a parent entry (not a child)
        const parentEntry = entries.find((e) => e.id === entry.parentEntryId)
        if (parentEntry && parentEntry.parentEntryId) {
          console.warn('[EntryManagement] Invalid hierarchy:', {
            entryId: entry.id,
            entryTitle: entry.title,
            parentEntryId: entry.parentEntryId,
            parentTitle: parentEntry.title,
            message: 'Parent entry itself has a parent (should be top-level)'
          })
          // Still add it, but log the warning
        }

        if (!childrenMap.has(entry.parentEntryId)) {
          childrenMap.set(entry.parentEntryId, [])
        }
        childrenMap.get(entry.parentEntryId)!.push(entry)
      }
    })

    // Sort children by chapterOrder
    childrenMap.forEach((children) => {
      children.sort((a, b) => (a.chapterOrder || 0) - (b.chapterOrder || 0))
    })

    return { parentEntries, childrenMap }
  }, [entries])

  // Auto-expand all parent entries by default on first load
  useEffect(() => {
    if (treeStructure.parentEntries.length > 0 && expandedEntries.size === 0) {
      const allParentIds = new Set(treeStructure.parentEntries.map((e) => e.id))
      setExpandedEntries(allParentIds)
    }
  }, [treeStructure.parentEntries.length])

  // Toggle expand/collapse for parent entries
  const toggleExpand = (entryId: string): void => {
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

  // Handle external drop zone drag over
  const handleExternalDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setExternalDropZoneActive(true)
  }

  // Handle external drop zone drag leave
  const handleExternalDragLeave = (e: React.DragEvent): void => {
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setExternalDropZoneActive(false)
    }
  }

  // Recursive component to render entry with nested children (native HTML5 drag and drop)
  const renderEntryWithChildren = (entry: Entry, level = 0): React.JSX.Element => {
    const isEmptyContent =
      !entry.content || entry.content.trim() === '' || entry.content === '<p></p>'
    const isParentEntry =
      (!entry.parentEntryId || entry.parentEntryId === null || entry.parentEntryId === '') &&
      isEmptyContent
    const children = treeStructure.childrenMap.get(entry.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expandedEntries.has(entry.id)
    const selectionState = getSelectionState(entry.id)
    const isDragged = draggedEntryId === entry.id
    const isDragOver = dragOverEntryId === entry.id

    return (
      <div
        key={entry.id}
        className="space-y-2"
        style={{ marginLeft: level > 0 ? `${level * 24}px` : '0' }}
      >
        {/* Entry Card */}
        <div
          className={`rounded-xl shadow-lg border-2 transition-all duration-200 ${
            isDragOver
              ? 'border-blue-500 bg-blue-100'
              : isDragged
                ? 'opacity-50 border-gray-400'
                : 'border-yellow-300 hover:border-yellow-400'
          }`}
          style={{
            backgroundColor: isDragOver ? '#dbeafe' : '#fbfdba'
          }}
          onDragOver={(e) => handleDragOver(e, entry.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, entry.id)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 flex items-start gap-3">
                {/* Checkbox for batch selection */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEntrySelect(entry.id, selectionState !== 'checked')
                  }}
                  className="mt-1 p-1 rounded hover:bg-yellow-200 transition-colors"
                  title="选择/取消选择"
                >
                  {selectionState === 'checked' ? (
                    <Icon icon={checkboxIcon} className="text-xl text-red-600" />
                  ) : selectionState === 'indeterminate' ? (
                    <Icon icon={checkboxIndeterminateIcon} className="text-xl text-red-600" />
                  ) : (
                    <Icon icon={checkboxBlankIcon} className="text-xl text-gray-600" />
                  )}
                </button>
                {/* Drag handle - Show for normal entries and child entries, but not for parent entries */}
                {!isParentEntry && (
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation()
                      handleDragStart(e, entry.id)
                    }}
                    onDragEnd={handleDragEnd}
                    className="mt-1 p-1 rounded hover:bg-yellow-200 transition-colors cursor-move"
                    title="拖动排序或改变父子关系"
                  >
                    <Icon icon={dragIcon} className="text-xl text-gray-600" />
                  </div>
                )}
                {isParentEntry && <div className="w-8" />} {/* Spacer for parent entries */}
                {/* Expand/Collapse Button (only for entries with children) */}
                {hasChildren && (
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="mt-1 p-1 rounded hover:bg-yellow-200 transition-colors"
                    title={isExpanded ? '折叠' : '展开'}
                  >
                    <Icon
                      icon={isExpanded ? chevronDownIcon : chevronRightIcon}
                      className="text-xl text-gray-700"
                    />
                  </button>
                )}
                {!hasChildren && <div className="w-8" />} {/* Spacer for alignment */}
                <div className="flex-1">
                  {entry.parentEntryId && (
                    <div className="text-sm font-semibold text-red-600 mb-1">章节</div>
                  )}
                  {isParentEntry && isEmptyContent && (
                    <div className="text-sm font-semibold text-blue-600 mb-1">父条目</div>
                  )}
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{entry.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    更新时间: {new Date(entry.updatedAt).toLocaleString('zh-CN')}
                  </p>
                  {!isEmptyContent && (
                    <div
                      className="text-gray-700 line-clamp-2"
                      dangerouslySetInnerHTML={{
                        __html: getHtmlPreview(entry.content, 150)
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                {isParentEntry && (
                  <button
                    onClick={() => handleAddChild(entry.id)}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                    title="添加子条目"
                  >
                    <Icon icon={addChildIcon} className="text-lg" />
                  </button>
                )}
                <button
                  onClick={() => handleEdit(entry)}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
                  title="编辑"
                >
                  <Icon icon={editIcon} className="text-lg" />
                </button>
                <button
                  onClick={() => handleDelete(entry)}
                  className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
                  title="删除"
                >
                  <Icon icon={deleteIcon} className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Render children nested below parent (only if expanded) - shadcn Sidebar style */}
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {children.map((child) => renderEntryWithChildren(child, level + 1))}
          </div>
        )}
      </div>
    )
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
                title="返回目录管理"
              >
                <Icon icon={arrowLeftIcon} className="text-3xl text-white" />
              </button>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {category?.name || '条目管理'}
                </h1>
                <p className="text-lg text-red-100">管理类别条目</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Select All Button */}
              {entries.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#fbfdba' }}
                  title={areAllEntriesSelected() ? '取消全选' : '全选'}
                >
                  {areAllEntriesSelected() ? (
                    <Icon icon={checkboxIcon} className="text-xl text-red-600" />
                  ) : (
                    <Icon icon={checkboxBlankIcon} className="text-xl text-gray-600" />
                  )}
                  <span>{areAllEntriesSelected() ? '取消全选' : '全选'}</span>
                </button>
              )}
              {selectedEntries.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-white font-semibold hover:opacity-90 bg-red-700 hover:bg-red-800"
                  title="批量删除"
                >
                  <Icon icon={deleteIcon} className="text-xl" />
                  <span>批量删除 ({selectedEntries.size})</span>
                </button>
              )}
              {/* Download template button - Hidden for buyer preview, uncomment if needed */}
              {/* <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                style={{ backgroundColor: '#fbfdba' }}
                title="下载模板"
              >
                <Icon icon={downloadIcon} className="text-xl" />
                <span>下载模板</span>
              </button> */}
              <button
                onClick={handleImportEntries}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                style={{ backgroundColor: '#fbfdba' }}
                title="导入文档"
              >
                <Icon icon={uploadIcon} className="text-xl" />
                <span>导入文档</span>
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90"
                style={{ backgroundColor: '#fbfdba' }}
              >
                <Icon icon={addIcon} className="text-xl" />
                <span>添加条目</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors shadow-lg text-gray-800 font-semibold hover:opacity-90 border-2 border-yellow-300"
                style={{ backgroundColor: '#fbfdba' }}
                title="退出登录"
              >
                <Icon icon={logoutIcon} className="text-xl" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>

        {/* Entries List - Nested Tree Structure with native HTML5 drag and drop */}
        <div className="space-y-4 px-36">
          {entries.length === 0 ? (
            <div
              className="text-center py-12 rounded-xl shadow-lg"
              style={{ backgroundColor: '#fbfdba' }}
            >
              <p className="text-xl text-gray-700 mb-2">暂无条目</p>
              <p className="text-sm text-gray-600">点击"添加条目"开始创建</p>
            </div>
          ) : (
            <>
              {/* External drop zone for removing items from parent */}
              <div
                onDragOver={handleExternalDragOver}
                onDragLeave={handleExternalDragLeave}
                onDrop={handleExternalDrop}
                className={`mb-4 p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
                  externalDropZoneActive
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-gray-300 bg-gray-50 opacity-0 hover:opacity-100'
                }`}
              >
                <div className="text-center text-gray-600">
                  <p className="text-sm font-semibold">拖放到此处移除父条目关系</p>
                  <p className="text-xs mt-1">将子条目拖到这里可恢复为普通条目</p>
                </div>
              </div>
              {treeStructure.parentEntries.map((entry) => renderEntryWithChildren(entry, 0))}
            </>
          )}
        </div>
      </div>

      {/* Word Import Dialog */}
      <WordImportDialog
        isOpen={showWordImportDialog}
        onClose={() => setShowWordImportDialog(false)}
        onImport={handleWordImport}
      />

      {/* Import Result Dialog */}
      {showImportDialog && importResult && (
        <ImportResultDialog
          isOpen={showImportDialog}
          onClose={() => {
            setShowImportDialog(false)
            setImportResult(null)
          }}
          result={importResult}
        />
      )}
    </div>
  )
}
