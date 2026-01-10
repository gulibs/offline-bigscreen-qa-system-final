/**
 * Template Generator Service
 * Generates Excel template files for import using exceljs
 */

import ExcelJS from 'exceljs'
import type { Entry } from '../types/admin'
import type { Category } from '../types/admin'

/**
 * Generate entries import Excel template for a single category
 * Format: 类型(普通条目/父条目/子条目), 标题, 内容(父条目为空), 章节顺序(可选)
 *
 * Entry types:
 * - 普通条目: Standalone article, no parent, has content (independent article)
 * - 父条目: Parent entry, no parent, no content, can have children
 * - 子条目: Child entry, has parent, has content (belongs to most recent parent above)
 */
export async function generateEntriesTemplateForCategory(categoryName: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()

  // Main data sheet
  const worksheet = workbook.addWorksheet('条目数据')

  // Add header row
  worksheet.addRow(['类型', '标题', '内容(父条目为空)', '章节顺序(可选)'])

  // Add example rows showing all entry types
  // Standalone entry (普通条目) - independent article
  worksheet.addRow(['普通条目', '独立文章一', '<p>这是一篇独立的文章内容，不需要分节。</p>', 0])
  worksheet.addRow(['普通条目', '独立文章二', '<p>这是另一篇独立的文章内容。</p>', 1])

  // Parent entry (父条目) - can have children
  worksheet.addRow(['父条目', '第一章 总则', '', 2])
  // Child entries (子条目) - children of the parent above
  worksheet.addRow(['子条目', '第一条 基本规定', '<p>这是第一条的具体内容。</p>', 1])
  worksheet.addRow(['子条目', '第二条 适用范围', '<p>这是第二条的具体内容。</p>', 2])
  worksheet.addRow(['子条目', '第三条 基本原则', '<p>这是第三条的具体内容。</p>', 3])

  // Another standalone entry
  worksheet.addRow(['普通条目', '独立文章三', '<p>这是第三篇独立的文章内容。</p>', 3])

  // Another parent entry
  worksheet.addRow(['父条目', '第二章 分则', '', 4])
  // Child entries of the second parent
  worksheet.addRow(['子条目', '第一条 具体规定', '<p>这是第二章第一条的内容。</p>', 1])
  worksheet.addRow(['子条目', '第二条 实施细则', '<p>这是第二章第二条的内容。</p>', 2])

  // Set column widths
  worksheet.getColumn(1).width = 15 // 类型
  worksheet.getColumn(2).width = 30 // 标题
  worksheet.getColumn(3).width = 50 // 内容
  worksheet.getColumn(4).width = 15 // 章节顺序

  // Add data validation for type column (普通条目/父条目/子条目)
  const typeListString = '"普通条目,父条目,子条目"'
  for (let row = 2; row <= 1000; row++) {
    worksheet.getCell(`A${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [typeListString],
      showInputMessage: true,
      promptTitle: '选择类型',
      prompt:
        '请选择：普通条目（独立文章，有内容）| 父条目（无内容，可以有子条目）| 子条目（有内容，属于某个父条目）',
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: '无效的类型',
      error: '请从下拉列表中选择"普通条目"、"父条目"或"子条目"'
    }
  }

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFABB8C3' }
  }
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  // Generate Excel file and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `entries-template-${categoryName}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate entries import Excel template with category dropdown
 */
export async function generateEntriesTemplate(categories: Category[]): Promise<void> {
  const workbook = new ExcelJS.Workbook()

  // Create category reference sheet
  const categorySheet = workbook.addWorksheet('类别参考')
  categorySheet.addRow(['类别ID', '类别名称'])
  categories.forEach((c) => {
    categorySheet.addRow([c.id, c.name])
  })
  categorySheet.getColumn(1).width = 30 // 类别ID
  categorySheet.getColumn(2).width = 25 // 类别名称

  // Main data sheet
  const worksheet = workbook.addWorksheet('条目数据')

  // Add header row
  worksheet.addRow(['类别（下拉选择）', '标题', '内容', '父条目ID（可选）', '章节顺序（可选）'])

  // Add example rows
  worksheet.addRow([
    categories[0]?.name || '请选择类别',
    '示例条目标题1',
    '<p>这是示例条目的内容。支持HTML格式。</p>',
    '',
    '0'
  ])
  worksheet.addRow([
    categories[0]?.name || '请选择类别',
    '示例条目标题2',
    '<p>这是另一个示例条目的内容。</p>',
    '',
    '1'
  ])
  worksheet.addRow([
    categories[0]?.name || '请选择类别',
    '示例子条目',
    '<p>这是父条目下的子条目内容。</p>',
    'parent-entry-id',
    '1'
  ])

  // Set column widths
  worksheet.getColumn(1).width = 25 // 类别
  worksheet.getColumn(2).width = 30 // 标题
  worksheet.getColumn(3).width = 50 // 内容
  worksheet.getColumn(4).width = 20 // 父条目ID
  worksheet.getColumn(5).width = 15 // 章节顺序

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFABB8C3' }
  }
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  const categoryNames = categories.map((c) => c.name)

  for (let row = 2; row <= 1000; row++) {
    const cell = worksheet.getCell(`A${row}`)
    cell.value = 'Dropdown'
    cell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [...categoryNames],
      showInputMessage: true,
      promptTitle: '选择类别',
      prompt: '请从下拉列表中选择一个类别',
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: '无效的类别',
      error: '请从下拉列表中选择一个有效的类别'
    }
  }

  // Generate Excel file and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'entries-template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate questions import Excel template
 */
export async function generateQuestionsTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('题目数据')

  // Add header row
  // 题型：单选题 或 多选题
  // 选项类型：对错题 或 选项题
  // 对错题：正确答案为 0（正确）或 1（错误），选项A/B/C/D可为空
  // 选项题：正确答案为 0-3（对应A/B/C/D），选项A/B/C/D必须填写
  // 单选题：正确答案填写单个数字，如 0 或 1
  // 多选题：正确答案填写多个数字，用逗号分隔，如 0,1,2 或 0、1、2
  worksheet.addRow([
    '题目',
    '题型（单选题/多选题）',
    '选项类型（对错题/选项题）',
    '选项A',
    '选项B',
    '选项C',
    '选项D',
    '正确答案'
  ])

  // Add example rows - 单选题示例
  worksheet.addRow([
    '示例题目（单选题-选项题）：这是第一道题？',
    '单选题',
    '选项题',
    '选项A内容',
    '选项B内容',
    '选项C内容',
    '选项D内容',
    '0'
  ])
  worksheet.addRow([
    '示例题目（单选题-对错题）：这是第二道题？',
    '单选题',
    '对错题',
    '正确',
    '错误',
    '',
    '',
    '0'
  ])

  // Add example rows - 多选题示例（多选题只支持选项题）
  worksheet.addRow([
    '示例题目（多选题-选项题）：这是第三道题？',
    '多选题',
    '选项题',
    '选项A内容',
    '选项B内容',
    '选项C内容',
    '选项D内容',
    '0,1,2'
  ])
  worksheet.addRow([
    '示例题目（多选题-选项题）：这是第四道题？',
    '多选题',
    '选项题',
    '选项A内容',
    '选项B内容',
    '选项C内容',
    '选项D内容',
    '1,3'
  ])

  // Set column widths
  worksheet.getColumn(1).width = 40 // 题目
  worksheet.getColumn(2).width = 18 // 题型
  worksheet.getColumn(3).width = 20 // 选项类型
  worksheet.getColumn(4).width = 25 // 选项A
  worksheet.getColumn(5).width = 25 // 选项B
  worksheet.getColumn(6).width = 25 // 选项C
  worksheet.getColumn(7).width = 25 // 选项D
  worksheet.getColumn(8).width = 20 // 正确答案

  // Add data validation for question type column
  const questionTypeListString = '"单选题,多选题"'
  for (let row = 2; row <= 1000; row++) {
    worksheet.getCell(`B${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [questionTypeListString],
      showInputMessage: true,
      promptTitle: '选择题型',
      prompt:
        '请选择：单选题（正确答案填写单个数字）| 多选题（正确答案填写多个数字，用逗号分隔，如 0,1,2）',
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: '无效的题型',
      error: '请从下拉列表中选择"单选题"或"多选题"'
    }
  }

  // Add data validation for option type column
  const optionTypeListString = '"对错题,选项题"'
  for (let row = 2; row <= 1000; row++) {
    worksheet.getCell(`C${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [optionTypeListString],
      showInputMessage: true,
      promptTitle: '选择选项类型',
      prompt: '请选择：对错题（正确答案为0或1）| 选项题（正确答案为0-3，对应A/B/C/D）',
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: '无效的选项类型',
      error: '请从下拉列表中选择"对错题"或"选项题"'
    }
  }

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE9E9E9' }
  }
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  // Generate Excel file and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'questions-template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parsed entry with parent row index (to be resolved during import)
 */
export interface ParsedEntryWithParent {
  title: string
  content: string
  chapterOrder: number
  parentRowIndex: number | null // Index of parent entry in the parsed array, null if top-level
}

/**
 * Parse Excel file to entries array for a single category
 * Format: 层级(0=顶级), 类型(父条目/子条目), 标题, 内容(父条目为空), 章节顺序(可选)
 * Builds parent-child relationships based on hierarchy level and row order
 * Returns entries with parentRowIndex that will be resolved during import
 */
export function parseEntriesFromExcelForCategory(
  file: File,
  _categoryId: string
): Promise<ParsedEntryWithParent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(data)

        // Find the main data sheet
        const worksheet = workbook.getWorksheet('条目数据') || workbook.worksheets[0]

        if (!worksheet) {
          reject(new Error('Excel文件中找不到工作表'))
          return
        }

        // Parse all rows
        interface ParsedRow {
          type: '普通条目' | '父条目' | '子条目'
          title: string
          content: string
          chapterOrder: number
          rowNumber: number
        }

        const parsedRows: ParsedRow[] = []

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // Skip header row

          const type = String(row.getCell(1).value || '').trim() as '普通条目' | '父条目' | '子条目'
          const title = String(row.getCell(2).value || '').trim()
          const content = String(row.getCell(3).value || '').trim()
          const chapterOrder = row.getCell(4).value ? Number(row.getCell(4).value) || 0 : 0

          if (!title) return // Skip empty rows

          // Validate type
          if (type !== '普通条目' && type !== '父条目' && type !== '子条目') {
            reject(new Error(`第 ${rowNumber} 行：类型必须是"普通条目"、"父条目"或"子条目"`))
            return
          }

          // Validate: parent entries should have empty content
          if (type === '父条目' && content) {
            reject(
              new Error(
                `第 ${rowNumber} 行：父条目的内容应该为空，但发现内容"${content.substring(0, 20)}..."`
              )
            )
            return
          }

          // Validate: normal entries and child entries should have content
          if ((type === '普通条目' || type === '子条目') && !content) {
            reject(
              new Error(
                `第 ${rowNumber} 行：${type === '普通条目' ? '普通条目' : '子条目'}必须有内容`
              )
            )
            return
          }

          parsedRows.push({
            type,
            title,
            content: type === '父条目' ? '' : content || '<p></p>',
            chapterOrder,
            rowNumber
          })
        })

        // Build parent-child relationships
        // - 普通条目: No parent, has content (standalone article)
        // - 父条目: No parent, no content, can have children
        // - 子条目: Has parent (most recent parent above), has content
        let currentParentRowIndex: number | null = null
        const result: ParsedEntryWithParent[] = []

        for (let i = 0; i < parsedRows.length; i++) {
          const row = parsedRows[i]

          if (row.type === '普通条目') {
            // Standalone entry - no parent, has content
            currentParentRowIndex = null // Reset parent (standalone entries don't affect parent chain)
            result.push({
              title: row.title,
              content: row.content,
              chapterOrder: row.chapterOrder,
              parentRowIndex: null
            })
          } else if (row.type === '父条目') {
            // Parent entry - update current parent, no parent itself
            currentParentRowIndex = i
            result.push({
              title: row.title,
              content: row.content,
              chapterOrder: row.chapterOrder,
              parentRowIndex: null
            })
          } else {
            // Child entry - belongs to current parent
            if (currentParentRowIndex === null) {
              reject(
                new Error(
                  `第 ${row.rowNumber} 行：子条目"${row.title}"之前没有父条目，请确保子条目前面有父条目`
                )
              )
              return
            }
            result.push({
              title: row.title,
              content: row.content,
              chapterOrder: row.chapterOrder,
              parentRowIndex: currentParentRowIndex
            })
          }
        }

        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse Excel file to entries array with category mapping
 */
