import { getTrialStatus, initTrial, checkSystemTimeIntegrity } from './trialManager'
import { validateDevice, getDeviceFingerprint } from './deviceFingerprint'
import { loadLicenseData, deleteLicenseFile, saveLicenseData, type LicenseData } from './storage'

/**
 * License validation result
 */
export interface LicenseStatus {
  valid: boolean
  edition: 'trial' | 'release'
  trialStatus?: {
    expired: boolean
    remaining: { value: number; unit: string }
  }
  deviceMatch?: boolean
  activated?: boolean
  needsActivation?: boolean
  error?: string
}

/**
 * Check if current build is trial edition
 */
export function isTrialEdition(): boolean {
  const edition = process.env.VITE_EDITION || 'release'
  return edition.toLowerCase() === 'trial'
}

/**
 * Main license validation function
 * Returns validation status and error message if invalid
 */
export function validateLicense(): LicenseStatus {
  const isTrial = isTrialEdition()

  // Release edition: activation code + device binding
  if (!isTrial) {
    console.log('[License Validator] Release edition - validating activation and device binding...')

    let licenseData = loadLicenseData()

    // First run: needs activation
    if (!licenseData || !licenseData.activated) {
      console.log('[License Validator] Release edition - not activated yet')
      return {
        valid: false,
        edition: 'release',
        activated: false,
        needsActivation: true,
        error: '需要激活'
      }
    }

    // Validate device fingerprint
    const storedFingerprint = licenseData.deviceFingerprint
    if (!storedFingerprint) {
      return {
        valid: false,
        edition: 'release',
        deviceMatch: false,
        error: '设备指纹未找到'
      }
    }

    const deviceMatch = validateDevice(storedFingerprint)
    if (!deviceMatch) {
      return {
        valid: false,
        edition: 'release',
        deviceMatch: false,
        error: '设备不匹配，此软件已绑定到其他设备'
      }
    }

    // Update last check time
    licenseData.lastCheckTime = Date.now()
    saveLicenseData(licenseData)

    // All checks passed
    console.log('[License Validator] Release edition validation passed')
    return {
      valid: true,
      edition: 'release',
      activated: true,
      deviceMatch: true
    }
  }

  // Trial edition: validate trial period and device
  console.log('[License Validator] Trial edition - validating license...')

  // Initialize trial if first run
  let licenseData = loadLicenseData()
  if (!licenseData) {
    console.log('[License Validator] First run - initializing trial...')
    const initialized = initTrial()
    if (!initialized) {
      return {
        valid: false,
        edition: 'trial',
        error: 'Failed to initialize trial period'
      }
    }
    // Reload license data after initialization
    licenseData = loadLicenseData()
    if (!licenseData) {
      return {
        valid: false,
        edition: 'trial',
        error: 'Failed to load license data after initialization'
      }
    }
  }

  // Check system time integrity
  if (!checkSystemTimeIntegrity()) {
    return {
      valid: false,
      edition: 'trial',
      error: 'System time manipulation detected'
    }
  }

  // Get trial status
  const trialStatus = getTrialStatus()
  if (!trialStatus.initialized) {
    return {
      valid: false,
      edition: 'trial',
      error: 'Trial not initialized'
    }
  }

  // Check if trial expired
  if (trialStatus.expired) {
    return {
      valid: false,
      edition: 'trial',
      trialStatus: {
        expired: true,
        remaining: { value: 0, unit: 'seconds' }
      },
      error: 'Trial period has expired'
    }
  }

  // Validate device fingerprint
  const storedFingerprint = licenseData.deviceFingerprint

  if (!storedFingerprint) {
    return {
      valid: false,
      edition: 'trial',
      error: 'Device fingerprint not found'
    }
  }

  const deviceMatch = validateDevice(storedFingerprint)
  if (!deviceMatch) {
    // For trial edition: if device mismatch but trial not expired, allow re-initialization
    // This allows users to test on different devices, but resets the trial period
    if (!trialStatus.expired) {
      console.log(
        '[License Validator] Device mismatch detected, but trial not expired. Clearing old license and re-initializing...'
      )
      deleteLicenseFile()
      const reinitialized = initTrial()
      if (reinitialized) {
        // Reload and re-validate
        const newLicenseData = loadLicenseData()
        if (newLicenseData) {
          console.log('[License Validator] Trial re-initialized on new device')
          const newTrialStatus = getTrialStatus()
          return {
            valid: true,
            edition: 'trial',
            trialStatus: {
              expired: false,
              remaining: {
                value: newTrialStatus.remaining.value,
                unit: newTrialStatus.remaining.unit
              }
            },
            deviceMatch: true
          }
        }
      }
    }

    // If trial expired or re-initialization failed, return error
    return {
      valid: false,
      edition: 'trial',
      deviceMatch: false,
      error: trialStatus.expired
        ? '试用期已过期，无法在其他设备上使用'
        : '设备不匹配，且重新初始化失败'
    }
  }

  // All checks passed
  console.log('[License Validator] License validation passed')
  return {
    valid: true,
    edition: 'trial',
    trialStatus: {
      expired: false,
      remaining: {
        value: trialStatus.remaining.value,
        unit: trialStatus.remaining.unit
      }
    },
    deviceMatch: true
  }
}

