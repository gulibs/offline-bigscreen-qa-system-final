# 更新日志

## v1.2.2 （修复全屏功能）

### 🐛 Bug 修复

**修复全屏按钮无法点击**

问题：使用 Web Fullscreen API (`document.requestFullscreen()`) 在 Electron 中不稳定。

根本原因：
- Web Fullscreen API 在 Electron 中有兼容性问题
- Electron 有自己的原生全屏 API

解决方案：
- ✅ 使用 Electron IPC 通信调用主进程的 `BrowserWindow.setFullScreen()`
- ✅ 在主进程添加 `toggle-fullscreen` 和 `is-fullscreen` IPC 处理器
- ✅ 在 preload 暴露全屏 API
- ✅ 修改 `useFullscreen` Hook 使用 Electron IPC

**技术实现：**

1. **主进程 (main/index.ts)**

   ```typescript
   ipcMain.handle('toggle-fullscreen', async () => {
     const window = BrowserWindow.getFocusedWindow()
     if (window) {
       const isFullScreen = window.isFullScreen()
       window.setFullScreen(!isFullScreen)
       return !isFullScreen
     }
     return false
   })
   ```

2. **Preload (preload/index.ts)**

   ```typescript
   const api = {
     toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
     isFullscreen: () => ipcRenderer.invoke('is-fullscreen')
   }
   ```

3. **Renderer (useFullscreen Hook)**

   ```typescript
   const toggleFullscreen = async () => {
     const newState = await window.api.toggleFullscreen()
     setIsFullscreen(newState)
   }
   ```

**影响的文件：**
- `src/main/index.ts` - 添加 IPC 处理器
- `src/preload/index.ts` - 暴露 API
- `src/preload/index.d.ts` - 类型定义
- `src/renderer/src/hooks/useFullscreen.ts` - 使用 Electron API

**对比：**

| 方案 | Web API | Electron IPC |
|-----|---------|-------------|
| API | `document.requestFullscreen()` | `BrowserWindow.setFullScreen()` |
| 稳定性 | ❌ 不稳定 | ✅ 稳定 |
| 平台兼容 | ❌ 问题多 | ✅ 完美兼容 |
| 推荐度 | ❌ 不推荐 | ✅ 官方推荐 |

---

## v1.2.1 （修复图标加载问题）

### 🐛 Bug 修复

**修复 Iconify 图标无法加载**

问题：Iconify 试图从网络 CDN 加载图标，被 Electron 的 CSP 策略阻止。

解决方案：
- ✅ 安装 `@iconify-icons/mdi` 离线图标包
- ✅ 直接导入图标数据，无需网络请求
- ✅ 移除字符串形式的图标引用

**技术实现：**

```typescript
// Before (需要网络请求)
<Icon icon="mdi:fullscreen" />

// After (离线图标)
import fullscreenIcon from '@iconify-icons/mdi/fullscreen'
<Icon icon={fullscreenIcon} />
```

**影响的文件：**
- `package.json` - 新增 `@iconify-icons/mdi@1.2.48`
- `src/renderer/src/components/QAScreen.tsx` - 使用离线图标

---

## v1.2.0 （全屏功能 + 响应式布局）

### ✨ 新功能

**全屏演示模式**

添加了类似 PPT 演示的全屏功能：
- 🖥️ 点击右上角全屏按钮进入 / 退出全屏模式
- 🎯 使用 @iconify/react 的 Material Design 图标（离线）
- 🔄 自动检测全屏状态并更新图标
- ⌨️ 支持浏览器原生的 ESC 键退出全屏

**响应式布局优化**

解决了小窗口显示问题：
- 📱 支持小屏幕显示，内容可以滚动
- ✅ 确认答案按钮在任何屏幕尺寸都可见
- 📐 使用 Tailwind 响应式断点 (sm/md/lg)
- 🎨 自适应字体大小和间距

**技术实现：**
- 创建 `useFullscreen` Hook 处理全屏 API
- 支持多浏览器兼容性（Webkit、Mozilla、MS）
- 将 `overflow-hidden` 改为 `overflow-auto` 支持滚动
- 添加渐变背景到底部控制区域提升可见性
- 使用 Tailwind 响应式类：
  - 字体：`text-xl sm:text-2xl md:text-3xl`
  - 间距：`px-4 sm:px-8 md:px-16`
  - 布局：`grid-cols-1 sm:grid-cols-2`

**影响的文件：**
- `src/renderer/src/hooks/useFullscreen.ts` - **新增** 全屏功能 Hook
- `src/renderer/src/components/QAScreen.tsx` - 响应式布局 + 全屏按钮
- `package.json` - 已包含 `@iconify/react@^6.0.2`

**用户体验改进：**
- ✅ 小窗口下所有内容可见且可滚动
- ✅ 全屏模式下获得更沉浸的答题体验
- ✅ 图标直观表达全屏状态
- ✅ 按钮有悬停和半透明背景效果

---

## v1.1.0 （迁移到 Tailwind CSS 4)

### 🎨 重构

**完全迁移到 Tailwind CSS 4**