export function parseEntriesFromExcel(
  file: File,
  categories: Category[]
): Promise<
  Array<{ categoryId: string; entry: Omit<Entry, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'> }>
> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(data)

        // Find the main data sheet
        const worksheet = workbook.getWorksheet('条目数据') || workbook.worksheets[0]

        if (!worksheet) {
          reject(new Error('Excel文件中找不到工作表'))
          return
        }

        // Create category name to ID mapping
        const categoryMap = new Map<string, string>()
        categories.forEach((c) => {
          categoryMap.set(c.name, c.id)
        })

        const result: Array<{
          categoryId: string
          entry: Omit<Entry, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>
        }> = []

        // Read rows starting from row 2 (skip header)
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // Skip header row

          const categoryName = String(row.getCell(1).value || '').trim()
          const title = String(row.getCell(2).value || '').trim()
          const content = String(row.getCell(3).value || '').trim()
          const parentEntryId = row.getCell(4).value
            ? String(row.getCell(4).value).trim() || null
            : null
          const chapterOrder = row.getCell(5).value ? Number(row.getCell(5).value) || 0 : 0

          if (!categoryName || !title) return // Skip empty rows

          // Find category ID by name
          const categoryId = categoryMap.get(categoryName)
          if (!categoryId) {
            reject(new Error(`第 ${rowNumber} 行：找不到类别"${categoryName}"，请确保类别名称正确`))
            return
          }

          result.push({
            categoryId,
            entry: {
              title,
              content: content || '<p></p>',
              parentEntryId,
              chapterOrder
            }
          })
        })

        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse Excel file to questions array
 */
