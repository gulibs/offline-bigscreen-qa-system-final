#!/usr/bin/env node

/**
 * Device-Bound Activation Code Generator
 *
 * Generates activation codes that are bound to a specific device fingerprint.
 * This ensures each activation code can only be used on one device.
 *
 * Usage:
 *   node scripts/generate-device-bound-code.js <device-fingerprint>
 *
 * The device fingerprint can be obtained from the application's debug output
 * or by running a helper script.
 */

const crypto = require('crypto')

/**
 * Generate a device-bound activation code
 * @param {string} deviceFingerprint - Device fingerprint (SHA-256 hash)
 * @param {string} baseCode - Base activation code (optional, for consistency)
 * @returns {string} Device-bound activation code
 */
function generateDeviceBoundCode(deviceFingerprint, baseCode = null) {
  // If base code is provided, use it; otherwise generate from device fingerprint
  const seed = baseCode || deviceFingerprint

  // Combine seed with a secret salt (in production, this should be a secure secret)
  // For offline apps, we use a deterministic approach based on device fingerprint
  const secret = 'OFFLINE-BIGSCREEN-QA-SYSTEM-SECRET-2024'
  const combined = `${seed}:${secret}:${deviceFingerprint}`

  // Generate hash
  const hash = crypto.createHash('sha256')
  hash.update(combined)
  const hashHex = hash.digest('hex').toUpperCase()

  // Take first 16 characters and format
  const code = hashHex.substring(0, 16)

  // Format as XXXX-XXXX-XXXX-XXXX
  const groups = []
  for (let i = 0; i < code.length; i += 4) {
    groups.push(code.substring(i, i + 4))
  }

  return groups.join('-')
}

/**
 * Validate device-bound activation code
 * @param {string} code - Activation code to validate
 * @param {string} deviceFingerprint - Device fingerprint
 * @param {string} expectedBaseCode - Expected base code (optional)
 * @returns {boolean} True if valid
 */
function validateDeviceBoundCode(code, deviceFingerprint, expectedBaseCode = null) {
  const normalized = code.replace(/-/g, '').toUpperCase()
  const expected = generateDeviceBoundCode(deviceFingerprint, expectedBaseCode)
  const expectedNormalized = expected.replace(/-/g, '').toUpperCase()

  return normalized === expectedNormalized
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Device-Bound Activation Code Generator

This tool generates activation codes that are bound to a specific device.
Each activation code can only be used on the device it was generated for.

Usage:
  node scripts/generate-device-bound-code.js <device-fingerprint> [base-code]

Arguments:
  device-fingerprint    Device fingerprint (SHA-256 hash, 64 hex characters)
  base-code            Optional base code for consistency (default: use device fingerprint)

Examples:
  # Generate code for a specific device
  node scripts/generate-device-bound-code.js abc123def456...

  # Generate code with a base code (for consistency across devices)
  node scripts/generate-device-bound-code.js abc123def456... BASE-CODE-1234

How to get device fingerprint:
  1. Run the application in development mode
  2. Check the console output for "[Device Fingerprint] Generated fingerprint: ..."
  3. Or use the application's debug panel to get the device fingerprint

Note:
  - Each device fingerprint will generate a unique activation code
  - The same device fingerprint will always generate the same activation code
  - Activation codes are deterministic and can be regenerated if needed
`)
    process.exit(0)
  }

  const deviceFingerprint = args[0]
  const baseCode = args[1] || null

  // Validate device fingerprint format (should be 64 hex characters)
  if (!/^[a-fA-F0-9]{64}$/.test(deviceFingerprint)) {
    console.error(
      'Error: Device fingerprint must be a 64-character hexadecimal string (SHA-256 hash)'
    )
    console.error('Received:', deviceFingerprint)
    process.exit(1)
  }

  // Generate device-bound code
  const activationCode = generateDeviceBoundCode(deviceFingerprint, baseCode)

  // Output result
  console.log('\n' + '='.repeat(60))
  console.log('Device-Bound Activation Code')
  console.log('='.repeat(60))
  console.log(
    `Device Fingerprint: ${deviceFingerprint.substring(0, 16)}...${deviceFingerprint.substring(48)}`
  )
  if (baseCode) {
    console.log(`Base Code: ${baseCode}`)
  }
  console.log(`Activation Code: ${activationCode}`)
  console.log('='.repeat(60))
  console.log('\nTo use in GitHub Actions workflow:')
  console.log(`  VITE_ACTIVATION_CODE=${activationCode}`)
  console.log('\nTo use in local build:')
  console.log(`  VITE_ACTIVATION_CODE=${activationCode} pnpm build:release:win:activate`)
  console.log('\n⚠️  IMPORTANT: This activation code is bound to the specified device.')
  console.log('   It can only be used on the device with the matching fingerprint.')
  console.log('')
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = {
  generateDeviceBoundCode,
  validateDeviceBoundCode
}
