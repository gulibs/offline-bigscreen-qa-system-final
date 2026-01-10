import { networkInterfaces, hostname, platform, arch } from 'os'
import { createHash } from 'crypto'
import { execSync } from 'child_process'

/**
 * Device information collected for fingerprinting
 */
interface DeviceInfo {
  hostname: string
  platform: string
  arch: string
  macAddresses: string[]
  cpuInfo?: string
  machineId?: string
}

/**
 * Get MAC addresses from all network interfaces
 */
function getMacAddresses(): string[] {
  const interfaces = networkInterfaces()
  const macAddresses: string[] = []

  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name]
    if (nets) {
      for (const net of nets) {
        // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal && net.mac) {
          macAddresses.push(net.mac)
        }
      }
    }
  }

  return macAddresses.sort() // Sort for consistency
}

/**
 * Get Windows-specific hardware information
 */
function getWindowsHardwareInfo(): { cpuInfo?: string; machineId?: string } {
  if (platform() !== 'win32') {
    return {}
  }

  try {
    // Get CPU ID (Processor ID from WMIC)
    let cpuInfo: string | undefined
    try {
      const cpuOutput = execSync('wmic cpu get ProcessorId /value', {
        encoding: 'utf8',
        timeout: 5000
      })
      const match = cpuOutput.match(/ProcessorId=([^\r\n]+)/)
      if (match) {
        cpuInfo = match[1].trim()
      }
    } catch (error) {
      console.warn('[Device Fingerprint] Failed to get CPU ID:', error)
    }

    // Get Machine GUID (from registry)
    let machineId: string | undefined
    try {
      const guidOutput = execSync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: 'utf8', timeout: 5000 }
      )
      const match = guidOutput.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/)
      if (match) {
        machineId = match[1].trim()
      }
    } catch (error) {
      console.warn('[Device Fingerprint] Failed to get Machine GUID:', error)
    }

    return { cpuInfo, machineId }
  } catch (error) {
    console.warn('[Device Fingerprint] Failed to get Windows hardware info:', error)
    return {}
  }
}

/**
 * Collect device information
 */
function collectDeviceInfo(): DeviceInfo {
  const macAddresses = getMacAddresses()
  const windowsInfo = getWindowsHardwareInfo()

  return {
    hostname: hostname(),
    platform: platform(),
    arch: arch(),
    macAddresses,
    ...windowsInfo
  }
}

/**
 * Generate device fingerprint from collected information
 * Uses SHA-256 hash of combined device info
 */
export function getDeviceFingerprint(): string {
  const deviceInfo = collectDeviceInfo()

  // Create a consistent string representation
  const infoString = JSON.stringify(deviceInfo, Object.keys(deviceInfo).sort())

  // Generate SHA-256 hash
  const hash = createHash('sha256')
  hash.update(infoString)
  const fingerprint = hash.digest('hex')

  console.log('[Device Fingerprint] Generated fingerprint:', fingerprint.substring(0, 16) + '...')
  return fingerprint
}

/**
 * Validate current device against stored fingerprint
 */
export function validateDevice(storedFingerprint: string): boolean {
  const currentFingerprint = getDeviceFingerprint()
  const isValid = currentFingerprint === storedFingerprint

  if (!isValid) {
    console.warn(
      '[Device Fingerprint] Device mismatch!',
      'Stored:',
      storedFingerprint.substring(0, 16) + '...',
      'Current:',
      currentFingerprint.substring(0, 16) + '...'
    )
  } else {
    console.log('[Device Fingerprint] Device validation passed')
  }

  return isValid
}

/**
 * Get device info for debugging (without generating fingerprint)
 */
export function getDeviceInfo(): DeviceInfo {
  return collectDeviceInfo()
}
