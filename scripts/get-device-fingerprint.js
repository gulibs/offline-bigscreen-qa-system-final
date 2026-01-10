#!/usr/bin/env node

/**
 * Device Fingerprint Getter
 *
 * Standalone tool to get device fingerprint without installing the application.
 * Users can run this before installation to get their device fingerprint.
 *
 * Usage:
 *   node scripts/get-device-fingerprint.js
 *
 * Or if you have Node.js installed:
 *   npx -y node scripts/get-device-fingerprint.js
 */

const os = require('os')
const crypto = require('crypto')
const { execSync } = require('child_process')

/**
 * Get MAC addresses from all network interfaces
 */
function getMacAddresses() {
  const interfaces = os.networkInterfaces()
  const macAddresses = []

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
function getWindowsHardwareInfo() {
  if (os.platform() !== 'win32') {
    return {}
  }

  const result = { cpuInfo: undefined, machineId: undefined }

  try {
    // Get CPU ID (Processor ID from WMIC)
    try {
      const cpuOutput = execSync('wmic cpu get ProcessorId /value', {
        encoding: 'utf8',
        timeout: 5000
      })
      const match = cpuOutput.match(/ProcessorId=([^\r\n]+)/)
      if (match) {
        result.cpuInfo = match[1].trim()
      }
    } catch (error) {
      console.warn('[Warning] Failed to get CPU ID:', error.message)
    }

    // Get Machine GUID (from registry)
    try {
      const guidOutput = execSync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: 'utf8', timeout: 5000 }
      )
      const match = guidOutput.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/)
      if (match) {
        result.machineId = match[1].trim()
      }
    } catch (error) {
      console.warn('[Warning] Failed to get Machine GUID:', error.message)
    }
  } catch (error) {
    console.warn('[Warning] Failed to get Windows hardware info:', error.message)
  }

  return result
}

/**
 * Collect device information
 */
function collectDeviceInfo() {
  const macAddresses = getMacAddresses()
  const windowsInfo = getWindowsHardwareInfo()

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    macAddresses,
    ...windowsInfo
  }
}

/**
 * Generate device fingerprint from collected information
 */
function getDeviceFingerprint() {
  const deviceInfo = collectDeviceInfo()

  // Create a consistent string representation
  const infoString = JSON.stringify(deviceInfo, Object.keys(deviceInfo).sort())

  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256')
  hash.update(infoString)
  const fingerprint = hash.digest('hex')

  return fingerprint
}

/**
 * Main function
 */
function main() {
  console.log('\n' + '='.repeat(60))
  console.log('Device Fingerprint Getter')
  console.log('='.repeat(60))
  console.log('Collecting device information...\n')

  try {
    const fingerprint = getDeviceFingerprint()
    const deviceInfo = collectDeviceInfo()

    console.log('Device Information:')
    console.log(`  Hostname: ${deviceInfo.hostname}`)
    console.log(`  Platform: ${deviceInfo.platform}`)
    console.log(`  Architecture: ${deviceInfo.arch}`)
    console.log(`  MAC Addresses: ${deviceInfo.macAddresses.length} found`)
    if (deviceInfo.cpuInfo) {
      console.log(`  CPU ID: ${deviceInfo.cpuInfo}`)
    }
    if (deviceInfo.machineId) {
      console.log(`  Machine GUID: ${deviceInfo.machineId}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('Device Fingerprint (SHA-256 Hash):')
    console.log('='.repeat(60))
    console.log(fingerprint)
    console.log('='.repeat(60))

    console.log('\n📋 Next Steps:')
    console.log('1. Copy the device fingerprint above')
    console.log('2. Send it to the administrator')
    console.log('3. Administrator will generate an activation code for this device')
    console.log('4. Install the application with the generated activation code')
    console.log('\n💡 Note: Device fingerprint is a SHA-256 hash of multiple device')
    console.log('   information (hostname, MAC addresses, CPU ID, Machine GUID, etc.)')
    console.log('   It is NOT just the Windows Machine GUID.')
    console.log('')
  } catch (error) {
    console.error('\n❌ Error getting device fingerprint:', error.message)
    console.error('\nPlease make sure you have Node.js installed.')
    console.error('You can download Node.js from: https://nodejs.org/')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = {
  getDeviceFingerprint,
  collectDeviceInfo
}
