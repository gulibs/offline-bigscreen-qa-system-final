/**
 * Admin Data Storage Service
 * Manages categories and entries using SQLite via IPC
 */

import type { Category, Entry } from '../types/admin'

/**
 * Wait for API to be available
 */
function waitForAPI(maxWait = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const checkAPI = (): void => {
      if (window.api?.db) {
        resolve()
      } else if (Date.now() - startTime > maxWait) {
        reject(new Error('Database API not available after waiting'))
      } else {
        setTimeout(checkAPI, 100)
      }
    }
    checkAPI()
  })
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.getCategories()
  } catch (error) {
    console.error('[adminStorage] Failed to get categories:', error)
    throw error
  }
}

/**
 * Save categories (not needed with SQLite, but kept for compatibility)
 */
export function saveCategories(_categories: Category[]): void {
  // No-op: SQLite handles persistence automatically
  console.warn('[adminStorage] saveCategories is deprecated, use addCategory/updateCategory instead')
}

/**
 * Add a new category
 */
export async function addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.addCategory(category)
  } catch (error) {
    console.error('[adminStorage] Failed to add category:', error)
    throw error
  }
}

/**
 * Update a category
 */
export async function updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category | null> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.updateCategory(id, updates)
  } catch (error) {
    console.error('[adminStorage] Failed to update category:', error)
    throw error
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<boolean> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.deleteCategory(id)
  } catch (error) {
    console.error('[adminStorage] Failed to delete category:', error)
    throw error
  }
}

/**
 * Get all entries (grouped by categoryId) - deprecated, use getEntriesByCategory
 */
export async function getEntries(): Promise<Record<string, Entry[]>> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    const categories = await window.api.db.getCategories()
    const entriesMap: Record<string, Entry[]> = {}
    for (const category of categories) {
      entriesMap[category.id] = await window.api.db.getEntriesByCategory(category.id)
    }
    return entriesMap
  } catch (error) {
    console.error('[adminStorage] Failed to get entries:', error)
    throw error
  }
}

/**
 * Get entries for a specific category
 */
export async function getEntriesByCategory(categoryId: string): Promise<Entry[]> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.getEntriesByCategory(categoryId)
  } catch (error) {
    console.error('[adminStorage] Failed to get entries:', error)
    throw error
  }
}

/**
 * Save entries (not needed with SQLite, but kept for compatibility)
 */
export function saveEntries(_entries: Record<string, Entry[]>): void {
  // No-op: SQLite handles persistence automatically
  console.warn('[adminStorage] saveEntries is deprecated, use addEntry/updateEntry instead')
}

/**
 * Add a new entry
 */
export async function addEntry(entry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entry> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.addEntry(entry)
  } catch (error) {
    console.error('[adminStorage] Failed to add entry:', error)
    throw error
  }
}

/**
 * Update an entry
 */
export async function updateEntry(id: string, categoryId: string, updates: Partial<Omit<Entry, 'id' | 'categoryId' | 'createdAt'>>): Promise<Entry | null> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.updateEntry(id, categoryId, updates)
  } catch (error) {
    console.error('[adminStorage] Failed to update entry:', error)
    throw error
  }
}

/**
 * Delete an entry
 */
export async function deleteEntry(id: string, categoryId: string): Promise<boolean> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.deleteEntry(id, categoryId)
  } catch (error) {
    console.error('[adminStorage] Failed to delete entry:', error)
    throw error
  }
}

/**
 * Import entries for a category
 */
export async function importEntries(categoryId: string, entries: Array<Omit<Entry, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>>): Promise<number> {
  try {
    await waitForAPI()
    if (!window.api?.db) {
      throw new Error('Database API not available')
    }
    return await window.api.db.importEntries(categoryId, entries)
  } catch (error) {
    console.error('[adminStorage] Failed to import entries:', error)
    throw error
  }
}




