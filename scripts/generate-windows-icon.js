/**
 * Generate Windows ICO file from PNG icon
 * 
 * This script creates a proper Windows ICO file with multiple sizes
 * to prevent icon cropping issues on Windows systems.
 * 
 * Requirements:
 * - sharp: pnpm add -D sharp
 * - to-ico: pnpm add -D to-ico
 * 
 * Usage:
 *   node scripts/generate-windows-icon.js
 */

const fs = require('fs')
const path = require('path')

const inputIcon = path.join(__dirname, '../resources/icon.png')
const outputDir = path.join(__dirname, '../build')
const outputIco = path.join(outputDir, 'icon.ico')

// Check if required packages are available
let sharp
let toIco
try {
  sharp = require('sharp')
} catch (err) {
  console.error('❌ Error: sharp is not installed.')
  console.log('\n📦 Install it with: pnpm add -D sharp')
  process.exit(1)
}

try {
  toIco = require('to-ico')
} catch (err) {
  console.error('❌ Error: to-ico is not installed.')
  console.log('\n📦 Install it with: pnpm add -D to-ico')
  process.exit(1)
}

async function generateIco() {
  try {
    // Ensure build directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Windows ICO requires multiple sizes: 16, 32, 48, 64, 128, 256
    const sizes = [16, 32, 48, 64, 128, 256]
    
    console.log('🔄 Generating Windows ICO file...')
    console.log(`📥 Input: ${inputIcon}`)
    console.log(`📤 Output: ${outputIco}`)
    
    // Read the input PNG
    const inputBuffer = fs.readFileSync(inputIcon)
    
    // Generate PNG files for each size
    console.log('\n📐 Generating icon sizes:')
    const pngBuffers = []
    
    for (const size of sizes) {
      const resizedBuffer = await sharp(inputBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toBuffer()
      
      pngBuffers.push(resizedBuffer)
      console.log(`   ✓ ${size}x${size}`)
    }
    
    // Convert PNG buffers to ICO file
    console.log('\n🔄 Converting to ICO format...')
    const icoBuffer = await toIco(pngBuffers)
    
    // Write ICO file
    fs.writeFileSync(outputIco, icoBuffer)
    
    console.log(`\n✅ ICO file generated successfully: ${outputIco}`)
    console.log(`   File size: ${(icoBuffer.length / 1024).toFixed(2)} KB`)
    
  } catch (error) {
    console.error('❌ Error generating icon:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Check if input file exists
if (!fs.existsSync(inputIcon)) {
  console.error(`❌ Error: Input icon not found at ${inputIcon}`)
  process.exit(1)
}

generateIco()
