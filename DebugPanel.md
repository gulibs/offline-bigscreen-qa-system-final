## DebugPanel 组件功能

### 1. **可配置显示**

- 通过环境变量控制是否显示
- 支持运行时关闭（通过关闭按钮）
- 支持最小化 / 展开

### 2. **显示内容**

- 路由信息：当前路径、挂载状态、路由 Key、Console 状态、时间戳
- Console 日志：拦截并显示所有 `console.log/warn/error/info/debug`
- 错误捕获：自动捕获全局错误和未处理的 Promise 拒绝

### 3. **Console 输出控制**

**生产环境 Console 控制：**
- 生产环境默认**完全禁用**所有 console 输出（`console.log/warn/error/info/debug` 等）
- 除非通过环境变量 `VITE_CONSOLE_ENABLED=true` 启用
- 可通过 DebugPanel 的 Console 开关按钮（📢/🔇）运行时启用 / 禁用

**环境变量配置：**

```bash
# 启用 Console 输出（生产环境）
VITE_CONSOLE_ENABLED=true
```

**运行时控制：**

```javascript
// 在浏览器控制台执行
localStorage.setItem('console-enabled', 'true')   // 启用
localStorage.setItem('console-enabled', 'false')  // 禁用
```

**默认行为：**
- 开发环境（`pnpm dev`）：Console 默认启用
- 生产环境：Console 默认禁用，除非设置 `VITE_CONSOLE_ENABLED=true`

### 4. **配置方式**

**方式 1：环境变量（推荐）**
在 `.env` 文件中设置：

```bash
# 控制调试面板显示（true=启用, false=禁用）
# 开发环境默认启用，生产环境默认禁用
# 设置为 false 可以强制禁用（即使在开发环境）
VITE_DEBUG_ENABLED=true  # 或 false 来禁用

# 启用 Console 输出（生产环境）
VITE_CONSOLE_ENABLED=true

# 控制显示内容
VITE_DEBUG_SHOW_ROUTE=true
VITE_DEBUG_SHOW_LOGS=true
VITE_DEBUG_SHOW_ERRORS=true

# 日志数量限制
VITE_DEBUG_MAX_LOGS=100

# 面板位置 (top-left, top-right, bottom-left, bottom-right)
VITE_DEBUG_POSITION=top-left
```

**方式 2：localStorage（运行时）**
在浏览器控制台执行：

```javascript
// 控制调试面板
localStorage.setItem('debug-panel-enabled', 'true')  // 启用
localStorage.setItem('debug-panel-enabled', 'false') // 禁用

// 控制 Console 输出
localStorage.setItem('console-enabled', 'true')   // 启用
localStorage.setItem('console-enabled', 'false') // 禁用
```

**方式 3：默认行为**
- 开发环境（`pnpm dev`）：调试面板和 Console 默认启用
- 生产环境：调试面板和 Console 默认禁用，可通过环境变量启用

### 5. **使用场景**

- **开发环境**：默认显示调试面板，Console 启用，方便调试
- **生产测试**：设置 `VITE_DEBUG_ENABLED=true` 和 `VITE_CONSOLE_ENABLED=true` 后打包
- **最终发布**：不设置环境变量，调试面板和 Console 自动隐藏 / 禁用

### 6. **功能特性**

- 最小化 / 展开
- Console 开关（📢/🔇）- 运行时启用 / 禁用 Console 输出
- 清空日志
- 自动滚动到最新日志
- 日志级别颜色区分（error= 红色，warn= 黄色，info= 蓝色等）
- 显示日志来源（文件名和行号）

### 7. **Console 控制说明**

**为什么需要 Console 控制？**
- 生产环境禁用 Console 可以提高性能
- 避免敏感信息泄露到控制台
- 减少不必要的日志输出

**如何启用 Console？**
1. 环境变量：设置 `VITE_CONSOLE_ENABLED=true` 后打包
2. 运行时：在 DebugPanel 中点击 Console 开关按钮（📢/🔇）
3. 代码：在浏览器控制台执行 `localStorage.setItem('console-enabled', 'true')`

现在可以在不同环境中灵活控制调试面板和 Console 输出的显示，方便查看路由信息和日志输出。