现在整个 UI 使用 Tailwind CSS 4 的 utility classes 进行样式管理。

**主要改进：**
- ✅ 移除所有自定义 CSS 文件 (`qa.css`)
- ✅ 使用 Tailwind CSS 4 原子化 utility classes
- ✅ 保持原有的视觉设计和用户体验
- ✅ 添加自定义动画文件 (`animations.css`)
- ✅ 在 `main.css` 中导入 `@import 'tailwindcss'`

**技术实现：**
- 使用 `@tailwindcss/vite` 插件 (v4.1.18)
- 所有组件样式使用内联 Tailwind classes
- 自定义动画定义在 `animations.css`（fade-in、scale-in）
- 响应式设计和状态管理保持不变

**样式示例：**

```tsx
// Before (自定义 CSS)
<div className="qa-container">
  <div className="qa-progress">...</div>
</div>

// After (Tailwind CSS 4)
<div className="w-screen h-screen flex flex-col bg-linear-to-br from-indigo-500 to-purple-600">
  <div className="px-16 py-8 bg-black/20">...</div>
</div>
```

**影响的文件：**
- `src/renderer/src/components/QAScreen.tsx` - 使用 Tailwind classes
- `src/renderer/src/assets/animations.css` - 新增自定义动画
- `src/renderer/src/assets/main.css` - 导入 Tailwind CSS
- `src/renderer/src/App.tsx` - 移除旧 CSS 导入
- ~~`src/renderer/src/assets/qa.css`~~ - 已删除

**依赖项：**
- `tailwindcss@^4.1.18` - Tailwind CSS 核心
- `@tailwindcss/vite@^4.1.18` - Vite 插件

---

## v1.0.2 （答错重试功能）

### ✨ 新功能

**答错后可以重新作答**

现在的行为：
- **答对了** → 显示 ✓ 正确动画 → 2 秒后自动进入**下一题**
- **答错了** → 显示 ✗ 错误动画 → 2 秒后**重新答当前题目**
- **提前继续** → 点击屏幕可立即消除动画

**用户体验改进：**
- 答错不会丢失机会，可以重新思考和作答
- 点击屏幕可以快速继续，不必等待 2 秒
- 动画底部提示"点击屏幕继续"

**技术实现：**
- 状态机新增 `lastAnswerCorrect` 字段追踪答案正确性
- `ANIMATION_COMPLETE` 根据答案正确性决定下一步
  - 答对：进入下一题
  - 答错：重置当前题目（清除选择，允许重新作答）
- 动画覆盖层添加点击事件处理

**影响的文件：**
- `src/renderer/src/store/qaStateMachine.ts` - 状态机逻辑
- `src/renderer/src/components/QAScreen.tsx` - UI 交互

---

## v1.0.1 （动画自动消失修复）

### 🐛 Bug 修复

**问题：** 反馈动画不会自动消失

**原因：**
- 动画完成后状态机保持在 `ANIMATION_FEEDBACK` 状态
- 需要用户手动点击"下一题"按钮才能继续
- 动画覆盖层一直显示在屏幕上

**修复：**
- 修改 `qaStateMachine.ts` 中的 `ANIMATION_COMPLETE` 逻辑
- 动画播放 2 秒后自动进入下一题
- 移除"下一题"按钮（不再需要）
- 移除 `NEXT` 输入命令和相关键盘映射

**影响的文件：**
- `src/renderer/src/store/qaStateMachine.ts` - 状态机逻辑
- `src/renderer/src/components/QAScreen.tsx` - UI 组件
- `src/renderer/src/services/inputHandler.ts` - 输入处理
- 文档更新：`README_IMPLEMENTATION.md`, `DEPLOYMENT.md`

### ✅ 新行为

1. 用户选择答案
2. 用户按 Enter 确认
3. 显示反馈动画（✓ 正确 / ✗ 错误）
4. **2 秒后动画自动消失**
5. **自动进入下一题**
6. 最后一题完成后自动进入成绩页面

### 🎮 更新后的操作方式

**键盘操作：**
- `1/2/3/4` 或 `A/B/C/D` - 选择答案
- `Enter` - 确认答案
- ~~`空格` 或 `→` - 下一题~~ （已移除，自动进入）

**触摸操作：**
- 点击答案按钮选择
- 点击"确认答案"按钮
- ~~点击"下一题"按钮~~ （已移除，自动进入）

---

## v1.0.0 （初始版本）

### ✨ 核心功能

- 20 道中文科技题目
- 触摸 + 键盘双输入模式
- 状态机驱动的问答流程
- 答案确认后锁定
- 正确 / 错误反馈动画
- 进度跟踪
- 成绩统计
- Kiosk 模式全屏部署

### 🔒 Kiosk 模式

- 全屏无边框
- 禁用系统快捷键
- 禁用 DevTools （生产环境）
- 操作员退出：`Ctrl+Shift+Alt+Q`

### 🎨 视觉设计

- 渐变紫色主题
- 大字体，大触摸目标
- 专业动画效果
- 响应式布局
