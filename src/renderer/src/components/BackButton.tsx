/**
 * Back Button Component
 * Fixed position button in bottom-right corner
 * Styled to match the red background theme with #fbfdba buttons
 */

import { Icon } from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/mdi/arrow-left'

interface BackButtonProps {
  onClick: () => void
  label?: string
}

export function BackButton({ onClick, label = '返回首页' }: BackButtonProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-100 border-2 border-yellow-300 hover:border-yellow-400"
      style={{ backgroundColor: '#fbfdba' }}
      title={label}
    >
      <Icon icon={arrowLeftIcon} className="text-2xl text-red-600" />
      <span className="text-xl font-bold text-red-600">{label}</span>
    </button>
  )
}
