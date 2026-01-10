/**
 * Global Fullscreen Button Component
 * Provides fullscreen toggle functionality available on all pages
 */

import { Icon } from '@iconify/react'
import fullscreenIcon from '@iconify-icons/mdi/fullscreen'
import fullscreenExitIcon from '@iconify-icons/mdi/fullscreen-exit'
import { useFullscreen } from '../hooks/useFullscreen'

export function GlobalFullscreenButton(): React.JSX.Element {
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  return (
    <button
      onClick={toggleFullscreen}
      className="fixed top-4 right-4 z-50 p-3 bg-black/30 hover:bg-black/50 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
      title={isFullscreen ? '退出全屏' : '进入全屏'}
    >
      <Icon
        icon={isFullscreen ? fullscreenExitIcon : fullscreenIcon}
        className="text-3xl text-white"
      />
    </button>
  )
}
