/**
 * Admin System Type Definitions
 */

export interface Category {
  id: string
  name: string
  description: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface Entry {
  id: string
  categoryId: string
  title: string
  content: string
  parentEntryId?: string | null
  chapterOrder?: number
  createdAt: number
  updatedAt: number
}

export interface AdminState {
  categories: Category[]
  entries: Record<string, Entry[]> // categoryId -> entries
}
