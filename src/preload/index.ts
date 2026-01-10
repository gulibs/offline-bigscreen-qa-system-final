import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  notifyAppReady: () => ipcRenderer.send('app-ready'), // Notify main process when React app is ready
  // Database APIs
  db: {
    getCategories: () => ipcRenderer.invoke('db:getCategories'),
    addCategory: (category: unknown) => ipcRenderer.invoke('db:addCategory', category),
    updateCategory: (id: string, updates: unknown) =>
      ipcRenderer.invoke('db:updateCategory', id, updates),
    deleteCategory: (id: string) => ipcRenderer.invoke('db:deleteCategory', id),
    getEntriesByCategory: (categoryId: string) =>
      ipcRenderer.invoke('db:getEntriesByCategory', categoryId),
    addEntry: (entry: unknown) => ipcRenderer.invoke('db:addEntry', entry),
    updateEntry: (id: string, categoryId: string, updates: unknown) =>
      ipcRenderer.invoke('db:updateEntry', id, categoryId, updates),
    deleteEntry: (id: string, categoryId: string) =>
      ipcRenderer.invoke('db:deleteEntry', id, categoryId),
    getQuestions: () => ipcRenderer.invoke('db:getQuestions'),
    addQuestion: (question: unknown) => ipcRenderer.invoke('db:addQuestion', question),
    updateQuestion: (id: string, updates: unknown) =>
      ipcRenderer.invoke('db:updateQuestion', id, updates),
    deleteQuestion: (id: string) => ipcRenderer.invoke('db:deleteQuestion', id),
    importQuestions: (questions: unknown[]) => ipcRenderer.invoke('db:importQuestions', questions),
    importEntries: (categoryId: string, entries: unknown[]) =>
      ipcRenderer.invoke('db:importEntries', categoryId, entries)
  },
  // License APIs
  license: {
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    getTrialRemaining: () => ipcRenderer.invoke('license:getTrialRemaining'),
    activate: (code: string) => ipcRenderer.invoke('license:activate', code),
    needsActivation: () => ipcRenderer.invoke('license:needsActivation'),
    getDeviceFingerprint: () => ipcRenderer.invoke('license:getDeviceFingerprint')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
