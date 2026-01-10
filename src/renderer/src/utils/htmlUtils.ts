/**
 * HTML Utility Functions
 * Helper functions for working with HTML content
 */

/**
 * Strip HTML tags from a string
 * @param html HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtmlTags(html: string): string {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

/**
 * Get plain text preview from HTML content
 * @param html HTML string
 * @param maxLength Maximum length of preview
 * @returns Plain text preview
 */
export function getHtmlPreview(html: string, maxLength = 100): string {
  const text = stripHtmlTags(html)
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}