/**
 * Get license status without validation (for UI display)
 */
export function getLicenseStatus(): LicenseStatus {
  const isTrial = isTrialEdition()

  if (!isTrial) {
    const licenseData = loadLicenseData()
    const needsActivation = !licenseData || !licenseData.activated
    const deviceMatch = licenseData ? validateDevice(licenseData.deviceFingerprint) : false

    return {
      valid: !needsActivation && deviceMatch,
      edition: 'release',
      activated: !needsActivation,
      needsActivation,
      deviceMatch
    }
  }

  const trialStatus = getTrialStatus()
  const licenseData = loadLicenseData()

  if (!trialStatus.initialized) {
    return {
      valid: false,
      edition: 'trial',
      error: 'Trial not initialized'
    }
  }

  const deviceMatch = licenseData ? validateDevice(licenseData.deviceFingerprint) : false

  return {
    valid: !trialStatus.expired && deviceMatch,
    edition: 'trial',
    trialStatus: {
      expired: trialStatus.expired,
      remaining: {
        value: trialStatus.remaining.value,
        unit: trialStatus.remaining.unit
      }
    },
    deviceMatch
  }
}

/**
 * Generate device-bound activation code from device fingerprint
 * This ensures each activation code can only be used on one device
 *
 * @param deviceFingerprint - Device fingerprint (SHA-256 hash)
 * @param baseCode - Optional base code for consistency (if null, uses device fingerprint)
 * @returns Device-bound activation code (16 hex characters)
 */
function generateDeviceBoundCode(
  deviceFingerprint: string,
  baseCode: string | null = null
): string {
  const { createHash } = require('crypto')
  const seed = baseCode || deviceFingerprint
  // Use a secret key to ensure activation codes can't be easily reverse-engineered
  const secret = 'OFFLINE-BIGSCREEN-QA-SYSTEM-SECRET-2024'
  const combined = `${seed}:${secret}:${deviceFingerprint}`

  const hash = createHash('sha256')
  hash.update(combined)
  const hashHex = hash.digest('hex').toUpperCase()

  // Take first 16 characters
  return hashHex.substring(0, 16)
}

/**
 * Activate license with activation code
 * Returns activation result
 */
