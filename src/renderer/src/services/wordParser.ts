/**
 * Word Document Parser Service
 * Parses Word documents (.docx) to extract title and content
 */

import * as mammoth from 'mammoth'

export interface ParsedWordDocument {
  /** Document title (extracted from first heading or filename) */
  title: string
  /** Document content as HTML */
  content: string
  /** Original filename */
  filename: string
  /** Error message if parsing failed */
  error?: string
}

/**
 * Parse a Word document to extract title and content
 * @param file Word document file (.docx)
 * @returns Parsed document with title and HTML content
 */
export async function parseWordDocument(file: File): Promise<ParsedWordDocument> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()

    // Configure style mapping to preserve formatting
    // This maps Word styles to HTML with inline styles
    const styleMap = [
      // Preserve heading styles
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Heading 5'] => h5:fresh",
      "p[style-name='Heading 6'] => h6:fresh",
      // Preserve paragraph styles (this will preserve alignment, indentation, etc.)
      "p => p",
      // Preserve runs (text formatting)
      "r[style-name='Strong'] => strong",
      "r[style-name='Emphasis'] => em",
      // Preserve tables
      "table => table",
      "tr => tr",
      "td => td",
      "th => th"
    ]

    // Convert Word document to HTML with style preservation
    // mammoth will preserve inline styles like text-align, font-size, color, etc.
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap,
        // Preserve empty paragraphs
        includeDefaultStyleMap: true,
        // Convert images to base64 (if needed)
        convertImage: mammoth.images.imgElement((image) => {
          return image.read('base64').then((imageBuffer) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`
            }
          })
        })
      }
    )
    const html = result.value

    // mammoth should preserve inline styles including:
    // - text-align (center, left, right, justify)
    // - font-size, font-family, font-weight, font-style
    // - color, background-color
    // - margin, padding (in some cases)
    // - line-height
    // These are preserved as inline style attributes in the HTML

    // Use filename as title (remove extension)
    const title = file.name.replace(/\.(docx?|doc)$/i, '')

    // Keep the full HTML content without removing any headings
    // The content should remain intact as it appears in the Word document
    let content = html.trim()

    // Ensure content is wrapped in a paragraph if it's not already
    if (!content.trim().startsWith('<')) {
      content = `<p>${content}</p>`
    }

    return {
      title,
      content,
      filename: file.name
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`解析 Word 文档 "${file.name}" 失败：${errorMessage}`)
  }
}

/**
 * Parse multiple Word documents
 * @param files Array of Word document files
 * @returns Array of parsed documents
 */
export async function parseWordDocuments(files: File[]): Promise<ParsedWordDocument[]> {
  const results: ParsedWordDocument[] = []

  for (const file of files) {
    try {
      const parsed = await parseWordDocument(file)
      results.push(parsed)
    } catch (error) {
      console.error(`[WordParser] Failed to parse ${file.name}:`, error)
      // Continue with other files even if one fails
      // The error will be reported in the import result
      results.push({
        title: file.name.replace(/\.(docx?|doc)$/i, ''),
        content: '<p>解析失败</p>',
        filename: file.name,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  return results
}
