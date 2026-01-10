/**
 * Word Import Dialog Component
 * Allows users to choose import method and import Word documents
 */

import { useState } from 'react'
import { Icon } from '@iconify/react'
import closeIcon from '@iconify-icons/mdi/close'
import fileDocumentIcon from '@iconify-icons/mdi/file-document'
import folderIcon from '@iconify-icons/mdi/folder'

export type ImportMethod = 'direct' | 'parent-child'

interface WordImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (method: ImportMethod, files: File[], parentTitle?: string) => Promise<void>
}

export function WordImportDialog({
  isOpen,
  onClose,
  onImport
}: WordImportDialogProps): React.JSX.Element | null {
  const [importMethod, setImportMethod] = useState<ImportMethod>('direct')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [parentTitle, setParentTitle] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files || [])
    // Filter only Word documents
    const wordFiles = files.filter(
      (file) =>
        file.name.endsWith('.docx') ||
        file.name.endsWith('.doc') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
    )
    setSelectedFiles(wordFiles)
  }

  const handleImport = async (): Promise<void> => {
    if (selectedFiles.length === 0) {
      alert('请至少选择一个 Word 文档')
      return
    }

    if (importMethod === 'parent-child' && !parentTitle.trim()) {
      alert('请输入父条目名称')
      return
    }

    try {
      setIsImporting(true)
      await onImport(importMethod, selectedFiles, importMethod === 'parent-child' ? parentTitle : undefined)
      // Reset form
      setSelectedFiles([])
      setParentTitle('')
      setImportMethod('direct')
      onClose()
    } catch (error) {
      console.error('[WordImportDialog] Import failed:', error)
      alert(`导入失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = (): void => {
    if (!isImporting) {
      setSelectedFiles([])
      setParentTitle('')
      setImportMethod('direct')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border-2 border-yellow-300 overflow-hidden"
        style={{ backgroundColor: '#fbfdba' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-yellow-300 bg-red-600">
          <h2 className="text-2xl font-bold text-white">导入 Word 文档</h2>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="p-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="关闭"
          >
            <Icon icon={closeIcon} className="text-2xl text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Import Method Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">选择导入方式：</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-yellow-300 cursor-pointer hover:bg-yellow-300/20 transition-colors">
                <input
                  type="radio"
                  name="importMethod"
                  value="direct"
                  checked={importMethod === 'direct'}
                  onChange={(e) => setImportMethod(e.target.value as ImportMethod)}
                  disabled={isImporting}
                  className="w-5 h-5 text-red-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon={fileDocumentIcon} className="text-xl text-red-600" />
                    <span className="font-semibold text-gray-800">直接导入（普通条目）</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-7">
                    直接导入多个 Word 文档，每个文档将创建一个独立的条目
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-yellow-300 cursor-pointer hover:bg-yellow-300/20 transition-colors">
                <input
                  type="radio"
                  name="importMethod"
                  value="parent-child"
                  checked={importMethod === 'parent-child'}
                  onChange={(e) => setImportMethod(e.target.value as ImportMethod)}
                  disabled={isImporting}
                  className="w-5 h-5 text-red-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon icon={folderIcon} className="text-xl text-red-600" />
                    <span className="font-semibold text-gray-800">创建父条目后导入</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-7">
                    先创建一个父条目，然后将多个 Word 文档作为子条目导入
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Parent Title Input (only for parent-child method) */}
          {importMethod === 'parent-child' && (
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-2">
                父条目名称：
              </label>
              <input
                type="text"
                value={parentTitle}
                onChange={(e) => setParentTitle(e.target.value)}
                disabled={isImporting}
                placeholder="请输入父条目名称"
                className="w-full px-4 py-3 rounded-xl border-2 border-yellow-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#fff' }}
              />
            </div>
          )}

          {/* File Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              选择 Word 文档（支持多选）：
            </label>
            <input
              type="file"
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              multiple
              onChange={handleFileSelect}
              disabled={isImporting}
              className="w-full px-4 py-3 rounded-xl border-2 border-yellow-300 text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#fff' }}
            />
            {selectedFiles.length > 0 && (
              <div className="mt-3 p-4 rounded-xl border-2 border-yellow-300" style={{ backgroundColor: '#fff' }}>
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  已选择 {selectedFiles.length} 个文件：
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                      <Icon icon={fileDocumentIcon} className="text-lg text-red-600" />
                      <span className="truncate">{file.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-6 py-4 border-t-2 border-yellow-300 bg-red-600/10">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-6 py-3 rounded-xl border-2 border-yellow-300 text-gray-800 font-semibold hover:bg-yellow-300/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#fbfdba' }}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || selectedFiles.length === 0 || (importMethod === 'parent-child' && !parentTitle.trim())}
            className="px-6 py-3 rounded-xl border-2 border-yellow-300 text-gray-800 font-semibold hover:bg-yellow-300/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#fbfdba' }}
          >
            {isImporting ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  )
}
