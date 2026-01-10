/**
 * Loading Spinner Component
 * Elegant and beautiful loading spinner with multiple styles
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dots' | 'pulse' | 'ring'
  text?: string
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = 'md',
  variant = 'ring',
  text,
  fullScreen = false
}: LoadingSpinnerProps): React.JSX.Element {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  const spinnerContent = (): React.JSX.Element => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-3 h-3 rounded-full animate-bounce shadow-lg"
              style={{
                backgroundColor: '#fbfdba',
                animationDelay: '0ms',
                animationDuration: '1.4s'
              }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce shadow-lg"
              style={{
                backgroundColor: '#fbfdba',
                animationDelay: '200ms',
                animationDuration: '1.4s'
              }}
            />
            <div
              className="w-3 h-3 rounded-full animate-bounce shadow-lg"
              style={{
                backgroundColor: '#fbfdba',
                animationDelay: '400ms',
                animationDuration: '1.4s'
              }}
            />
          </div>
        )
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} relative`}>
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: '#fbfdba', opacity: 0.3 }}
            />
            <div
              className="absolute inset-0 rounded-full shadow-lg"
              style={{ backgroundColor: '#fbfdba' }}
            />
          </div>
        )
      case 'ring':
        return (
          <div className={`${sizeClasses[size]} relative`}>
            {/* Outer static ring */}
            <div
              className="absolute inset-0 border-4 rounded-full"
              style={{ borderColor: 'rgba(251, 253, 186, 0.3)' }}
            />
            {/* Spinning ring with gradient */}
            <div
              className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
              style={{
                borderTopColor: '#fbfdba',
                borderRightColor: '#fbfdba',
                animationDuration: '0.8s'
              }}
            />
            {/* Inner pulse circle */}
            <div
              className="absolute inset-3 rounded-full animate-pulse"
              style={{ backgroundColor: 'rgba(251, 253, 186, 0.2)', animationDuration: '1.5s' }}
            />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-2 h-2 rounded-full shadow-lg"
                style={{ backgroundColor: '#fbfdba' }}
              />
            </div>
          </div>
        )
      default:
        return (
          <div className={`${sizeClasses[size]} relative`}>
            {/* Outer static ring */}
            <div
              className="absolute inset-0 border-4 rounded-full"
              style={{ borderColor: 'rgba(251, 253, 186, 0.5)' }}
            />
            {/* Spinning ring with gradient effect */}
            <div
              className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
              style={{
                borderTopColor: '#fbfdba',
                borderRightColor: '#fde047',
                animationDuration: '0.8s'
              }}
            />
            {/* Secondary spinning ring (counter-clockwise) */}
            <div
              className="absolute inset-2 border-2 border-transparent rounded-full animate-spin"
              style={{
                borderBottomColor: '#facc15',
                borderLeftColor: '#fde047',
                animationDuration: '1.2s',
                animationDirection: 'reverse'
              }}
            />
            {/* Inner pulse */}
            <div
              className="absolute inset-3 rounded-full animate-pulse"
              style={{ backgroundColor: 'rgba(251, 253, 186, 0.2)', animationDuration: '1.5s' }}
            />
          </div>
        )
    }
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {spinnerContent()}
      {text && (
        <p
          className={`${textSizeClasses[size]} font-medium tracking-wide`}
          style={{ color: '#fbfdba' }}
        >
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
        style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)' }}
      >
        {content}
      </div>
    )
  }

  return content
}