export function activateLicense(activationCode: string): { success: boolean; error?: string } {
  const expectedCode = process.env.VITE_ACTIVATION_CODE || ''

  if (!expectedCode) {
    console.error('[License Validator] Activation code not configured')
    return { success: false, error: '激活码未配置' }
  }

  // Remove dashes and normalize: both input and expected code may have dashes
  const normalizeCode = (code: string): string => {
    return code.replace(/-/g, '').trim().toUpperCase()
  }

  const normalizedCode = normalizeCode(activationCode)
  const normalizedExpected = normalizeCode(expectedCode)

  // Get current device fingerprint
  const currentFingerprint = getDeviceFingerprint()

  // Check if this is a device-bound activation code
  // Device-bound codes are generated from device fingerprint and can only work on that device
  const deviceBoundCode = generateDeviceBoundCode(currentFingerprint, null)
  const normalizedDeviceBound = normalizeCode(deviceBoundCode)

  // Check if expected code is device-bound (matches current device)
  const isExpectedDeviceBound = normalizedExpected === normalizedDeviceBound
  const isDirectMatch = normalizedCode === normalizedExpected
  const isInputDeviceBound = normalizedCode === normalizedDeviceBound

  console.log('[License Validator] Comparing codes:', {
    input: normalizedCode.substring(0, 8) + '...',
    expected: normalizedExpected.substring(0, 8) + '...',
    deviceBound: normalizedDeviceBound.substring(0, 8) + '...',
    isExpectedDeviceBound,
    isDirectMatch,
    isInputDeviceBound,
    deviceFingerprint: currentFingerprint.substring(0, 16) + '...'
  })

  // Validate activation code
  // Support two modes:
  // 1. Direct match: activation code matches expected code (legacy mode, allows sharing)
  // 2. Device-bound: activation code is generated from device fingerprint (secure mode, one device only)
  if (isDirectMatch) {
    // Direct match mode: activation code matches expected code
    console.log('[License Validator] Using direct match mode (legacy)')
  } else if (isInputDeviceBound && isExpectedDeviceBound) {
    // Device-bound mode: both input and expected are device-bound codes
    console.log('[License Validator] Using device-bound mode (secure)')
  } else if (isInputDeviceBound && !isExpectedDeviceBound) {
    // User provided device-bound code, but expected code is different (direct mode)
    // This means the installer was built with a direct activation code, not device-bound
    // Allow it if it matches the expected direct code
    if (normalizedCode !== normalizedExpected) {
      console.warn('[License Validator] Device-bound code provided but expected direct code', {
        received: normalizedCode.substring(0, 8) + '...',
        expected: normalizedExpected.substring(0, 8) + '...',
        deviceBound: normalizedDeviceBound.substring(0, 8) + '...'
      })
      return { success: false, error: '激活码错误' }
    }
  } else {
    // Invalid code
    console.warn('[License Validator] Invalid activation code provided', {
      received: normalizedCode.substring(0, 8) + '...',
      expected: normalizedExpected.substring(0, 8) + '...',
      deviceBound: normalizedDeviceBound.substring(0, 8) + '...'
    })
    return { success: false, error: '激活码错误' }
  }

  // Check if already activated
  const existingData = loadLicenseData()
  if (existingData?.activated) {
    // Verify the activation code matches (normalize stored code too)
    const storedCode = existingData.activationCode ? normalizeCode(existingData.activationCode) : ''
    if (storedCode === normalizedExpected) {
      // Check if device fingerprint matches
      if (existingData.deviceFingerprint === currentFingerprint) {
        console.log('[License Validator] Already activated with this code on this device')
        return { success: true }
      } else {
        // Same activation code but different device - this means activation code was shared
        console.error('[License Validator] Activation code already used on another device', {
          storedFingerprint: existingData.deviceFingerprint?.substring(0, 16) + '...',
          currentFingerprint: currentFingerprint.substring(0, 16) + '...'
        })
        return {
          success: false,
          error: '此激活码已绑定到其他设备，无法在此设备上使用'
        }
      }
    } else {
      // Different activation code was used - prevent switching codes
      console.error('[License Validator] Different activation code already used on this device', {
        storedCode: storedCode.substring(0, 8) + '...',
        newCode: normalizedExpected.substring(0, 8) + '...'
      })
      return {
        success: false,
        error: '此设备已使用其他激活码激活，无法更换激活码'
      }
    }
  }

  // CRITICAL SECURITY: Prevent activation code reuse on different devices
  //
  // Strategy: Use activation code + device fingerprint binding
  // When user A activates, the activation code is bound to device A's fingerprint.
  // If user B tries to use the same activation code, we check:
  // 1. If user B's device already has a different activation, reject
  // 2. If user B's device is clean, we still allow activation (offline limitation)
  //    BUT we store the binding, so if user A's license is checked, it will fail
  //    if device fingerprint doesn't match.
  //
  // The real protection comes from: each device can only have ONE activation code.
  // If device B activates with code X, then device A (if it had code X) will fail
  // validation because device fingerprint won't match.
  //
  // However, this still allows user B to activate. To truly prevent this,
  // you need to generate device-specific activation codes OR use online validation.

  // Save activation information with device binding
  const now = Date.now()

  const newLicenseData: LicenseData = {
    firstRunTime: now,
    deviceFingerprint: currentFingerprint,
    lastCheckTime: now,
    activationCode: normalizedCode, // Store normalized code (without dashes)
    activated: true
  }

  if (saveLicenseData(newLicenseData)) {
    console.log('[License Validator] License activated successfully', {
      activationCode: normalizedCode.substring(0, 8) + '...',
      deviceFingerprint: currentFingerprint.substring(0, 16) + '...'
    })
    return { success: true }
  }

  console.error('[License Validator] Failed to save license data')
  return { success: false, error: '保存激活信息失败' }
}