/**
 * Validation result for question Excel file
 */
export interface QuestionValidationResult {
  isValid: boolean
  errors: Array<{
    row: number
    message: string
  }>
  warnings: Array<{
    row: number
    message: string
  }>
}

/**
 * Validate Excel file format against template
 * Checks header row and data structure
 */
export async function validateQuestionsExcelFormat(file: File): Promise<QuestionValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const errors: Array<{ row: number; message: string }> = []
      const warnings: Array<{ row: number; message: string }> = []

      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(data)

        const worksheet = workbook.worksheets[0]

        if (!worksheet) {
          errors.push({ row: 0, message: 'Excel文件中找不到工作表' })
          resolve({ isValid: false, errors, warnings })
          return
        }

        // Check header row - support multiple formats
        const headerRow = worksheet.getRow(1)
        const expectedHeadersNew = [
          '题目',
          '题型（单选题/多选题）',
          '选项类型（对错题/选项题）',
          '选项A',
          '选项B',
          '选项C',
          '选项D',
          '正确答案'
        ]
        const expectedHeadersOld7 = [
          '题目',
          '选项类型（对错题/选项题）',
          '选项A',
          '选项B',
          '选项C',
          '选项D',
          '正确答案'
        ]
        const expectedHeadersOld6 = ['题目', '选项A', '选项B', '选项C', '选项D', '正确答案（0-3）']
        const actualHeaders: string[] = []

        // Read all header cells (up to 10 columns)
        for (let col = 1; col <= 10; col++) {
          const cellValue = String(headerRow.getCell(col).value || '').trim()
          actualHeaders.push(cellValue)
        }

        // Determine format by checking column content
        const col2Value = actualHeaders[1] || ''
        let expectedHeaders: string[] = []

        if (col2Value.includes('题型') || col2Value === '题型（单选题/多选题）') {
          // Newest format (8 columns with question type)
          expectedHeaders = expectedHeadersNew
        } else if (col2Value.includes('选项类型') || col2Value === '选项类型（对错题/选项题）') {
          // Old format (7 columns without question type)
          expectedHeaders = expectedHeadersOld7
        } else if (col2Value === '选项A') {
          // Oldest format (6 columns)
          expectedHeaders = expectedHeadersOld6
        } else {
          // Cannot determine format - check if it looks like entry management template
          if (
            actualHeaders[0]?.includes('类型') ||
            actualHeaders[1]?.includes('标题') ||
            actualHeaders[2]?.includes('内容') ||
            actualHeaders[3]?.includes('章节')
          ) {
            errors.push({
              row: 1,
              message:
                '检测到这是条目管理的模板文件，请使用题目管理的模板文件。请点击"下载模板"按钮下载正确的模板。'
            })
          } else {
            errors.push({
              row: 1,
              message: `无法识别文件格式。第2列应为"题型（单选题/多选题）"（最新格式）、"选项类型（对错题/选项题）"（旧格式）或"选项A"（最旧格式），实际为"${col2Value || '(空)'}"。请使用正确的题目管理模板文件。`
            })
          }
          resolve({ isValid: false, errors, warnings })
          return
        }

        // Validate header row
        let headerValid = true
        for (let i = 0; i < expectedHeaders.length; i++) {
          const expected = expectedHeaders[i]
          const actual = actualHeaders[i] || ''
          if (actual !== expected) {
            errors.push({
              row: 1,
              message: `第 ${i + 1} 列标题应为"${expected}"，实际为"${actual || '(空)'}"`
            })
            headerValid = false
          }
        }

        // Check for extra columns (warn but don't fail)
        if (actualHeaders.length > expectedHeaders.length) {
          const extraColumns = actualHeaders.slice(expectedHeaders.length).filter((h) => h)
          if (extraColumns.length > 0) {
            warnings.push({
              row: 1,
              message: `检测到额外的列（${extraColumns.join(', ')}），这些列将被忽略`
            })
          }
        }

        if (!headerValid) {
          resolve({ isValid: false, errors, warnings })
          return
        }

        // Validate data rows
        let hasData = false
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // Skip header row

          const text = String(row.getCell(1).value || '').trim()
          let questionType: '单选题' | '多选题' | '' = ''
          let optionType: '对错题' | '选项题' | '' = ''
          let optionA = ''
          let optionB = ''
          let optionC = ''
          let optionD = ''
          let correctAnswerCell

          // Determine column positions based on format
          if (expectedHeaders.length === 8) {
            // Newest format (8 columns): 题目, 题型, 选项类型, 选项A, 选项B, 选项C, 选项D, 正确答案
            questionType = String(row.getCell(2).value || '').trim() as '单选题' | '多选题' | ''
            optionType = String(row.getCell(3).value || '').trim() as '对错题' | '选项题' | ''
            optionA = String(row.getCell(4).value || '').trim()
            optionB = String(row.getCell(5).value || '').trim()
            optionC = String(row.getCell(6).value || '').trim()
            optionD = String(row.getCell(7).value || '').trim()
            correctAnswerCell = row.getCell(8)
          } else if (expectedHeaders.length === 7) {
            // Old format (7 columns): 题目, 选项类型, 选项A, 选项B, 选项C, 选项D, 正确答案
            questionType = '单选题' // Default to 单选题 for old format
            optionType = String(row.getCell(2).value || '').trim() as '对错题' | '选项题' | ''
            optionA = String(row.getCell(3).value || '').trim()
            optionB = String(row.getCell(4).value || '').trim()
            optionC = String(row.getCell(5).value || '').trim()
            optionD = String(row.getCell(6).value || '').trim()
            correctAnswerCell = row.getCell(7)
          } else {
            // Oldest format (6 columns): 题目, 选项A, 选项B, 选项C, 选项D, 正确答案
            questionType = '单选题' // Default to 单选题 for oldest format
            optionType = '选项题' // Default to 选项题 for oldest format
            optionA = String(row.getCell(2).value || '').trim()
            optionB = String(row.getCell(3).value || '').trim()
            optionC = String(row.getCell(4).value || '').trim()
            optionD = String(row.getCell(5).value || '').trim()
            correctAnswerCell = row.getCell(6)
          }

          // Get correct answer value - handle both string and number types
          // IMPORTANT: Preserve the original value type to detect comma-separated values
          let correctAnswerValue: string | number = ''
          const cellValue = correctAnswerCell.value
          if (cellValue !== null && cellValue !== undefined) {
            // For Excel cells, if the value is already a string with commas, preserve it
            // If it's a number, convert to string
            if (typeof cellValue === 'string') {
              correctAnswerValue = cellValue.trim()
            } else {
              // Convert to string to handle comma-separated values
              correctAnswerValue = String(cellValue).trim()
            }
          }

          // Skip completely empty rows
          if (
            !text &&
            !optionA &&
            !optionB &&
            !optionC &&
            !optionD &&
            !correctAnswerValue &&
            !optionType
          ) {
            return
          }

          hasData = true

          // Validate question text
          if (!text || text.trim() === '') {
            errors.push({ row: rowNumber, message: '题目内容不能为空' })
          }

          // Validate question type (for newest format)
          if (expectedHeaders.length === 8) {
            // Normalize questionType - handle potential whitespace or case issues
            const normalizedQuestionType = questionType.trim()
            if (
              !normalizedQuestionType ||
              (normalizedQuestionType !== '单选题' && normalizedQuestionType !== '多选题')
            ) {
              // If questionType is invalid but answer contains comma, it's likely a multiple choice
              const correctAnswerStr = String(correctAnswerValue || '').trim()
              const hasComma = /[,，、]/.test(correctAnswerStr)
              if (hasComma) {
                // Auto-detect as multiple choice if answer contains comma
                questionType = '多选题'
                errors.push({
                  row: rowNumber,
                  message: `题型列应为"多选题"（检测到答案包含多个数字），当前为"${questionType || '(空)'}"，已自动识别为多选题`
                })
              } else {
                errors.push({
                  row: rowNumber,
                  message: `题型必须为"单选题"或"多选题"，当前为"${questionType || '(空)'}"`
                })
              }
            } else {
              // Update questionType to normalized value
              questionType = normalizedQuestionType as '单选题' | '多选题'
            }
          }

          // Validate option type (for formats with option type column)
          if (expectedHeaders.length >= 7) {
            if (!optionType || (optionType !== '对错题' && optionType !== '选项题')) {
              errors.push({
                row: rowNumber,
                message: `选项类型必须为"对错题"或"选项题"，当前为"${optionType || '(空)'}"`
              })
            }
          }

          // Validate: 多选题只能选择选项题，不能选择对错题
          if (questionType === '多选题' && optionType === '对错题') {
            errors.push({
              row: rowNumber,
              message:
                '多选题不支持对错题，只能选择选项题。对错题只有两个选项（正确/错误），只能是单选题。'
            })
          }

          // Validate options based on option type
          if (optionType === '对错题') {
            // For true-false questions, optionA and optionB are recommended but can be auto-filled
            // OptionC and optionD should be empty
            if (optionC && optionC.trim() !== '') {
              warnings.push({
                row: rowNumber,
                message: '对错题的选项C应为空（系统会自动忽略）'
              })
            }
            if (optionD && optionD.trim() !== '') {
              warnings.push({
                row: rowNumber,
                message: '对错题的选项D应为空（系统会自动忽略）'
              })
            }
            // Validate correct answer for true-false
            const isMultiple = questionType === '多选题'
            if (
              correctAnswerValue === null ||
              correctAnswerValue === undefined ||
              correctAnswerValue === ''
            ) {
              errors.push({ row: rowNumber, message: '正确答案不能为空' })
            } else {
              const correctAnswerStr = String(correctAnswerValue).trim()
              if (isMultiple) {
                // Multiple choice: parse comma-separated numbers
                const numbers = correctAnswerStr
                  .split(/[,，、]/)
                  .map((s) => s.trim())
                  .filter((s) => s)
                  .map((s) => Number(s))

                if (numbers.length === 0) {
                  errors.push({
                    row: rowNumber,
                    message: `多选题的正确答案必须填写多个数字，用逗号分隔（如：0,1），当前为"${correctAnswerStr}"`
                  })
                } else {
                  const invalidNumbers = numbers.filter((n) => isNaN(n) || ![0, 1].includes(n))
                  if (invalidNumbers.length > 0) {
                    errors.push({
                      row: rowNumber,
                      message: `对错题的正确答案必须为 0（正确）或 1（错误），当前包含无效数字：${invalidNumbers.join(', ')}`
                    })
                  }
                  if (new Set(numbers).size !== numbers.length) {
                    errors.push({
                      row: rowNumber,
                      message: `多选题的正确答案不能有重复数字，当前为"${correctAnswerStr}"`
                    })
                  }
                }
              } else {
                // Single choice: must be a single number
                const correctAnswer = Number(correctAnswerStr)
                if (isNaN(correctAnswer)) {
                  errors.push({
                    row: rowNumber,
                    message: `单选题的正确答案必须是单个数字，当前为"${correctAnswerStr}"。如果是多选题，请在"题型"列选择"多选题"`
                  })
                } else if (![0, 1].includes(correctAnswer)) {
                  errors.push({
                    row: rowNumber,
                    message: `对错题的正确答案必须是 0（正确）或 1（错误），当前为 ${correctAnswer}`
                  })
                }
              }
            }
          } else {
            // For letter-options questions, all options must be filled
            if (!optionA || optionA.trim() === '') {
              errors.push({ row: rowNumber, message: '选项A不能为空' })
            }
            if (!optionB || optionB.trim() === '') {
              errors.push({ row: rowNumber, message: '选项B不能为空' })
            }
            if (!optionC || optionC.trim() === '') {
              errors.push({ row: rowNumber, message: '选项C不能为空' })
            }
            if (!optionD || optionD.trim() === '') {
              errors.push({ row: rowNumber, message: '选项D不能为空' })
            }
            // Validate correct answer for letter-options
            console.log(
              `[Validate Row ${rowNumber}] Starting validation for letter-options question`
            )
            console.log(
              `[Validate Row ${rowNumber}] correctAnswerValue (raw):`,
              correctAnswerValue,
              `(type: ${typeof correctAnswerValue})`
            )
            console.log(`[Validate Row ${rowNumber}] questionType:`, questionType)
            console.log(`[Validate Row ${rowNumber}] optionType:`, optionType)

            if (!correctAnswerValue || correctAnswerValue === '') {
              console.log(`[Validate Row ${rowNumber}] ERROR: correctAnswerValue is empty`)
              errors.push({ row: rowNumber, message: '正确答案不能为空' })
            } else {
              // Ensure correctAnswerValue is a string for processing
              // Handle all possible types from Excel (string, number, formula result, etc.)
              let correctAnswerStr = ''
              if (typeof correctAnswerValue === 'string') {
                correctAnswerStr = correctAnswerValue.trim()
              } else if (typeof correctAnswerValue === 'number') {
                correctAnswerStr = String(correctAnswerValue).trim()
              } else {
                // Handle other types (formula results, etc.)
                correctAnswerStr = String(correctAnswerValue || '').trim()
              }

              console.log(
                `[Validate Row ${rowNumber}] correctAnswerStr (processed):`,
                correctAnswerStr,
                `(length: ${correctAnswerStr.length})`
              )

              // Check if the answer contains comma-separated values (indicating multiple choice)
              // Support both English comma, Chinese comma, and顿号
              const hasComma = /[,，、]/.test(correctAnswerStr)
              console.log(`[Validate Row ${rowNumber}] hasComma:`, hasComma)

              // Determine if this is a multiple choice question
              // Auto-detect multiple choice if answer contains comma, even if questionType is not set correctly
              const isMultiple = questionType === '多选题' || hasComma
              console.log(
                `[Validate Row ${rowNumber}] isMultiple:`,
                isMultiple,
                `(questionType === '多选题': ${questionType === '多选题'}, hasComma: ${hasComma})`
              )

              // If it's marked as multiple choice OR contains comma-separated values, treat as multiple
              if (isMultiple) {
                console.log(`[Validate Row ${rowNumber}] Processing as MULTIPLE choice question`)
                // Multiple choice: parse comma-separated numbers
                const numbers = correctAnswerStr
                  .split(/[,，、]/)
                  .map((s) => s.trim())
                  .filter((s) => s)
                  .map((s) => Number(s))
                  .filter((n) => !isNaN(n))

                console.log(
                  `[Validate Row ${rowNumber}] Parsed numbers:`,
                  numbers,
                  `(length: ${numbers.length})`
                )

                if (numbers.length === 0) {
                  console.log(`[Validate Row ${rowNumber}] ERROR: No valid numbers parsed`)
                  errors.push({
                    row: rowNumber,
                    message: `多选题的正确答案必须填写多个数字，用逗号分隔（如：0,1,2），当前为"${correctAnswerStr}"`
                  })
                } else if (numbers.length === 1 && questionType === '多选题') {
                  // Multiple choice question but only one answer provided
                  console.log(
                    `[Validate Row ${rowNumber}] ERROR: Multiple choice but only one number`
                  )
                  errors.push({
                    row: rowNumber,
                    message: `多选题的正确答案必须填写多个数字，用逗号分隔（如：0,1,2），当前只填写了一个数字：${numbers[0]}`
                  })
                } else {
                  console.log(
                    `[Validate Row ${rowNumber}] Validating ${numbers.length} numbers against range [0, 1, 2, 3]`
                  )
                  // Validate each number is in range 0-3
                  const invalidNumbers = numbers.filter((n) => {
                    const isValid = [0, 1, 2, 3].includes(n)
                    console.log(
                      `[Validate Row ${rowNumber}] Number ${n} (type: ${typeof n}): isValid=${isValid}`
                    )
                    return !isValid
                  })
                  if (invalidNumbers.length > 0) {
                    console.log(
                      `[Validate Row ${rowNumber}] ERROR: Found invalid numbers:`,
                      invalidNumbers
                    )
                    errors.push({
                      row: rowNumber,
                      message: `选项题的正确答案必须为 0、1、2 或 3（对应A/B/C/D），当前包含无效数字：${invalidNumbers.join(', ')}。原始答案："${correctAnswerStr}"，解析后的数字：[${numbers.join(', ')}]`
                    })
                  } else {
                    console.log(`[Validate Row ${rowNumber}] All numbers are valid`)
                  }
                  // Check for duplicates
                  if (new Set(numbers).size !== numbers.length) {
                    console.log(`[Validate Row ${rowNumber}] ERROR: Duplicate numbers found`)
                    errors.push({
                      row: rowNumber,
                      message: `多选题的正确答案不能有重复数字，当前为"${correctAnswerStr}"`
                    })
                  }
                }
              } else {
                console.log(`[Validate Row ${rowNumber}] Processing as SINGLE choice question`)
                // Single choice: must be a single number
                const correctAnswer = Number(correctAnswerStr)
                console.log(
                  `[Validate Row ${rowNumber}] Parsed single answer:`,
                  correctAnswer,
                  `(isNaN: ${isNaN(correctAnswer)})`
                )
                if (isNaN(correctAnswer)) {
                  console.log(`[Validate Row ${rowNumber}] ERROR: Cannot parse as number`)
                  errors.push({
                    row: rowNumber,
                    message: `单选题的正确答案必须是单个数字，当前为"${correctAnswerStr}"。如果是多选题，请在"题型"列选择"多选题"，并在"正确答案"列填写多个数字，用逗号分隔（如：0,1,2）`
                  })
                } else if (![0, 1, 2, 3].includes(correctAnswer)) {
                  console.log(
                    `[Validate Row ${rowNumber}] ERROR: Number ${correctAnswer} not in range [0, 1, 2, 3]`
                  )
                  errors.push({
                    row: rowNumber,
                    message: `选项题的正确答案必须是 0、1、2 或 3（对应A/B/C/D），当前为 ${correctAnswer}`
                  })
                } else {
                  console.log(`[Validate Row ${rowNumber}] Single answer is valid`)
                }
              }
            }
            console.log(
              `[Validate Row ${rowNumber}] Validation complete. Errors count: ${errors.filter((e) => e.row === rowNumber).length}`
            )
          }

          // Warnings for potential issues
          if (text && text.length > 200) {
            warnings.push({ row: rowNumber, message: '题目内容较长，建议控制在200字以内' })
          }
          if (optionA && optionA.length > 100) {
            warnings.push({ row: rowNumber, message: '选项A内容较长，建议控制在100字以内' })
          }
        })

        if (!hasData) {
          errors.push({ row: 0, message: '文件中没有有效的题目数据（除表头外）' })
        }

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        errors.push({ row: 0, message: `验证文件时出错：${errorMessage}` })
        resolve({ isValid: false, errors, warnings })
      }
    }
    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: [{ row: 0, message: '读取文件失败，请确保文件格式正确' }],
        warnings: []
      })
    }
    reader.readAsArrayBuffer(file)
  })
}

