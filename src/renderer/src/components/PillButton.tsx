// import { cn } from '@renderer/utils/cn'
// import React from 'react'

// type PillButtonProps = {
//   /** 内容，自由组合 icon / text / anything */
//   children: React.ReactNode
//   /** 点击 */
//   onClick?: () => void
//   /** 尺寸 */
//   size?: 'sm' | 'md' | 'lg'
//   /** 是否悬浮定位 */
//   floating?: boolean
//   /** 额外 class */
//   className?: string
// }

// export const PillButton: React.FC<PillButtonProps> = ({
//   children,
//   onClick,
//   size = 'md',
//   floating = false,
//   className
// }) => {
//   const sizeClass = {
//     sm: 'px-6 py-2 min-h-12 text-sm',
//     md: 'px-10 py-4 min-h-20 text-base',
//     lg: 'px-14 py-6 min-h-24 text-xl'
//   }[size]

//   return (
//     <button
//       onClick={onClick}
//       className={cn(
//         'group relative flex items-center justify-center rounded-full transition-all duration-300',
//         sizeClass,

//         /* 1. 立体边框复刻：
//            - border: 模拟最外层的深橙色物理边缘
//            - ring: 模拟内部紧贴边框的一圈高亮白色玻璃边（原图立体感的来源）
//         */
//         'border-2 border-[#F4921E]',
//         'ring-[6px] ring-inset ring-white/50',

//         /* 2. 背景色彩：比你之前的色彩更饱满，符合原图的奶油橙过渡 */
//         'bg-linear-to-b from-[#FFF5D6] via-[#FFD780] to-[#FFB040]',

//         /* 3. 深度阴影：
//            - 第一个 inset: 顶部极其细微的白色反光线
//            - 第二个 inset: 底部深橙色阴影产生的凹凸感
//            - 最后一个: 按钮在平面上的外投影
//         */
//         'shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-4px_6px_rgba(215,120,0,0.3),0_6px_15px_-3px_rgba(244,149,30,0.4)]',

//         /* 交互逻辑 */
//         'hover:brightness-105 hover:scale-105 active:scale-95',
//         { 'fixed bottom-4 right-6 z-50': floating },
//         className
//       )}
//     >
//       {/* 4. 椭圆高光：这是复刻原图玻璃质感的灵魂，不能全铺满 */}
//       <span
//         className="
//           pointer-events-none
//           absolute inset-x-4 top-1 h-[45%]
//           rounded-full
//           bg-linear-to-b
//           from-white/80 to-transparent
//         "
//       />

//       {/* 5. 底部弱反光：增加通透感 */}
//       <span className="absolute inset-x-8 bottom-1.5 h-[15%] rounded-full bg-white/20 blur-[2px] pointer-events-none" />

//       {/* 内容区 */}
//       <span className="relative z-10 flex items-center justify-center gap-2 font-bold text-[#A66000]">
//         {children}
//       </span>
//     </button>
//   )
// }
import { cn } from '@renderer/utils/cn'
import React from 'react'

type PillButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  floating?: boolean
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
}

export const PillButton: React.FC<PillButtonProps> = ({
  children,
  onClick,
  size = 'md',
  floating = false,
  rounded = 'full',
  className
}) => {
  // 这里的 padding 就是边框的厚度，原图大约是 2px - 3px 左右
  const sizeConfig = {
    sm: { container: 'h-11', padding: 'p-[2px]', font: 'text-sm px-6' },
    md: { container: 'h-14', padding: 'p-[2.5px]', font: 'text-base px-10' },
    lg: { container: 'h-18', padding: 'p-[3.5px]', font: 'text-xl px-14' }
  }[size]

  // 处理 rounded 属性
  const roundedClass =
    typeof rounded === 'string' && rounded.startsWith('rounded-')
      ? rounded
      : rounded === 'full'
        ? 'rounded-full'
        : rounded === 'none'
          ? 'rounded-none'
          : `rounded-${rounded}`

  return (
    <div
      className={cn(
        'inline-block group transition-transform duration-200 active:scale-95',
        roundedClass,
        sizeConfig.container,
        sizeConfig.padding,

        /* --- 1. 渐变外边框 (取代 ring) --- */
        // 原图外框是上浅下深，模拟金属或塑料边缘
        'bg-linear-to-b from-[#FFF5D6] via-[#FFD780] to-[#FFB040]',

        /* --- 2. 外部投影 --- */
        'shadow-[0_5px_12px_-2px_rgba(215,120,0,0.5)]',

        { 'fixed bottom-4 right-6 z-50': floating },
        className
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden transition-all duration-300',
          roundedClass,
          sizeConfig.font,

          /* --- 3. 内部填充渐变 --- */
          // 极高精准度的色值还原：奶油白 -> 核心橙 -> 深橙
          'bg-linear-to-b from-[#FFFDF7] via-[#FFD882] to-[#FFB040]',

          /* --- 4. 玻璃倒角 (The Glass Bezel) --- */
          // 通过 inset shadow 在渐变边框内侧再加一层高亮的"反光环"
          // 这就是原图中按钮看起来"亮晶晶"的精髓
          'shadow-[inset_0_2px_1px_rgb(255_255_255/0.9),inset_0_-1.5px_3px_rgb(0_0_0/0.08)]'
        )}
      >
        {/* --- 5. 顶部凝胶反射层 (Gel Reflection) --- */}
        {/* 这里使用了 mask-image 的思想，手动调整渐变透明度 */}
        <span
          className="
            pointer-events-none
            absolute top-[1.5px] left-[3%] right-[3%] h-[44%]
            rounded-full
            bg-linear-to-b from-white/95 via-white/40 to-transparent
          "
        />

        {/* --- 6. 底部二次环境反光 --- */}
        <span className="absolute inset-x-8 bottom-1 h-[12%] rounded-full bg-white/25 blur-[1px] pointer-events-none" />

        {/* --- 7. 内容区 (Typography) --- */}
        <span
          className="
          relative z-10 flex items-center justify-center gap-2
          font-bold tracking-tight text-[#915200]
          /* 文字的微小白色投影，模拟雕刻感 */
          drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]
        "
        >
          {children}
        </span>
      </button>
    </div>
  )
}
