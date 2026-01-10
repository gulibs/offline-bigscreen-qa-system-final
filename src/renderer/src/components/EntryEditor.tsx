/**
 * Entry Editor Component
 * Rich text editor for creating/editing entries using react-draft-wysiwyg-next
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { Editor } from 'react-draft-wysiwyg-next'
import { EditorState, ContentState, convertToRaw } from 'draft-js'
import draftToHtml from 'draftjs-to-html'
import htmlToDraft from 'html-to-draftjs'
import { Icon } from '@iconify/react'
import saveIcon from '@iconify-icons/mdi/content-save'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'
import { LoadingSpinner } from './LoadingSpinner'
import {
  getCategories,
  getEntriesByCategory,
  addEntry,
  updateEntry
} from '../services/adminStorage'
import type { Category, Entry } from '../types/admin'
import { cn } from '@renderer/utils/cn'
import 'react-draft-wysiwyg-next/dist/react-draft-wysiwyg.css'

export function EntryEditor(): React.JSX.Element {
  const { categoryId: categoryIdParam } = useParams<{ categoryId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const categoryId = categoryIdParam ?? ''
  const entryId = searchParams.get('entryId') // For editing existing entry
  const parentIdParam = searchParams.get('parentId') // For adding child entry

  const [category, setCategory] = useState<Category | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [parentEntries, setParentEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [isParentEntry, setIsParentEntry] = useState(false)
  const [isChapter, setIsChapter] = useState(false)
  const [parentEntryId, setParentEntryId] = useState<string>('')
  const [chapterOrder, setChapterOrder] = useState(0)
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty())
  const isMountedRef = useRef(true)
  // Scroll state for header background
  const [isScrolled, setIsScrolled] = useState(false)
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref for cleanup function
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    loadData()

    return () => {
      isMountedRef.current = false
    }
  }, [categoryId, entryId])

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
      if (!isMountedRef.current) return
      setIsLoading(true)
      const categories = await getCategories()
      if (!isMountedRef.current) return

      const foundCategory = categories.find((cat) => cat.id === categoryId)
      if (foundCategory) {
        setCategory(foundCategory)
      }

      // Load all entries for parent selection
      const allEntries = await getEntriesByCategory(categoryId)
      if (!isMountedRef.current) return

      // Filter out chapters (only show parent entries as options)
      const parentOnlyEntries = allEntries.filter((e) => !e.parentEntryId)
      setParentEntries(parentOnlyEntries)

      // If adding child entry, set parent
      if (parentIdParam && !entryId) {
        setIsChapter(true)
        setParentEntryId(parentIdParam)
      }

      // If editing, load entry data
      if (entryId) {
        const foundEntry = allEntries.find((e) => e.id === entryId)
        if (foundEntry) {
          setEntry(foundEntry)
          setTitle(foundEntry.title)
          // Check if it's a parent entry (has no parent and no content or empty content)
          const isEmptyContent =
            !foundEntry.content ||
            foundEntry.content.trim() === '' ||
            foundEntry.content === '<p></p>'
          setIsParentEntry(!foundEntry.parentEntryId && isEmptyContent)
          setIsChapter(!!foundEntry.parentEntryId)
          setParentEntryId(foundEntry.parentEntryId || '')
          setChapterOrder(foundEntry.chapterOrder || 0)
          // Convert HTML content to EditorState
          if (foundEntry.content && foundEntry.content.trim() !== '') {
            const contentBlock = htmlToDraft(foundEntry.content)
            if (contentBlock && isMountedRef.current) {
              const contentState = ContentState.createFromBlockArray(
                contentBlock.contentBlocks,
                contentBlock.entityMap
              )
              setEditorState(EditorState.createWithContent(contentState))
            }
          }
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error('[EntryEditor] Failed to load data:', error)
      alert('加载数据失败，请重试')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) {
      alert('请输入条目标题')
      return
    }

    // If it's a parent entry, content can be empty
    let htmlContent = ''
    if (!isParentEntry) {
      const contentState = editorState.getCurrentContent()
      // Convert Draft.js content to HTML
      htmlContent = draftToHtml(convertToRaw(contentState))
    }

    try {
      if (entryId && entry) {
        await updateEntry(entry.id, categoryId, {
          title: title.trim(),
          content: htmlContent,
          parentEntryId: isChapter ? parentEntryId || null : null,
          chapterOrder: isChapter ? chapterOrder || 0 : 0
        })
      } else {
        await addEntry({
          title: title.trim(),
          content: htmlContent,
          categoryId,
          parentEntryId: isChapter ? parentEntryId || null : null,
          chapterOrder: isChapter ? chapterOrder || 0 : 0
        })
      }

      // Navigate back to entry management
      navigate(`/admin/entries/${categoryId}`)
    } catch (error) {
      console.error('[EntryEditor] Failed to save entry:', error)
      alert('保存条目失败，请重试')
    }
  }

  const handleBack = (): void => {
    navigate(`/admin/entries/${categoryId}`)
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
                title="返回条目管理"
              >
                <Icon icon={arrowLeftIcon} className="text-3xl text-white" />
              </button>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {entryId ? '编辑条目' : '添加条目'}
                </h1>
                <p className="text-lg text-red-100">{category?.name || '条目管理'}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="group flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-100 font-bold shadow-lg hover:shadow-xl border-2 border-red-600 hover:border-red-700"
              style={{ backgroundColor: '#fbfdba' }}
            >
              <Icon icon={saveIcon} className="text-xl text-red-600 group-hover:text-red-700" />
              <span className="text-red-600 group-hover:text-red-700">保存</span>
            </button>
          </div>
        </div>

        {/* Editor Form */}
        <div className="space-y-6 px-36">
          {/* Title Input */}
          <div
            className="p-6 rounded-xl shadow-lg border-2 border-yellow-300"
            style={{ backgroundColor: '#fbfdba' }}
          >
            <label className="block text-sm font-medium text-gray-800 mb-2">条目标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="请输入条目标题"
              autoFocus
            />
          </div>

          {/* Entry Type Settings */}
          <div
            className="p-6 rounded-xl shadow-lg border-2 border-yellow-300"
            style={{ backgroundColor: '#fbfdba' }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isParentEntry"
                  checked={isParentEntry}
                  onChange={(e) => {
                    setIsParentEntry(e.target.checked)
                    if (e.target.checked) {
                      setIsChapter(false)
                      setParentEntryId('')
                    }
                  }}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="isParentEntry" className="text-sm font-medium text-gray-800">
                  作为父条目（不输入内容，可添加子条目）
                </label>
              </div>

              {!isParentEntry && (
                <div className="flex items-center gap-3 pl-8">
                  <input
                    type="checkbox"
                    id="isChapter"
                    checked={isChapter}
                    onChange={(e) => {
                      setIsChapter(e.target.checked)
                      if (!e.target.checked) {
                        setParentEntryId('')
                        setChapterOrder(0)
                      }
                    }}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="isChapter" className="text-sm font-medium text-gray-800">
                    作为章节（属于某个父条目）
                  </label>
                </div>
              )}

              {isChapter && !isParentEntry && (
                <div className="grid grid-cols-2 gap-4 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      选择父条目
                    </label>
                    <select
                      value={parentEntryId}
                      onChange={(e) => setParentEntryId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">请选择父条目</option>
                      {parentEntries.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">章节排序</label>
                    <input
                      type="number"
                      value={chapterOrder}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '') {
                          setChapterOrder(0)
                        } else {
                          const numValue = parseInt(value, 10)
                          if (!Number.isNaN(numValue)) {
                            setChapterOrder(numValue)
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value
                        if (value === '' || Number.isNaN(parseInt(value, 10))) {
                          setChapterOrder(0)
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="数字越小越靠前"
                      min="0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rich Text Editor - Only show if not a parent entry */}
          {!isParentEntry && (
            <div
              className="p-6 rounded-xl shadow-lg border-2 border-yellow-300"
              style={{ backgroundColor: '#fbfdba' }}
            >
              <label className="block text-sm font-medium text-gray-800 mb-2">条目内容</label>
              <div className="relative bg-white rounded-lg border border-gray-300">
                <Editor
                  editorState={editorState}
                  onEditorStateChange={(newState) => {
                    if (isMountedRef.current) {
                      setEditorState(newState)
                    }
                  }}
                  wrapperClassName="editor-wrapper max-h-[560px]"
                  editorClassName="editor-content"
                  toolbarClassName="editor-toolbar sticky top-0 z-30 bg-white"
                  localization={{
                    locale: 'zh'
                  }}
                  toolbar={{
                    options: [
                      'inline',
                      'blockType',
                      'fontSize',
                      'fontFamily',
                      'list',
                      'textAlign',
                      'colorPicker',
                      'link',
                      'emoji',
                      'image',
                      'remove',
                      'history'
                    ],
                    inline: {
                      options: ['bold', 'italic', 'underline', 'strikethrough']
                    },
                    blockType: {
                      options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Blockquote']
                    },
                    fontSize: {
                      options: [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 96]
                    },
                    fontFamily: {
                      options: [
                        'Arial',
                        'Georgia',
                        'Impact',
                        'Tahoma',
                        'Times New Roman',
                        'Verdana',
                        'SimSun',
                        'SimHei',
                        'Microsoft YaHei'
                      ]
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
