import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  createHmac,
  type CipherGCM,
  type DecipherGCM
} from 'crypto'

/**
 * License data structure stored in encrypted file
 */
export interface LicenseData {
  firstRunTime: number // Unix timestamp in milliseconds
  deviceFingerprint: string // SHA-256 hash of device info
  lastCheckTime: number // Last validation timestamp
  activationCode?: string // Activation code (for release edition)
  activated: boolean // Whether the license has been activated
}

/**
 * Storage configuration
 */
const STORAGE_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 16
}

/**
 * Get storage directory path
 */
function getStorageDir(): string {
  return app.getPath('userData')
}

/**
 * Get license file path
 */
function getLicenseFilePath(): string {
  return join(getStorageDir(), 'license.dat')
}

/**
 * Generate encryption key from app name (deterministic for same app)
 * In production, you might want to use a more secure key derivation
 */
function getEncryptionKey(): Buffer {
  const appName = app.getName()
  const key = createHash('sha256').update(appName).digest()
  return key
}

/**
 * Encrypt data using AES-256-GCM
 */
function encryptData(data: LicenseData): Buffer {
  const key = getEncryptionKey()
  const iv = randomBytes(STORAGE_CONFIG.ivLength)
  const cipher = createCipheriv(STORAGE_CONFIG.algorithm, key, iv) as CipherGCM

  const dataString = JSON.stringify(data)
  let encrypted = cipher.update(dataString, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  // Combine: IV + AuthTag + EncryptedData
  const result = Buffer.concat([iv, authTag, encrypted])
  return result
}

/**
 * Decrypt data using AES-256-GCM
 */
function decryptData(encrypted: Buffer): LicenseData | null {
  try {
    const key = getEncryptionKey()
    const iv = encrypted.subarray(0, STORAGE_CONFIG.ivLength)
    const authTag = encrypted.subarray(STORAGE_CONFIG.ivLength, STORAGE_CONFIG.ivLength + 16)
    const encryptedData = encrypted.subarray(STORAGE_CONFIG.ivLength + 16)

    const decipher = createDecipheriv(STORAGE_CONFIG.algorithm, key, iv) as DecipherGCM
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    const dataString = decrypted.toString('utf8')
    return JSON.parse(dataString) as LicenseData
  } catch (error) {
    console.error('[License Storage] Decryption failed:', error)
    return null
  }
}

/**
 * Generate HMAC for data integrity verification
 */
function generateHMAC(data: Buffer): string {
  const key = getEncryptionKey()
  const hmac = createHmac('sha256', key)
  hmac.update(data)
  return hmac.digest('hex')
}

/**
 * Verify HMAC
 */
function verifyHMAC(data: Buffer, expectedHMAC: string): boolean {
  const calculatedHMAC = generateHMAC(data)
  return calculatedHMAC === expectedHMAC
}

/**
 * Save license data to encrypted file
 */
export function saveLicenseData(data: LicenseData): boolean {
  try {
    const storageDir = getStorageDir()
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true })
    }

    const encrypted = encryptData(data)
    const hmac = generateHMAC(encrypted)

    // Format: HMAC (64 hex chars) + EncryptedData
    const hmacBuffer = Buffer.from(hmac, 'hex')
    const finalData = Buffer.concat([hmacBuffer, encrypted])

    const filePath = getLicenseFilePath()
    writeFileSync(filePath, finalData)

    console.log('[License Storage] License data saved successfully')
    return true
  } catch (error) {
    console.error('[License Storage] Failed to save license data:', error)
    return false
  }
}

/**
 * Load license data from encrypted file
 */
export function loadLicenseData(): LicenseData | null {
  try {
    const filePath = getLicenseFilePath()
    if (!existsSync(filePath)) {
      console.log('[License Storage] License file not found')
      return null
    }

    const fileData = readFileSync(filePath)

    // Extract HMAC and encrypted data
    const hmacBuffer = fileData.subarray(0, 32) // 32 bytes = 64 hex chars
    const encrypted = fileData.subarray(32)
    const hmac = hmacBuffer.toString('hex')

    // Verify HMAC
    if (!verifyHMAC(encrypted, hmac)) {
      console.error('[License Storage] HMAC verification failed - data may be corrupted')
      return null
    }

    const data = decryptData(encrypted)
    if (!data) {
      console.error('[License Storage] Failed to decrypt license data')
      return null
    }

    console.log('[License Storage] License data loaded successfully')
    return data
  } catch (error) {
    console.error('[License Storage] Failed to load license data:', error)
    return null
  }
}

/**
 * Check if license file exists
 */
export function licenseFileExists(): boolean {
  return existsSync(getLicenseFilePath())
}

/**
 * Delete license file (for testing/reset)
 */
export function deleteLicenseFile(): boolean {
  try {
    const filePath = getLicenseFilePath()
    if (existsSync(filePath)) {
      const { unlinkSync } = require('fs')
      unlinkSync(filePath)
      console.log('[License Storage] License file deleted')
      return true
    }
    return false
  } catch (error) {
    console.error('[License Storage] Failed to delete license file:', error)
    return false
  }
}
