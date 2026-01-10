# Device Fingerprint Getter for Windows (PowerShell)
#
# Standalone PowerShell script to get device fingerprint without installing the application.
# This script generates the same device fingerprint as the Node.js version.
#
# Usage:
#   .\scripts\get-device-fingerprint.ps1
#
# Or run directly:
#   powershell -ExecutionPolicy Bypass -File .\scripts\get-device-fingerprint.ps1
#
# IMPORTANT: This script must be run as a .ps1 file, not pasted into PowerShell console!

# Check PowerShell version (requires 3.0+)
if ($PSVersionTable.PSVersion.Major -lt 3) {
  Write-Host "❌ Error: This script requires PowerShell 3.0 or later." -ForegroundColor Red
  Write-Host "   Current version: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
  Write-Host "   Please upgrade PowerShell or use the Node.js version instead." -ForegroundColor Yellow
  Write-Host "`nPress any key to exit..."
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
  exit 1
}

# Set error action preference to stop on errors
$ErrorActionPreference = "Stop"

# Parse parameters manually if param() doesn't work (for compatibility)
$Help = $false
$Debug = $false
if ($args -contains "-Help" -or $args -contains "-help" -or $args -contains "--help" -or $args -contains "/?") {
  $Help = $true
}
if ($args -contains "-Debug" -or $args -contains "-debug") {
  $Debug = $true
}

# Use param() if available (PowerShell 2.0+), otherwise use manual parsing above
# Note: param() must be at the top of the script, but we handle it manually for compatibility

