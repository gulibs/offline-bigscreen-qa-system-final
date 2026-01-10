/**
 * Import Result Dialog Component
 * Displays import results with success count and error details
 */

import { Icon } from '@iconify/react'
import closeIcon from '@iconify-icons/mdi/close'
import checkCircleIcon from '@iconify-icons/mdi/check-circle'
import alertCircleIcon from '@iconify-icons/mdi/alert-circle'

export interface ImportResult {
  successCount: number
  totalCount: number
  errors: Array<{
    index: number
    message: string
  }>
}

interface ImportResultDialogProps {
  isOpen: boolean
  onClose: () => void
  result: ImportResult | null
}

export function ImportResultDialog({
  isOpen,
  onClose,
  result
}: ImportResultDialogProps): React.JSX.Element | null {
  if (!isOpen || !result) return null

  const hasErrors = result.errors.length > 0
  const allSuccess = result.successCount === result.totalCount && !hasErrors

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl p-6 rounded-xl shadow-2xl border-2 border-yellow-300 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#fbfdba' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">导入结果</h2>
          <button
            onClick={onClose}
            className="text-gray-800 hover:text-red-600 transition-colors"
            title="关闭"
          >
            <Icon icon={closeIcon} className="text-2xl" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Summary */}
          <div
            className={`p-4 rounded-lg border-2 ${
              allSuccess
                ? 'bg-green-50 border-green-300'
                : hasErrors
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-blue-50 border-blue-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon
                icon={allSuccess ? checkCircleIcon : alertCircleIcon}
                className={`text-3xl ${allSuccess ? 'text-green-600' : 'text-yellow-600'}`}
              />
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {allSuccess
                    ? '导入成功'
                    : hasErrors
                      ? '部分导入成功'
                      : '导入完成'}
                </p>
                <p className="text-sm text-gray-600">
                  成功: {result.successCount} / 总计: {result.totalCount}
                </p>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {hasErrors && (
            <div className="p-4 rounded-lg bg-red-50 border-2 border-red-300">
              <h3 className="text-lg font-bold text-red-800 mb-3">
                错误详情 ({result.errors.length} 条)
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-white border border-red-200"
                  >
                    <p className="text-sm font-semibold text-red-800">
                      第 {error.index + 1} 条数据：
                    </p>
                    <p className="text-sm text-red-700 mt-1">{error.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg font-semibold"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
