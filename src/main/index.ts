import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  screen,
  Menu,
  MenuItem
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getDatabase, closeDatabase } from './database'
import type { Category, Entry } from '../renderer/src/types/admin'
import type { Question } from '../renderer/src/types/question'
import {
  validateLicense,
  getLicenseStatus,
  activateLicense,
  type LicenseStatus
} from './license/licenseValidator'
import { getRemainingTime } from './license/trialManager'

/**
 * Kiosk mode configuration
 * In production: fullscreen, locked down, no system access
 * In development: windowed mode with DevTools access
 */
const KIOSK_CONFIG = {
  enabled: !is.dev,
  operatorExitKeys: 'CommandOrControl+Shift+Alt+Q'
}

function createWindow(): void {
  // 真正全屏 = 无边框窗口 + 全屏模式 + 隐藏菜单栏
  // 按照指南：三个条件缺一不可，才能实现像 PPT/视频播放器一样的真正全屏
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.bounds // 使用 bounds 而不是 workAreaSize，获取完整屏幕尺寸
  console.log('[Main] Screen bounds (完整屏幕):', { width, height })
  console.log('[Main] Screen workAreaSize (可用区域):', display.workAreaSize)

  const mainWindow = new BrowserWindow({
    // 开发环境使用固定尺寸，生产环境使用完整屏幕尺寸
    width,
    height,
    x: display.bounds.x,
    y: display.bounds.y,
    frame: true,
    roundedCorners: false,
    show: false, // 先不显示，等页面加载完成后再显示
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Security: disable DevTools in production
      // Can be enabled via VITE_ENABLE_DEVTOOLS environment variable for testing
      devTools: is.dev || process.env.VITE_ENABLE_DEVTOOLS === 'true',
      // Disable node integration in renderer for security
      nodeIntegration: false,
      // Enable context isolation for security
      contextIsolation: true
    }
  })

  // Only set always on top in kiosk mode (production)
  // In development, allow normal window switching
  // if (KIOSK_CONFIG.enabled) {
  //   mainWindow.setAlwaysOnTop(true, 'main-menu', 1)
  // }

  // 菜单设置将在 browser-window-created 事件中处理
  // 这里先隐藏菜单栏（生产环境）或保持隐藏（开发环境稍后会显示）
  if (KIOSK_CONFIG.enabled) {
    // 生产环境：立即移除菜单
    mainWindow.setMenu(null)
    mainWindow.setMenuBarVisibility(false)
    console.log('[Main] Production mode: Menu removed in createWindow')
  } else {
    // 开发环境：先隐藏，稍后在 browser-window-created 中设置
    mainWindow.setMenuBarVisibility(false)
  }

  // 生产环境：设置窗口边界为完整屏幕（确保覆盖整个屏幕）
  if (KIOSK_CONFIG.enabled) {
    mainWindow.setBounds(display.bounds)
  }

  // 等待页面完全加载后再显示窗口，确保内容已渲染
  mainWindow.webContents.once('did-finish-load', () => {
    // 生产环境：设置窗口边界为完整屏幕（但不自动全屏，由用户通过按钮控制）
    if (KIOSK_CONFIG.enabled) {
      // 确保窗口边界覆盖整个屏幕
      mainWindow.setBounds(display.bounds)
      // 再次确保菜单栏隐藏（双重保险）
      mainWindow.setMenuBarVisibility(false)

      console.log('[Main] 窗口已初始化，窗口尺寸:', mainWindow.getBounds())
    }

    // 等待 React 应用渲染完成（给一个短暂延迟）
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.show()
        console.log('[Main] 窗口已显示，React 应用应已渲染完成')
      }
    }, 100)
  })

  mainWindow.on('ready-to-show', () => {
    // 开发环境：默认打开 DevTools
    // if (is.dev) {
    //   mainWindow.webContents.openDevTools()
    // }

    // 如果启用了 DevTools（通过环境变量），自动打开
    const enableDevTools = process.env.VITE_ENABLE_DEVTOOLS === 'true'
    if (enableDevTools) {
      console.log('[Main] DevTools enabled via VITE_ENABLE_DEVTOOLS, opening DevTools')
      mainWindow.webContents.openDevTools()
    }

    // 如果 did-finish-load 已经触发，这里不需要再 show
    // 如果还没触发，这里作为备用显示（开发环境可能更快）
    if (!mainWindow.isVisible()) {
      setTimeout(() => {
        if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
          mainWindow.show()
        }
      }, 200)
    }
  })

  // 捕获渲染进程的 console 输出并转发到主进程控制台
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelMap = {
      0: 'LOG',
      1: 'WARN',
      2: 'ERROR',
      3: 'DEBUG',
      4: 'INFO'
    }
    const levelName = levelMap[level as keyof typeof levelMap] || 'LOG'
    console.log(`[Renderer ${levelName}] ${message}${sourceId ? ` (${sourceId}:${line})` : ''}`)
  })

  // 监听全屏状态变化（用于调试）
  mainWindow.on('enter-full-screen', () => {
    console.log('[Main] 进入全屏模式')
  })

  mainWindow.on('leave-full-screen', () => {
    console.log('[Main] 退出全屏模式')
    // 不再自动重新进入全屏，由用户通过按钮控制
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Customize context menu: hide "Toggle Developer Tools" but keep copy/paste/cut
  mainWindow.webContents.on('context-menu', (e, params) => {
    // Always show context menu with copy/paste/cut
    // Only hide "Toggle Developer Tools" in production
    e.preventDefault()

    const menu = new Menu()

    // Copy/Paste/Cut/Select All - use role for native behavior
    if (params.editFlags.canCopy) {
      menu.append(
        new MenuItem({
          role: 'copy',
          label: 'Copy',
          accelerator: process.platform === 'darwin' ? 'Cmd+C' : 'Ctrl+C'
        })
      )
    }

    if (params.editFlags.canPaste) {
      menu.append(
        new MenuItem({
          role: 'paste',
          label: 'Paste',
          accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V'
        })
      )
    }

    if (params.editFlags.canCut) {
      menu.append(
        new MenuItem({
          role: 'cut',
          label: 'Cut',
          accelerator: process.platform === 'darwin' ? 'Cmd+X' : 'Ctrl+X'
        })
      )
    }

    if (params.editFlags.canSelectAll) {
      menu.append(
        new MenuItem({
          role: 'selectAll',
          label: 'Select All',
          accelerator: process.platform === 'darwin' ? 'Cmd+A' : 'Ctrl+A'
        })
      )
    }

    // Only add separator if we have edit items
    if (
      params.editFlags.canCopy ||
      params.editFlags.canPaste ||
      params.editFlags.canCut ||
      params.editFlags.canSelectAll
    ) {
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // In development, add DevTools option
    if (!KIOSK_CONFIG.enabled) {
      menu.append(
        new MenuItem({
          label: 'Inspect Element',
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools()
          }
        })
      )
    }

    menu.popup()
  })

  // Handle keyboard input for Q&A system
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // CRITICAL: Always allow copy/paste/cut shortcuts FIRST, before any other checks
    if (input.type === 'keyDown') {
      // Check if this is a copy/paste/cut/selectAll shortcut - NEVER block these
      const isCopyPasteCut =
        (input.control || input.meta) &&
        !input.shift &&
        !input.alt &&
        (input.key === 'c' ||
          input.key === 'C' ||
          input.key === 'v' ||
          input.key === 'V' ||
          input.key === 'x' ||
          input.key === 'X' ||
          input.key === 'a' ||
          input.key === 'A')

      // Always allow copy/paste/cut - return immediately without preventing
      if (isCopyPasteCut) {
        return // Don't prevent, allow default browser behavior
      }
    }

    // 生产环境：完全阻止所有打开 DevTools 的快捷键
    if (KIOSK_CONFIG.enabled && input.type === 'keyDown') {
      // Block all DevTools shortcuts
      const devToolsShortcuts = [
        // Ctrl+Shift+I / Cmd+Shift+I
        (input.control || input.meta) && input.shift && input.key === 'I',
        // F12
        input.key === 'F12',
        // Ctrl+Shift+J / Cmd+Shift+J (Chrome DevTools)
        (input.control || input.meta) && input.shift && input.key === 'J',
        // Ctrl+Shift+C / Cmd+Shift+C (Inspect Element) - but NOT Ctrl+C (copy)
        (input.control || input.meta) && input.shift && input.key === 'C'
      ]

      if (devToolsShortcuts.some(Boolean)) {
        event.preventDefault()
        return
      }
    }

    // 生产环境：阻止退出全屏的快捷键（像 PPT 放映模式一样）
    if (KIOSK_CONFIG.enabled && input.type === 'keyDown') {
      const blockedKeys = ['F11', 'F12', 'Escape'] // Esc 键必须阻止
      const blockedCombos = [
        { ctrl: true, key: 'r' },
        { ctrl: true, key: 'R' },
        { meta: true, key: 'r' },
        { meta: true, key: 'R' },
        // Windows Alt+Tab 也可以阻止（可选）
        { alt: true, key: 'Tab' }
      ]

      // 阻止 F11, F12, Esc（防止退出全屏，指南要求）
      if (blockedKeys.includes(input.key)) {
        event.preventDefault()
        return
      }

      // 阻止 Ctrl+R / Cmd+R (刷新) 和 Alt+Tab
      for (const combo of blockedCombos) {
        if (
          (combo.ctrl && input.control && input.key === combo.key) ||
          (combo.meta && input.meta && input.key === combo.key) ||
          (combo.alt && input.alt && input.key === combo.key)
        ) {
          event.preventDefault()
          return
        }
      }
    }

    // Forward keyboard events to renderer for Q&A input
    if (input.type === 'keyDown') {
      mainWindow.webContents.send('keyboard-input', {
        key: input.key,
        code: input.code,
        shift: input.shift,
        control: input.control,
        alt: input.alt,
        meta: input.meta
      })
    }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    console.log('[Main] Loading dev URL:', process.env['ELECTRON_RENDERER_URL'])
  } else {
    const htmlPath = join(__dirname, '../renderer/index.html')
    console.log('[Main] Loading production HTML:', htmlPath)
    // Load file and ensure initial route is '/'
    mainWindow.loadFile(htmlPath).then(() => {
      // With HashRouter, we don't need to fix pathname
      // HashRouter uses hash (#) for routing which works reliably with file:// protocol
      console.log('[Main] File loaded, HashRouter will handle routing via hash')
      console.log('[Main] Current URL:', mainWindow.webContents.getURL())
    })
  }

  // Debug: Monitor navigation events
  mainWindow.webContents.on('did-navigate', (_event, url) => {
    console.log('[Main] Navigation event - URL:', url)
  })

  mainWindow.webContents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    if (isMainFrame) {
      console.log('[Main] In-page navigation - URL:', url)
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('[Main] App ready, validating license...')

  // Validate license before proceeding
  // In development mode, skip validation for easier testing
  if (!is.dev) {
    const licenseResult = validateLicense()

    // Allow app to run if it needs activation (UI will show activation screen)
    if (!licenseResult.valid && !licenseResult.needsActivation) {
      console.error('[Main] License validation failed:', licenseResult.error)

      // Show error dialog and quit
      const { dialog } = require('electron')
      dialog.showErrorBox(
        'License Validation Failed',
        licenseResult.error ||
          'The application cannot run on this device or the trial period has expired.'
      )
      app.quit()
      return
    }

    if (licenseResult.needsActivation) {
      console.log('[Main] Release edition - needs activation')
    } else {
      console.log('[Main] License validation passed')
      if (licenseResult.edition === 'trial' && licenseResult.trialStatus) {
        const remaining = licenseResult.trialStatus.remaining
        console.log(`[Main] Trial edition - Remaining: ${remaining.value} ${remaining.unit}`)
      }
    }
  } else {
    console.log('[Main] Development mode - skipping license validation')
  }

  console.log('[Main] Registering IPC handlers...')
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    if (!KIOSK_CONFIG.enabled) {
      // 开发环境：先让 optimizer 设置默认菜单，然后立即覆盖为自定义菜单
      optimizer.watchWindowShortcuts(window)

      // 立即覆盖菜单，确保包含 DevTools 和编辑菜单（复制粘贴）
      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: 'File',
          submenu: [
            {
              label: 'Reload',
              accelerator: 'CmdOrCtrl+R',
              click: () => window.reload()
            },
            {
              label: 'Force Reload',
              accelerator: 'CmdOrCtrl+Shift+R',
              click: () => window.webContents.reloadIgnoringCache()
            },
            { type: 'separator' },
            {
              label: 'Quit',
              accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
              click: () => app.quit()
            }
          ]
        },
        {
          label: 'Edit',
          submenu: [
            // Use selector for macOS (native behavior), role for Windows/Linux
            // Note: selector is macOS-specific but TypeScript types don't include it, so we use type assertion
            process.platform === 'darwin'
              ? ({
                  label: 'Cut',
                  accelerator: 'CmdOrCtrl+X',
                  selector: 'cut:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'cut' as const,
                  label: 'Cut',
                  accelerator: 'CmdOrCtrl+X'
                },
            process.platform === 'darwin'
              ? ({
                  label: 'Copy',
                  accelerator: 'CmdOrCtrl+C',
                  selector: 'copy:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'copy' as const,
                  label: 'Copy',
                  accelerator: 'CmdOrCtrl+C'
                },
            process.platform === 'darwin'
              ? ({
                  label: 'Paste',
                  accelerator: 'CmdOrCtrl+V',
                  selector: 'paste:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'paste' as const,
                  label: 'Paste',
                  accelerator: 'CmdOrCtrl+V'
                },
            process.platform === 'darwin'
              ? ({
                  label: 'Select All',
                  accelerator: 'CmdOrCtrl+A',
                  selector: 'selectAll:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'selectAll' as const,
                  label: 'Select All',
                  accelerator: 'CmdOrCtrl+A'
                }
          ]
        },
        {
          label: 'View',
          submenu: [
            {
              label: 'Actual Size',
              accelerator: 'CmdOrCtrl+0',
              click: () => window.webContents.setZoomLevel(0)
            },
            {
              label: 'Zoom In',
              accelerator: 'CmdOrCtrl+Plus',
              click: () => {
                const currentZoom = window.webContents.getZoomLevel()
                window.webContents.setZoomLevel(currentZoom + 0.5)
              }
            },
            {
              label: 'Zoom Out',
              accelerator: 'CmdOrCtrl+-',
              click: () => {
                const currentZoom = window.webContents.getZoomLevel()
                window.webContents.setZoomLevel(currentZoom - 0.5)
              }
            },
            { type: 'separator' },
            {
              label: 'Toggle Developer Tools',
              accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
              click: () => window.webContents.toggleDevTools()
            },
            { type: 'separator' },
            {
              label: 'Toggle Full Screen',
              accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
              click: () => window.setFullScreen(!window.isFullScreen())
            }
          ]
        }
      ]

      if (process.platform === 'darwin') {
        template.unshift({
          label: app.getName(),
          submenu: [
            { role: 'about' as const, label: `About ${app.getName()}` },
            { type: 'separator' },
            { role: 'services' as const, label: 'Services' },
            { type: 'separator' },
            { role: 'hide' as const, label: `Hide ${app.getName()}` },
            { role: 'hideOthers' as const, label: 'Hide Others' },
            { role: 'unhide' as const, label: 'Show All' },
            { type: 'separator' },
            { role: 'quit' as const, label: `Quit ${app.getName()}` }
          ]
        })
      }

      const menu = Menu.buildFromTemplate(template)
      Menu.setApplicationMenu(menu)
      window.setMenuBarVisibility(true)
      console.log('[Main] Development mode: Custom menu with DevTools applied')
    } else {
      // 生产环境：创建隐藏菜单以支持复制粘贴快捷键
      // 菜单栏隐藏，但快捷键仍然有效
      const productionTemplate: Electron.MenuItemConstructorOptions[] = [
        {
          label: 'Edit',
          submenu: [
            // Use selector for macOS (native behavior), role for Windows/Linux
            // Note: selector is macOS-specific but TypeScript types don't include it, so we use type assertion
            process.platform === 'darwin'
              ? ({
                  label: 'Cut',
                  accelerator: 'CmdOrCtrl+X',
                  selector: 'cut:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'cut' as const,
                  label: 'Cut',
                  accelerator: 'CmdOrCtrl+X'
                },
            process.platform === 'darwin'
              ? ({
                  label: 'Copy',
                  accelerator: 'CmdOrCtrl+C',
                  selector: 'copy:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'copy' as const,
                  label: 'Copy',
                  accelerator: 'CmdOrCtrl+C'
                },
            process.platform === 'darwin'
              ? ({
                  label: 'Paste',
                  accelerator: 'CmdOrCtrl+V',
                  selector: 'paste:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'paste' as const,
                  label: 'Paste',
                  accelerator: 'CmdOrCtrl+V'
                },
            process.platform === 'darwin'
              ? ({
                  label: 'Select All',
                  accelerator: 'CmdOrCtrl+A',
                  selector: 'selectAll:'
                } as Electron.MenuItemConstructorOptions)
              : {
                  role: 'selectAll' as const,
                  label: 'Select All',
                  accelerator: 'CmdOrCtrl+A'
                }
          ]
        }
      ]

      const productionMenu = Menu.buildFromTemplate(productionTemplate)
      Menu.setApplicationMenu(productionMenu)
      window.setMenuBarVisibility(false)
      console.log('[Main] Production mode: Hidden menu with copy/paste shortcuts applied')
      // Production: explicitly prevent F12 and other DevTools shortcuts
      // BUT always allow copy/paste/cut shortcuts
      window.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
          // IMPORTANT: Never block copy/paste/cut shortcuts
          const isCopyPasteCut =
            (input.control || input.meta) &&
            !input.shift &&
            !input.alt &&
            (input.key === 'c' ||
              input.key === 'C' ||
              input.key === 'v' ||
              input.key === 'V' ||
              input.key === 'x' ||
              input.key === 'X' ||
              input.key === 'a' ||
              input.key === 'A')

          // Always allow copy/paste/cut - don't prevent
          if (isCopyPasteCut) {
            return // Allow default behavior
          }

          // Block F12 (DevTools)
          if (input.key === 'F12') {
            event.preventDefault()
            return
          }
          // Block Ctrl+Shift+I / Cmd+Shift+I
          if ((input.control || input.meta) && input.shift && input.key === 'I') {
            event.preventDefault()
            return
          }
          // Block Ctrl+Shift+J / Cmd+Shift+J
          if ((input.control || input.meta) && input.shift && input.key === 'J') {
            event.preventDefault()
            return
          }
          // Block Ctrl+Shift+C / Cmd+Shift+C (Inspect Element) - but NOT Ctrl+C (copy)
          if ((input.control || input.meta) && input.shift && input.key === 'C') {
            event.preventDefault()
            return
          }
        }
      })
    }
  })

  // Register operator exit shortcut for kiosk mode
  if (KIOSK_CONFIG.enabled) {
    globalShortcut.register(KIOSK_CONFIG.operatorExitKeys, () => {
      console.log('[Kiosk] Operator exit triggered')
      app.quit()
    })
  }

  // IPC: Ping test
  ipcMain.on('ping', () => console.log('pong'))

  // IPC: App ready notification from renderer
  ipcMain.on('app-ready', () => {
    const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (window && !window.isDestroyed() && !window.isVisible()) {
      window.show()
      console.log('[Main] 窗口已显示（React 应用已就绪）')
    }
  })

  // IPC: License status
  ipcMain.handle('license:getStatus', async (): Promise<LicenseStatus> => {
    return getLicenseStatus()
  })

  // IPC: Get trial remaining time
  ipcMain.handle('license:getTrialRemaining', async () => {
    return getRemainingTime()
  })

  // IPC: Activate license
  ipcMain.handle('license:activate', async (_event, code: string) => {
    return activateLicense(code)
  })

  // IPC: Check if activation is needed
  ipcMain.handle('license:needsActivation', async () => {
    const status = getLicenseStatus()
    return status.needsActivation === true
  })

  // IPC: Get device fingerprint (for generating device-bound activation codes)
  ipcMain.handle('license:getDeviceFingerprint', async () => {
    const { getDeviceFingerprint } = require('./license/deviceFingerprint')
    return getDeviceFingerprint()
  })

  // IPC: Request question data
  ipcMain.handle('load-questions', async () => {
    try {
      const fs = await import('fs/promises')
      const questionsPath = join(__dirname, '../../resources/questions.json')
      const data = await fs.readFile(questionsPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('[Main] Failed to load questions:', error)
      throw error
    }
  })

  // IPC: Fullscreen control
  ipcMain.handle('toggle-fullscreen', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      const isFullScreen = window.isFullScreen()
      window.setFullScreen(!isFullScreen)
      return !isFullScreen
    }
    return false
  })

  ipcMain.handle('is-fullscreen', async () => {
    const window = BrowserWindow.getFocusedWindow()
    return window ? window.isFullScreen() : false
  })

  // IPC: Database operations - Categories
  ipcMain.handle('db:getCategories', async () => {
    try {
      const db = getDatabase()
      const categories = db
        .prepare('SELECT * FROM categories ORDER BY "order" ASC')
        .all() as Category[]
      return categories
    } catch (error) {
      console.error('[Main] Failed to get categories:', error)
      throw error
    }
  })

  ipcMain.handle(
    'db:addCategory',
    async (_event, category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const db = getDatabase()
        const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const now = Date.now()
        db.prepare(
          `
        INSERT INTO categories (id, name, description, "order", createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `
        ).run(id, category.name, category.description, category.order, now, now)
        return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category
      } catch (error) {
        console.error('[Main] Failed to add category:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'db:updateCategory',
    async (_event, id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => {
      try {
        const db = getDatabase()
        const setParts: string[] = []
        const values: unknown[] = []

        if (updates.name !== undefined) {
          setParts.push('name = ?')
          values.push(updates.name)
        }
        if (updates.description !== undefined) {
          setParts.push('description = ?')
          values.push(updates.description)
        }
        if (updates.order !== undefined) {
          setParts.push('"order" = ?')
          values.push(updates.order)
        }

        if (setParts.length === 0) {
          return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | null
        }

        setParts.push('updatedAt = ?')
        values.push(Date.now())
        values.push(id)

        db.prepare(`UPDATE categories SET ${setParts.join(', ')} WHERE id = ?`).run(...values)
        return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | null
      } catch (error) {
        console.error('[Main] Failed to update category:', error)
        throw error
      }
    }
  )

  ipcMain.handle('db:deleteCategory', async (_event, id: string) => {
    try {
      const db = getDatabase()
      const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
      return result.changes > 0
    } catch (error) {
      console.error('[Main] Failed to delete category:', error)
      throw error
    }
  })

  // IPC: Database operations - Entries
  ipcMain.handle('db:getEntriesByCategory', async (_event, categoryId: string) => {
    try {
      console.log('[Main] ========== 数据库查询条目 ==========')
      console.log('[Main] categoryId:', categoryId)
      const db = getDatabase()
      // Get parent entries first, then chapters
      const entries = db
        .prepare(
          `
        SELECT * FROM entries
        WHERE categoryId = ?
        ORDER BY
          CASE WHEN parentEntryId IS NULL THEN 0 ELSE 1 END,
          chapterOrder ASC,
          createdAt DESC
      `
        )
        .all(categoryId) as Entry[]

      console.log('[Main] 数据库返回的条目数量:', entries.length)
      entries.forEach((entry, index) => {
        console.log(`[Main] 条目 ${index + 1}:`, {
          id: entry.id,
          title: entry.title,
          parentEntryId: entry.parentEntryId,
          chapterOrder: entry.chapterOrder,
          hasContent: !!(entry.content && entry.content.trim() !== ''),
          contentLength: entry.content?.length || 0
        })
      })
      console.log('[Main] ========== 数据库查询完成 ==========')
      return entries
    } catch (error) {
      console.error('[Main] Failed to get entries:', error)
      throw error
    }
  })

  ipcMain.handle(
    'db:addEntry',
    async (_event, entry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const db = getDatabase()
        const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const now = Date.now()
        const parentEntryId = entry.parentEntryId || null
        const chapterOrder = entry.chapterOrder || 0
        db.prepare(
          `
        INSERT INTO entries (id, categoryId, title, content, parentEntryId, chapterOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
        ).run(
          id,
          entry.categoryId,
          entry.title,
          entry.content,
          parentEntryId,
          chapterOrder,
          now,
          now
        )
        return db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Entry
      } catch (error) {
        console.error('[Main] Failed to add entry:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'db:updateEntry',
    async (
      _event,
      id: string,
      categoryId: string,
      updates: Partial<Omit<Entry, 'id' | 'categoryId' | 'createdAt'>>
    ) => {
      try {
        const db = getDatabase()
        const setParts: string[] = []
        const values: unknown[] = []

        if (updates.title !== undefined) {
          setParts.push('title = ?')
          values.push(updates.title)
        }
        if (updates.content !== undefined) {
          setParts.push('content = ?')
          values.push(updates.content)
        }
        if (updates.parentEntryId !== undefined) {
          setParts.push('parentEntryId = ?')
          values.push(updates.parentEntryId || null)
        }
        if (updates.chapterOrder !== undefined) {
          setParts.push('chapterOrder = ?')
          values.push(updates.chapterOrder || 0)
        }

        if (setParts.length === 0) {
          return db
            .prepare('SELECT * FROM entries WHERE id = ? AND categoryId = ?')
            .get(id, categoryId) as Entry | null
        }

        setParts.push('updatedAt = ?')
        values.push(Date.now())
        values.push(id, categoryId)

        db.prepare(`UPDATE entries SET ${setParts.join(', ')} WHERE id = ? AND categoryId = ?`).run(
          ...values
        )
        return db
          .prepare('SELECT * FROM entries WHERE id = ? AND categoryId = ?')
          .get(id, categoryId) as Entry | null
      } catch (error) {
        console.error('[Main] Failed to update entry:', error)
        throw error
      }
    }
  )

  ipcMain.handle('db:deleteEntry', async (_event, id: string, categoryId: string) => {
    try {
      const db = getDatabase()
      const result = db
        .prepare('DELETE FROM entries WHERE id = ? AND categoryId = ?')
        .run(id, categoryId)
      return result.changes > 0
    } catch (error) {
      console.error('[Main] Failed to delete entry:', error)
      throw error
    }
  })

  // IPC: Database operations - Questions
  console.log('[Main] Registering db:getQuestions handler')
  ipcMain.handle('db:getQuestions', async () => {
    try {
      console.log('[Main] db:getQuestions handler called')
      const db = getDatabase()
      const questions = db
        .prepare('SELECT * FROM questions ORDER BY createdAt DESC')
        .all() as Array<{
        id: string
        text: string
        questionType: string
        optionType: string
        options: string
        correctAnswer: string
        createdAt: number
        updatedAt: number
      }>
      // Parse JSON fields
      return questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options) as string[],
        correctAnswer: JSON.parse(q.correctAnswer) as number | number[],
        questionType: q.questionType as 'single' | 'multiple',
        optionType: q.optionType as 'true-false' | 'letter-options'
      })) as Question[]
    } catch (error) {
      console.error('[Main] Failed to get questions:', error)
      throw error
    }
  })

  console.log('[Main] Registering db:addQuestion handler')
  ipcMain.handle(
    'db:addQuestion',
    async (_event, question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const db = getDatabase()
        const id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const now = Date.now()
        db.prepare(
          `
        INSERT INTO questions (id, text, questionType, optionType, options, correctAnswer, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
        ).run(
          id,
          question.text,
          question.questionType,
          question.optionType,
          JSON.stringify(question.options),
          JSON.stringify(question.correctAnswer),
          now,
          now
        )
        const saved = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as {
          id: string
          text: string
          questionType: string
          optionType: string
          options: string
          correctAnswer: string
          createdAt: number
          updatedAt: number
        }
        return {
          ...saved,
          options: JSON.parse(saved.options) as string[],
          correctAnswer: JSON.parse(saved.correctAnswer) as number | number[],
          questionType: saved.questionType as 'single' | 'multiple',
          optionType: saved.optionType as 'true-false' | 'letter-options'
        } as Question
      } catch (error) {
        console.error('[Main] Failed to add question:', error)
        throw error
      }
    }
  )

  console.log('[Main] Registering db:updateQuestion handler')
  ipcMain.handle(
    'db:updateQuestion',
    async (_event, id: string, updates: Partial<Omit<Question, 'id' | 'createdAt'>>) => {
      try {
        const db = getDatabase()
        const setParts: string[] = []
        const values: unknown[] = []

        if (updates.text !== undefined) {
          setParts.push('text = ?')
          values.push(updates.text)
        }
        if (updates.questionType !== undefined) {
          setParts.push('questionType = ?')
          values.push(updates.questionType)
        }
        if (updates.optionType !== undefined) {
          setParts.push('optionType = ?')
          values.push(updates.optionType)
        }
        if (updates.options !== undefined) {
          setParts.push('options = ?')
          values.push(JSON.stringify(updates.options))
        }
        if (updates.correctAnswer !== undefined) {
          setParts.push('correctAnswer = ?')
          values.push(JSON.stringify(updates.correctAnswer))
        }

        if (setParts.length === 0) {
          const saved = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as {
            id: string
            text: string
            questionType: string
            optionType: string
            options: string
            correctAnswer: string
            createdAt: number
            updatedAt: number
          } | null
          if (!saved) return null
          return {
            ...saved,
            options: JSON.parse(saved.options) as string[],
            correctAnswer: JSON.parse(saved.correctAnswer) as number | number[],
            questionType: saved.questionType as 'single' | 'multiple',
            optionType: saved.optionType as 'true-false' | 'letter-options'
          } as Question
        }

        setParts.push('updatedAt = ?')
        values.push(Date.now())
        values.push(id)

        db.prepare(`UPDATE questions SET ${setParts.join(', ')} WHERE id = ?`).run(...values)
        const saved = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as {
          id: string
          text: string
          questionType: string
          optionType: string
          options: string
          correctAnswer: string
          createdAt: number
          updatedAt: number
        } | null
        if (!saved) return null
        return {
          ...saved,
          options: JSON.parse(saved.options) as string[],
          correctAnswer: JSON.parse(saved.correctAnswer) as number | number[],
          questionType: saved.questionType as 'single' | 'multiple',
          optionType: saved.optionType as 'true-false' | 'letter-options'
        } as Question
      } catch (error) {
        console.error('[Main] Failed to update question:', error)
        throw error
      }
    }
  )

  console.log('[Main] Registering db:deleteQuestion handler')
  ipcMain.handle('db:deleteQuestion', async (_event, id: string) => {
    try {
      const db = getDatabase()
      const result = db.prepare('DELETE FROM questions WHERE id = ?').run(id)
      return result.changes > 0
    } catch (error) {
      console.error('[Main] Failed to delete question:', error)
      throw error
    }
  })

  console.log('[Main] Registering db:importQuestions handler')
  ipcMain.handle('db:importQuestions', async (_event, questions: Question[]) => {
    try {
      const db = getDatabase()
      const insert = db.prepare(`
        INSERT INTO questions (id, text, questionType, optionType, options, correctAnswer, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const now = Date.now()
      const insertMany = db.transaction((qs: Question[]) => {
        for (const q of qs) {
          const id = q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          insert.run(
            id,
            q.text,
            q.questionType,
            q.optionType,
            JSON.stringify(q.options),
            JSON.stringify(q.correctAnswer),
            q.createdAt || now,
            q.updatedAt || now
          )
        }
      })
      insertMany(questions)
      return questions.length
    } catch (error) {
      console.error('[Main] Failed to import questions:', error)
      throw error
    }
  })

  console.log('[Main] Registering db:importEntries handler')
  ipcMain.handle(
    'db:importEntries',
    async (
      _event,
      categoryId: string,
      entries: Array<Omit<Entry, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>>
    ) => {
      try {
        const db = getDatabase()
        const insert = db.prepare(`
        INSERT INTO entries (id, categoryId, title, content, parentEntryId, chapterOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
        const now = Date.now()
        const insertMany = db.transaction(
          (es: Array<Omit<Entry, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>>) => {
            for (const entry of es) {
              const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              const parentEntryId = entry.parentEntryId || null
              const chapterOrder = entry.chapterOrder || 0
              insert.run(
                id,
                categoryId,
                entry.title,
                entry.content,
                parentEntryId,
                chapterOrder,
                now,
                now
              )
            }
          }
        )
        insertMany(entries)
        return entries.length
      } catch (error) {
        console.error('[Main] Failed to import entries:', error)
        throw error
      }
    }
  )

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up global shortcuts when app quits
app.on('will-quit', () => {
  if (KIOSK_CONFIG.enabled) {
    globalShortcut.unregisterAll()
  }
  closeDatabase()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