export function parseQuestionsFromExcel(
  file: File
): Promise<Array<Omit<import('../types/question').Question, 'id' | 'createdAt' | 'updatedAt'>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(data)

        const worksheet = workbook.worksheets[0]

        if (!worksheet) {
          reject(new Error('Excel文件中找不到工作表'))
          return
        }

        const questions: Array<
          Omit<import('../types/question').Question, 'id' | 'createdAt' | 'updatedAt'>
        > = []

        // Detect format by checking header row
        const headerRow = worksheet.getRow(1)
        const headerCol2 = String(headerRow.getCell(2).value || '').trim()
        const headerCol3 = String(headerRow.getCell(3).value || '').trim()
        const hasQuestionType =
          headerCol2.includes('题型') || headerCol2 === '题型（单选题/多选题）'
        const hasOptionType = headerCol2.includes('选项类型') || headerCol3.includes('选项类型')

        // Read rows starting from row 2 (skip header)
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // Skip header row

          const text = String(row.getCell(1).value || '').trim()
          let questionType: '单选题' | '多选题' = '单选题'
          let optionType: '对错题' | '选项题' = '选项题'
          let optionA = ''
          let optionB = ''
          let optionC = ''
          let optionD = ''
          let correctAnswerValue: string | number = ''

          // Determine column positions based on format
          if (hasQuestionType) {
            // Newest format (8 columns): 题目, 题型, 选项类型, 选项A, 选项B, 选项C, 选项D, 正确答案
            questionType =
              (String(row.getCell(2).value || '').trim() as '单选题' | '多选题') || '单选题'
            optionType =
              (String(row.getCell(3).value || '').trim() as '对错题' | '选项题') || '选项题'
            optionA = String(row.getCell(4).value || '').trim()
            optionB = String(row.getCell(5).value || '').trim()
            optionC = String(row.getCell(6).value || '').trim()
            optionD = String(row.getCell(7).value || '').trim()
            const cellValue8 = row.getCell(8).value
            correctAnswerValue =
              cellValue8 !== null && cellValue8 !== undefined ? String(cellValue8) : ''
          } else if (hasOptionType) {
            // Old format (7 columns): 题目, 选项类型, 选项A, 选项B, 选项C, 选项D, 正确答案
            questionType = '单选题' // Default to 单选题
            optionType =
              (String(row.getCell(2).value || '').trim() as '对错题' | '选项题') || '选项题'
            optionA = String(row.getCell(3).value || '').trim()
            optionB = String(row.getCell(4).value || '').trim()
            optionC = String(row.getCell(5).value || '').trim()
            optionD = String(row.getCell(6).value || '').trim()
            const cellValue7 = row.getCell(7).value
            correctAnswerValue =
              cellValue7 !== null && cellValue7 !== undefined ? String(cellValue7) : ''
          } else {
            // Oldest format (6 columns): 题目, 选项A, 选项B, 选项C, 选项D, 正确答案
            questionType = '单选题' // Default to 单选题
            optionType = '选项题' // Default to 选项题
            optionA = String(row.getCell(2).value || '').trim()
            optionB = String(row.getCell(3).value || '').trim()
            optionC = String(row.getCell(4).value || '').trim()
            optionD = String(row.getCell(5).value || '').trim()
            const cellValue6 = row.getCell(6).value
            correctAnswerValue =
              cellValue6 !== null && cellValue6 !== undefined ? String(cellValue6) : ''
          }

          if (!text) return // Skip empty rows

          // Validate: 多选题只能选择选项题，不能选择对错题
          if (questionType === '多选题' && optionType === '对错题') {
            throw new Error(
              `第 ${rowNumber} 行：多选题不支持对错题，只能选择选项题。对错题只有两个选项（正确/错误），只能是单选题。`
            )
          }

          // Parse correct answer
          console.log(`[Parse Row ${rowNumber}] Starting parse for correct answer`)
          console.log(
            `[Parse Row ${rowNumber}] correctAnswerValue (raw):`,
            correctAnswerValue,
            `(type: ${typeof correctAnswerValue})`
          )
          console.log(`[Parse Row ${rowNumber}] questionType:`, questionType)
          console.log(`[Parse Row ${rowNumber}] optionType:`, optionType)

          let correctAnswer: number | number[]
          const correctAnswerStr = String(correctAnswerValue).trim()
          console.log(
            `[Parse Row ${rowNumber}] correctAnswerStr (processed):`,
            correctAnswerStr,
            `(length: ${correctAnswerStr.length})`
          )

          // Check if the answer contains comma-separated values (indicating multiple choice)
          // Support both English comma, Chinese comma, and顿号
          const hasComma = /[,，、]/.test(correctAnswerStr)
          console.log(`[Parse Row ${rowNumber}] hasComma:`, hasComma)

          // Auto-detect multiple choice if answer contains comma, even if questionType is not set correctly
          const isMultiple = questionType === '多选题' || hasComma
          console.log(
            `[Parse Row ${rowNumber}] isMultiple:`,
            isMultiple,
            `(questionType === '多选题': ${questionType === '多选题'}, hasComma: ${hasComma})`
          )

          if (isMultiple) {
            console.log(`[Parse Row ${rowNumber}] Processing as MULTIPLE choice`)
            // Multiple choice: parse comma-separated numbers (support both , and 、)
            const numbers = correctAnswerStr
              .split(/[,，、]/)
              .map((s) => s.trim())
              .filter((s) => s)
              .map((s) => Number(s))
              .filter((n) => !isNaN(n) && [0, 1, 2, 3].includes(n))

            console.log(
              `[Parse Row ${rowNumber}] Parsed numbers (after filter):`,
              numbers,
              `(length: ${numbers.length})`
            )

            if (numbers.length === 0) {
              console.log(`[Parse Row ${rowNumber}] ERROR: No valid numbers after parsing`)
              throw new Error(
                `第 ${rowNumber} 行：多选题的正确答案必须填写多个数字，用逗号分隔（如：0,1,2），当前为"${correctAnswerStr}"`
              )
            }

            // Remove duplicates and sort
            correctAnswer = [...new Set(numbers)].sort()
            console.log(`[Parse Row ${rowNumber}] Final correctAnswer (multiple):`, correctAnswer)

            // Update questionType if it was auto-detected
            if (hasComma && questionType !== '多选题') {
              console.log(`[Parse Row ${rowNumber}] Auto-updating questionType to '多选题'`)
              questionType = '多选题'
            }
          } else {
            console.log(`[Parse Row ${rowNumber}] Processing as SINGLE choice`)
            // Single choice: must be a single number
            const num = Number(correctAnswerStr)
            console.log(`[Parse Row ${rowNumber}] Parsed number:`, num, `(isNaN: ${isNaN(num)})`)
            if (isNaN(num)) {
              console.log(`[Parse Row ${rowNumber}] ERROR: Cannot parse as number`)
              throw new Error(
                `第 ${rowNumber} 行：单选题的正确答案必须是单个数字，当前为"${correctAnswerStr}"`
              )
            }
            correctAnswer = num
            console.log(`[Parse Row ${rowNumber}] Final correctAnswer (single):`, correctAnswer)
          }

          // Process based on option type
          if (optionType === '对错题') {
            // True-false questions: always use ['正确', '错误']
            // Note: 对错题只能是单选题（已在上面验证）
            if (![0, 1].includes(correctAnswer as number)) {
              throw new Error(`第 ${rowNumber} 行：对错题的正确答案必须是 0（正确）或 1（错误）`)
            }

            questions.push({
              text,
              questionType: 'single' as const,
              optionType: 'true-false' as const,
              options: ['正确', '错误'],
              correctAnswer
            })
          } else {
            // Letter-options questions: use provided options
            console.log(`[Parse Row ${rowNumber}] Processing letter-options question`)
            console.log(
              `[Parse Row ${rowNumber}] Options: A="${optionA}", B="${optionB}", C="${optionC}", D="${optionD}"`
            )

            // Validate all options are filled
            if (!optionA || !optionB || !optionC || !optionD) {
              console.log(`[Parse Row ${rowNumber}] ERROR: Some options are empty`)
              throw new Error(`第 ${rowNumber} 行：选项题的所有选项（A/B/C/D）都不能为空`)
            }

            // Validate correct answer (0-3 for single, array of 0-3 for multiple)
            console.log(
              `[Parse Row ${rowNumber}] Validating correct answer. isMultiple: ${isMultiple}, correctAnswer:`,
              correctAnswer
            )

            if (isMultiple) {
              const answers = correctAnswer as number[]
              console.log(`[Parse Row ${rowNumber}] Validating multiple choice answers:`, answers)
              const invalid = answers.filter((a) => {
                const isValid = [0, 1, 2, 3].includes(a)
                console.log(
                  `[Parse Row ${rowNumber}] Answer ${a} (type: ${typeof a}): isValid=${isValid}`
                )
                return !isValid
              })
              if (invalid.length > 0) {
                console.log(`[Parse Row ${rowNumber}] ERROR: Invalid answers found:`, invalid)
                throw new Error(
                  `第 ${rowNumber} 行：选项题的正确答案必须为 0、1、2 或 3（对应A/B/C/D），当前包含无效数字：${invalid.join(', ')}`
                )
              }
              console.log(`[Parse Row ${rowNumber}] All multiple choice answers are valid`)
            } else {
              const singleAnswer = correctAnswer as number
              console.log(`[Parse Row ${rowNumber}] Validating single choice answer:`, singleAnswer)
              if (![0, 1, 2, 3].includes(singleAnswer)) {
                console.log(
                  `[Parse Row ${rowNumber}] ERROR: Single answer ${singleAnswer} not in range [0, 1, 2, 3]`
                )
                throw new Error(
                  `第 ${rowNumber} 行：选项题的正确答案必须是 0、1、2 或 3（对应A/B/C/D）`
                )
              }
              console.log(`[Parse Row ${rowNumber}] Single answer is valid`)
            }

            questions.push({
              text,
              questionType: isMultiple ? 'multiple' : 'single',
              optionType: 'letter-options' as const,
              options: [optionA, optionB, optionC, optionD],
              correctAnswer
            })
            console.log(
              `[Parse Row ${rowNumber}] Question added successfully. questionType: ${isMultiple ? 'multiple' : 'single'}`
            )
          }
        })

        resolve(questions)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}
