/**
 * SQLite Database Service
 * Manages categories and entries in SQLite database
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  const dbPath = join(app.getPath('userData'), 'admin.db')
  console.log('[Database] Initializing database at:', dbPath)
  
  try {
    db = new Database(dbPath)
    console.log('[Database] Database initialized successfully')
  } catch (error) {
    console.error('[Database] Failed to create database:', error)
    // Re-throw the error to see the full stack trace
    throw error
  }

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Create tables
  initializeDatabase(db)

  return db
}

/**
 * Initialize database schema
 */
function initializeDatabase(database: Database.Database): void {
  // Categories table
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `)

  // Entries table
  database.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      parentEntryId TEXT,
      chapterOrder INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (parentEntryId) REFERENCES entries(id) ON DELETE CASCADE
    )
  `)
  
  // Migrate existing entries to add parentEntryId field if it doesn't exist
  try {
    database.exec(`
      ALTER TABLE entries ADD COLUMN parentEntryId TEXT;
    `)
  } catch (error) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`
      ALTER TABLE entries ADD COLUMN chapterOrder INTEGER DEFAULT 0;
    `)
  } catch (error) {
    // Column already exists, ignore
  }
  
  // Note: chapter column migration is handled by ALTER TABLE above
  // If chapter column exists, it will be ignored in queries

  // Questions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      questionType TEXT NOT NULL CHECK(questionType IN ('single', 'multiple')),
      optionType TEXT NOT NULL CHECK(optionType IN ('true-false', 'letter-options')),
      options TEXT NOT NULL,
      correctAnswer TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `)

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_entries_categoryId ON entries(categoryId);
    CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("order");
    CREATE INDEX IF NOT EXISTS idx_questions_questionType ON questions(questionType);
    CREATE INDEX IF NOT EXISTS idx_questions_optionType ON questions(optionType);
  `)

  // Initialize default categories if table is empty
  const count = database.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (count.count === 0) {
    const defaultCategories = [
      { id: '1', name: '党的章程', description: '查看党的章程相关内容', order: 1 },
      { id: '2', name: '作风建设', description: '查看作风建设相关规定', order: 2 },
      { id: '3', name: '权力运行', description: '查看权力运行相关制度', order: 3 },
      { id: '4', name: '监督监察', description: '查看监督监察相关条例', order: 4 },
      { id: '5', name: '执纪执法', description: '查看执纪执法相关规定', order: 5 }
    ]

    const insert = database.prepare(`
      INSERT INTO categories (id, name, description, "order", createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    const insertMany = database.transaction((categories) => {
      for (const cat of categories) {
        insert.run(cat.id, cat.name, cat.description, cat.order, now, now)
      }
    })

    insertMany(defaultCategories)
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
