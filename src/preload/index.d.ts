import { ElectronAPI } from '@electron-toolkit/preload'
import type { Category, Entry } from '../renderer/src/types/admin'
import type { Question } from '../renderer/src/types/question'
import type { LicenseStatus } from '../main/license/licenseValidator'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      toggleFullscreen: () => Promise<boolean>
      isFullscreen: () => Promise<boolean>
      focusWindow: () => Promise<boolean>
      notifyAppReady: () => void
      db: {
        getCategories: () => Promise<Category[]>
        addCategory: (
          category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<Category>
        updateCategory: (
          id: string,
          updates: Partial<Omit<Category, 'id' | 'createdAt'>>
        ) => Promise<Category | null>
        deleteCategory: (id: string) => Promise<boolean>
        getEntriesByCategory: (categoryId: string) => Promise<Entry[]>
        addEntry: (entry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Entry>
        updateEntry: (
          id: string,
          categoryId: string,
          updates: Partial<Omit<Entry, 'id' | 'categoryId' | 'createdAt'>>
        ) => Promise<Entry | null>
        deleteEntry: (id: string, categoryId: string) => Promise<boolean>
        importEntries: (
          categoryId: string,
          entries: Array<Omit<Entry, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>>
        ) => Promise<number>
        getQuestions: () => Promise<Question[]>
        addQuestion: (
          question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<Question>
        updateQuestion: (
          id: string,
          updates: Partial<Omit<Question, 'id' | 'createdAt'>>
        ) => Promise<Question | null>
        deleteQuestion: (id: string) => Promise<boolean>
        importQuestions: (questions: Question[]) => Promise<number>
      }
      license: {
        getStatus: () => Promise<LicenseStatus>
        getTrialRemaining: () => Promise<{ value: number; unit: string; expired: boolean }>
        activate: (code: string) => Promise<{ success: boolean; error?: string }>
        needsActivation: () => Promise<boolean>
        getDeviceFingerprint: () => Promise<string>
      }
    }
  }
}