# Function to pause at the end (prevent window from closing)
function Pause-Script {
  Write-Host "`nPress any key to exit..." -ForegroundColor Gray
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

if ($Help) {
  Write-Host @"
Device Fingerprint Getter for Windows

This script collects device information and generates a SHA-256 hash
that matches the fingerprint used by the application.

Usage:
  .\scripts\get-device-fingerprint.ps1
  .\scripts\get-device-fingerprint.ps1 -Debug

Options:
  -Help      Show this help message
  -Debug     Show debug information (JSON string, etc.)

The device fingerprint is a SHA-256 hash of:
- Hostname
- Platform and Architecture
- MAC Addresses (all network interfaces)
- CPU ID (Windows)
- Machine GUID (Windows)

Note: This script requires PowerShell 5.1 or later.
"@
  Pause-Script
  exit 0
}

# Wrap entire script in try-catch to handle errors gracefully
try {

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Device Fingerprint Getter" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Collecting device information...`n" -ForegroundColor Yellow

# Collect device information
$deviceInfo = @{}

# Hostname
$deviceInfo.hostname = $env:COMPUTERNAME

# Platform
$deviceInfo.platform = "win32"

# Architecture
if ([Environment]::Is64BitOperatingSystem) {
  $deviceInfo.arch = "x64"
} else {
  $deviceInfo.arch = "x86"
}

# MAC Addresses
# Note: Node.js os.networkInterfaces() returns MAC addresses in "XX:XX:XX:XX:XX:XX" format
# We need to match this format exactly
$macAddresses = @()
try {
  $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.LinkSpeed -ne $null }
  foreach ($adapter in $adapters) {
      $mac = $adapter.MacAddress
      if ($mac -and $mac -ne "00-00-00-00-00-00") {
          # Convert Windows format (XX-XX-XX-XX-XX-XX) to Node.js format (XX:XX:XX:XX:XX:XX)
          # and ensure lowercase
          $macNormalized = $mac.Replace("-", ":").ToLower()
          $macAddresses += $macNormalized
      }
  }
  # Sort for consistency (Node.js version also sorts)
  $macAddresses = $macAddresses | Sort-Object
} catch {
  Write-Warning "Failed to get MAC addresses: $_"
  # Fallback: try using WMI
  try {
      $wmiAdapters = Get-WmiObject Win32_NetworkAdapter | Where-Object { $_.MACAddress -and $_.MACAddress -ne "00:00:00:00:00:00" }
      foreach ($adapter in $wmiAdapters) {
          $mac = $adapter.MACAddress
          if ($mac) {
              $macNormalized = $mac.ToLower()
              $macAddresses += $macNormalized
          }
      }
      $macAddresses = $macAddresses | Sort-Object
  } catch {
      Write-Warning "Failed to get MAC addresses via WMI: $_"
  }
}

$deviceInfo.macAddresses = $macAddresses

# CPU ID (Windows)
try {
  $cpuInfo = Get-WmiObject Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1 -Property ProcessorId
  if ($cpuInfo -and $cpuInfo.ProcessorId) {
      $deviceInfo.cpuInfo = $cpuInfo.ProcessorId.Trim()
  } else {
      Write-Warning "CPU ID not found (this is optional)"
  }
} catch {
  Write-Warning "Failed to get CPU ID: $_ (this is optional)"
}

# Machine GUID (Windows)
try {
  $regPath = "HKLM:\SOFTWARE\Microsoft\Cryptography"
  $machineGuid = (Get-ItemProperty -Path $regPath -Name MachineGuid -ErrorAction SilentlyContinue).MachineGuid
  if ($machineGuid) {
      $deviceInfo.machineId = $machineGuid.Trim()
  } else {
      Write-Warning "Machine GUID not found. This may require Administrator privileges."
      Write-Host "   Try running PowerShell as Administrator." -ForegroundColor Yellow
  }
} catch {
  Write-Warning "Failed to get Machine GUID: $_"
  Write-Host "   This may require Administrator privileges." -ForegroundColor Yellow
  Write-Host "   Try running PowerShell as Administrator." -ForegroundColor Yellow
}

# Display collected information
Write-Host "Device Information:" -ForegroundColor Yellow
Write-Host "  Hostname: $($deviceInfo.hostname)"
Write-Host "  Platform: $($deviceInfo.platform)"
Write-Host "  Architecture: $($deviceInfo.arch)"
Write-Host "  MAC Addresses: $($deviceInfo.macAddresses.Count) found"
if ($deviceInfo.cpuInfo) {
  Write-Host "  CPU ID: $($deviceInfo.cpuInfo)"
}
if ($deviceInfo.machineId) {
  Write-Host "  Machine GUID: $($deviceInfo.machineId)"
}

# Generate JSON string (sorted keys for consistency)
# This must match Node.js JSON.stringify(deviceInfo, Object.keys(deviceInfo).sort())
$sortedKeys = $deviceInfo.Keys | Sort-Object
$jsonParts = @()
foreach ($key in $sortedKeys) {
  $value = $deviceInfo[$key]
  if ($value -is [System.Array]) {
      # Array: convert to JSON array format
      # Node.js JSON.stringify formats arrays as ["value1","value2"]
      $arrayStr = ($value | ForEach-Object { "`"$_`"" }) -join ","
      $jsonParts += "`"$key`":[$arrayStr]"
  } elseif ($null -eq $value -or $value -eq "") {
      # Skip null/empty values (Node.js JSON.stringify includes them, but we'll skip for cleaner output)
      # Actually, we should include them to match Node.js behavior
      continue
  } else {
      # String value - escape quotes if needed
      $escapedValue = $value.ToString().Replace("`"", "\`"")
      $jsonParts += "`"$key`":`"$escapedValue`""
  }
}
$jsonString = "{" + ($jsonParts -join ",") + "}"

# Debug: show JSON string if debug mode is enabled
if ($Debug) {
  Write-Host "`nDebug - JSON String:" -ForegroundColor Gray
  Write-Host $jsonString -ForegroundColor Gray
  Write-Host ""
}

# Generate SHA-256 hash
try {
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonString)
  $hashBytes = $sha256.ComputeHash($bytes)
  $fingerprint = ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
  $sha256.Dispose()
} catch {
  Write-Host "`n❌ Error generating fingerprint: $_" -ForegroundColor Red
  exit 1
}

# Display fingerprint
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Device Fingerprint (SHA-256 Hash):" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host $fingerprint -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`n📋 Next Steps:" -ForegroundColor Green
Write-Host "1. Copy the device fingerprint above"
Write-Host "2. Send it to the administrator"
Write-Host "3. Administrator will generate an activation code for this device"
Write-Host "4. Install the application with the generated activation code"
Write-Host ""
Write-Host "💡 Note: Device fingerprint is a SHA-256 hash of multiple device" -ForegroundColor Yellow
Write-Host "   information (hostname, MAC addresses, CPU ID, Machine GUID, etc.)" -ForegroundColor Yellow
Write-Host "   It is NOT just the Windows Machine GUID." -ForegroundColor Yellow
Write-Host ""

# Optional: Copy to clipboard
try {
  Set-Clipboard -Value $fingerprint
  Write-Host "✅ Device fingerprint has been copied to clipboard!" -ForegroundColor Green
  Write-Host ""
} catch {
  # Clipboard operation failed, ignore
  Write-Warning "Failed to copy to clipboard: $_"
}

} catch {
  # Error handling
  Write-Host "`n❌ Error occurred:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "`nError Details:" -ForegroundColor Yellow
  Write-Host $_.Exception -ForegroundColor Red
  Write-Host "`nStack Trace:" -ForegroundColor Yellow
  Write-Host $_.ScriptStackTrace -ForegroundColor Gray
  Write-Host ""
  Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
  Write-Host "1. Make sure you're running PowerShell as Administrator (for registry access)" -ForegroundColor White
  Write-Host "2. Check if PowerShell execution policy allows script execution:" -ForegroundColor White
  Write-Host "   Get-ExecutionPolicy" -ForegroundColor Gray
  Write-Host "3. If needed, run with:" -ForegroundColor White
  Write-Host "   powershell -ExecutionPolicy Bypass -File .\scripts\get-device-fingerprint.ps1" -ForegroundColor Gray
  Write-Host "4. Try running with -Debug flag for more information:" -ForegroundColor White
  Write-Host "   .\scripts\get-device-fingerprint.ps1 -Debug" -ForegroundColor Gray
  Write-Host ""
  Pause-Script
  exit 1
}

# Pause at the end to prevent window from closing
Pause-Script
