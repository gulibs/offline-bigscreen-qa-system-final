import { loadLicenseData, saveLicenseData, type LicenseData } from './storage'
import { getDeviceFingerprint } from './deviceFingerprint'

/**
 * Trial configuration from environment variables
 */
interface TrialConfig {
  duration: number // Duration value
  unit: 'days' | 'hours' | 'minutes' | 'seconds' // Time unit
}

/**
 * Trial status information
 */
export interface TrialStatus {
  initialized: boolean
  expired: boolean
  remaining: {
    value: number
    unit: string
    totalSeconds: number
  }
  startTime: number | null
  endTime: number | null
}

/**
 * Get trial configuration from environment variables
 * Default: 5 minutes for testing
 */
function getTrialConfig(): TrialConfig {
  const duration = parseInt(process.env.VITE_TRIAL_DURATION || '5', 10)
  const unit = (process.env.VITE_TRIAL_UNIT || 'minutes') as TrialConfig['unit']

  // Validate unit
  const validUnits: TrialConfig['unit'][] = ['days', 'hours', 'minutes', 'seconds']
  const validUnit = validUnits.includes(unit) ? unit : 'minutes'

  return {
    duration,
    unit: validUnit
  }
}

/**
 * Convert time unit to milliseconds
 */
function unitToMilliseconds(value: number, unit: TrialConfig['unit']): number {
  switch (unit) {
    case 'days':
      return value * 24 * 60 * 60 * 1000
    case 'hours':
      return value * 60 * 60 * 1000
    case 'minutes':
      return value * 60 * 1000
    case 'seconds':
      return value * 1000
    default:
      return value * 60 * 1000 // Default to minutes
  }
}

/**
 * Convert milliseconds to human-readable format
 */
function millisecondsToHumanReadable(ms: number): { value: number; unit: string } {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return { value: days, unit: 'days' }
  } else if (hours > 0) {
    return { value: hours, unit: 'hours' }
  } else if (minutes > 0) {
    return { value: minutes, unit: 'minutes' }
  } else {
    return { value: seconds, unit: 'seconds' }
  }
}

/**
 * Initialize trial period (first run)
 * Records first run time and device fingerprint
 */
export function initTrial(): boolean {
  const existingData = loadLicenseData()
  if (existingData) {
    console.log('[Trial Manager] Trial already initialized')
    return true
  }

  const now = Date.now()
  const deviceFingerprint = getDeviceFingerprint()

  const licenseData: LicenseData = {
    firstRunTime: now,
    deviceFingerprint,
    lastCheckTime: now,
    activated: false // Trial edition doesn't need activation
  }

  const saved = saveLicenseData(licenseData)
  if (saved) {
    console.log('[Trial Manager] Trial initialized successfully')
    const config = getTrialConfig()
    console.log(`[Trial Manager] Trial duration: ${config.duration} ${config.unit}`)
  }

  return saved
}

/**
 * Get trial status
 */
export function getTrialStatus(): TrialStatus {
  const licenseData = loadLicenseData()
  const config = getTrialConfig()

  if (!licenseData) {
    return {
      initialized: false,
      expired: false,
      remaining: { value: 0, unit: 'seconds', totalSeconds: 0 },
      startTime: null,
      endTime: null
    }
  }

  const startTime = licenseData.firstRunTime
  const trialDurationMs = unitToMilliseconds(config.duration, config.unit)
  const endTime = startTime + trialDurationMs
  const now = Date.now()

  // Check for system time manipulation (time went backwards)
  if (now < licenseData.lastCheckTime) {
    console.error('[Trial Manager] System time detected going backwards! Possible tampering.')
    // Treat as expired if time manipulation detected
    return {
      initialized: true,
      expired: true,
      remaining: { value: 0, unit: 'seconds', totalSeconds: 0 },
      startTime,
      endTime
    }
  }

  // Update last check time
  licenseData.lastCheckTime = now
  saveLicenseData(licenseData)

  const remainingMs = Math.max(0, endTime - now)
  const expired = remainingMs === 0
  const remaining = millisecondsToHumanReadable(remainingMs)

  return {
    initialized: true,
    expired,
    remaining: {
      ...remaining,
      totalSeconds: Math.floor(remainingMs / 1000)
    },
    startTime,
    endTime
  }
}

/**
 * Check if trial is expired
 */
export function isTrialExpired(): boolean {
  const status = getTrialStatus()
  return status.expired
}

/**
 * Get remaining trial time
 */
export function getRemainingTime(): { value: number; unit: string; expired: boolean } {
  const status = getTrialStatus()
  return {
    value: status.remaining.value,
    unit: status.remaining.unit,
    expired: status.expired
  }
}

/**
 * Check system time integrity
 * Detects if system time was set backwards
 */
export function checkSystemTimeIntegrity(): boolean {
  const licenseData = loadLicenseData()
  if (!licenseData) {
    return true // No data to check
  }

  const now = Date.now()
  if (now < licenseData.lastCheckTime) {
    console.error('[Trial Manager] System time integrity check failed')
    return false
  }

  return true
}
