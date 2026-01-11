#!/bin/bash

# Device Fingerprint Getter for Linux/macOS (Bash)
#
# Standalone bash script to get device fingerprint without installing the application.
# This script generates the same device fingerprint as the Node.js version.
#
# Usage:
#   bash scripts/get-device-fingerprint.sh
#   chmod +x scripts/get-device-fingerprint.sh && ./scripts/get-device-fingerprint.sh
#
# Or run directly:
#   bash scripts/get-device-fingerprint.sh
#   bash scripts/get-device-fingerprint.sh --debug

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Parse arguments
DEBUG=false
HELP=false

for arg in "$@"; do
  case $arg in
    --debug|-d)
      DEBUG=true
      ;;
    --help|-h|help)
      HELP=true
      ;;
  esac
done

# Show help
if [ "$HELP" = true ]; then
  cat << EOF
Device Fingerprint Getter for Linux/macOS

This script collects device information and generates a SHA-256 hash
that matches the fingerprint used by the application.

Usage:
  bash scripts/get-device-fingerprint.sh
  bash scripts/get-device-fingerprint.sh --debug

Options:
  --help, -h    Show this help message
  --debug, -d   Show debug information (JSON string, etc.)

The device fingerprint is a SHA-256 hash of:
- Hostname
- Platform and Architecture
- MAC Addresses (all network interfaces)
- CPU ID (Linux/macOS)
- Machine ID (Linux)

Note: This script requires bash 3.0 or later.
EOF
  exit 0
fi

# Function to print colored output
print_info() {
  echo -e "${CYAN}$1${NC}"
}

print_success() {
  echo -e "${GREEN}$1${NC}"
}

print_warning() {
  echo -e "${YELLOW}$1${NC}"
}

print_error() {
  echo -e "${RED}$1${NC}"
}

print_header() {
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}============================================================${NC}"
}

# Function to detect platform
detect_platform() {
  case "$(uname -s)" in
    Linux*)
      echo "linux"
      ;;
    Darwin*)
      echo "darwin"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

# Function to detect architecture
detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)
      echo "x64"
      ;;
    i386|i686)
      echo "x86"
      ;;
    arm64|aarch64)
      echo "arm64"
      ;;
    arm*)
      echo "arm"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

# Function to get MAC addresses
get_mac_addresses() {
  local mac_addresses=()
  local platform=$(detect_platform)
  
  if [ "$platform" = "linux" ]; then
    # Linux: use ip command or ifconfig
    if command -v ip >/dev/null 2>&1; then
      # Use ip command (preferred)
      while IFS= read -r line; do
        if [[ $line =~ link/ether[[:space:]]+([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}) ]]; then
          mac="${BASH_REMATCH[1]}"
          mac_lower=$(echo "$mac" | tr '[:upper:]' '[:lower:]')
          if [ "$mac_lower" != "00:00:00:00:00:00" ]; then
            mac_addresses+=("$mac_lower")
          fi
        fi
      done < <(ip link show 2>/dev/null)
    elif command -v ifconfig >/dev/null 2>&1; then
      # Fallback to ifconfig
      while IFS= read -r line; do
        if [[ $line =~ HWaddr[[:space:]]+([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}) ]] || \
           [[ $line =~ ether[[:space:]]+([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}) ]]; then
          mac="${BASH_REMATCH[1]}"
          mac_lower=$(echo "$mac" | tr '[:upper:]' '[:lower:]')
          if [ "$mac_lower" != "00:00:00:00:00:00" ]; then
            mac_addresses+=("$mac_lower")
          fi
        fi
      done < <(ifconfig 2>/dev/null)
    fi
  elif [ "$platform" = "darwin" ]; then
    # macOS: use networksetup or ifconfig
    if command -v networksetup >/dev/null 2>&1; then
      # Use networksetup (preferred for macOS)
      while IFS= read -r interface; do
        mac=$(networksetup -getmacaddress "$interface" 2>/dev/null | awk '{print $3}')
        if [ -n "$mac" ] && [ "$mac" != "N/A" ]; then
          mac_lower=$(echo "$mac" | tr '[:upper:]' '[:lower:]')
          if [ "$mac_lower" != "00:00:00:00:00:00" ]; then
            mac_addresses+=("$mac_lower")
          fi
        fi
      done < <(networksetup -listallhardwareports | grep "Hardware Port:" | awk -F': ' '{print $2}')
    elif command -v ifconfig >/dev/null 2>&1; then
      # Fallback to ifconfig
      while IFS= read -r line; do
        if [[ $line =~ ether[[:space:]]+([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}) ]]; then
          mac="${BASH_REMATCH[1]}"
          mac_lower=$(echo "$mac" | tr '[:upper:]' '[:lower:]')
          if [ "$mac_lower" != "00:00:00:00:00:00" ]; then
            mac_addresses+=("$mac_lower")
          fi
        fi
      done < <(ifconfig 2>/dev/null)
    fi
  fi
  
  # Sort and return unique MAC addresses
  printf '%s\n' "${mac_addresses[@]}" | sort -u
}

# Function to get CPU ID (Linux)
get_cpu_id_linux() {
  if [ -f /proc/cpuinfo ]; then
    # Try to get unique CPU identifier
    # On Linux, we can use serial number or model name + stepping
    if grep -q "Serial" /proc/cpuinfo 2>/dev/null; then
      grep "Serial" /proc/cpuinfo | head -1 | awk -F': ' '{print $2}' | tr -d ' '
    elif grep -q "model name" /proc/cpuinfo 2>/dev/null; then
      # Use model name + stepping as fallback
      model=$(grep "model name" /proc/cpuinfo | head -1 | awk -F': ' '{print $2}' | tr -d ' ')
      stepping=$(grep "stepping" /proc/cpuinfo | head -1 | awk -F': ' '{print $2}' | tr -d ' ')
      if [ -n "$model" ] && [ -n "$stepping" ]; then
        echo "${model}-${stepping}"
      fi
    fi
  fi
}

# Function to get CPU ID (macOS)
get_cpu_id_darwin() {
  if command -v sysctl >/dev/null 2>&1; then
    # Get CPU brand string
    sysctl -n machdep.cpu.brand_string 2>/dev/null || echo ""
  fi
}

# Function to get Machine ID (Linux)
get_machine_id_linux() {
  if [ -f /etc/machine-id ]; then
    cat /etc/machine-id 2>/dev/null | tr -d '\n'
  elif [ -f /var/lib/dbus/machine-id ]; then
    cat /var/lib/dbus/machine-id 2>/dev/null | tr -d '\n'
  fi
}

# Function to generate JSON string (sorted keys)
generate_json() {
  local hostname="$1"
  local platform="$2"
  local arch="$3"
  local mac_addresses=("${@:4}")
  local cpu_info="$5"
  local machine_id="$6"
  
  # Build JSON manually to match Node.js JSON.stringify behavior
  local json_parts=()
  
  # Add arch
  json_parts+=("\"arch\":\"$arch\"")
  
  # Add hostname
  json_parts+=("\"hostname\":\"$hostname\"")
  
  # Add MAC addresses (as array)
  if [ ${#mac_addresses[@]} -gt 0 ]; then
    local mac_array=""
    for mac in "${mac_addresses[@]}"; do
      if [ -n "$mac_array" ]; then
        mac_array="$mac_array,"
      fi
      mac_array="${mac_array}\"$mac\""
    done
    json_parts+=("\"macAddresses\":[$mac_array]")
  else
    json_parts+=("\"macAddresses\":[]")
  fi
  
  # Add platform
  json_parts+=("\"platform\":\"$platform\"")
  
  # Add CPU info if available
  if [ -n "$cpu_info" ]; then
    # Escape quotes in cpu_info
    cpu_info_escaped=$(echo "$cpu_info" | sed 's/"/\\"/g')
    json_parts+=("\"cpuInfo\":\"$cpu_info_escaped\"")
  fi
  
  # Add machine ID if available (Linux only)
  if [ -n "$machine_id" ]; then
    json_parts+=("\"machineId\":\"$machine_id\"")
  fi
  
  # Join with commas
  local json="{"
  local first=true
  for part in "${json_parts[@]}"; do
    if [ "$first" = true ]; then
      first=false
    else
      json="$json,"
    fi
    json="$json$part"
  done
  json="$json}"
  
  echo "$json"
}

# Function to calculate SHA-256 hash
calculate_sha256() {
  local input="$1"
  
  if command -v sha256sum >/dev/null 2>&1; then
    # Linux
    echo -n "$input" | sha256sum | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    # macOS
    echo -n "$input" | shasum -a 256 | awk '{print $1}'
  elif command -v openssl >/dev/null 2>&1; then
    # Fallback to openssl
    echo -n "$input" | openssl dgst -sha256 | awk '{print $2}'
  else
    print_error "Error: No SHA-256 tool found (sha256sum, shasum, or openssl)"
    exit 1
  fi
}

# Main execution
main() {
  print_header "Device Fingerprint Getter"
  echo ""
  print_info "Collecting device information...\n"
  
  # Collect device information
  local hostname=$(hostname 2>/dev/null || echo "unknown")
  local platform=$(detect_platform)
  local arch=$(detect_arch)
  
  # Get MAC addresses
  local mac_addresses=()
  while IFS= read -r mac; do
    if [ -n "$mac" ]; then
      mac_addresses+=("$mac")
    fi
  done < <(get_mac_addresses)
  
  # Get CPU info
  local cpu_info=""
  if [ "$platform" = "linux" ]; then
    cpu_info=$(get_cpu_id_linux)
  elif [ "$platform" = "darwin" ]; then
    cpu_info=$(get_cpu_id_darwin)
  fi
  
  # Get Machine ID (Linux only)
  local machine_id=""
  if [ "$platform" = "linux" ]; then
    machine_id=$(get_machine_id_linux)
  fi
  
  # Display collected information
  print_info "Device Information:"
  echo "  Hostname: $hostname"
  echo "  Platform: $platform"
  echo "  Architecture: $arch"
  echo "  MAC Addresses: ${#mac_addresses[@]} found"
  if [ -n "$cpu_info" ]; then
    echo "  CPU ID: $cpu_info"
  fi
  if [ -n "$machine_id" ]; then
    echo "  Machine ID: $machine_id"
  fi
  
  # Generate JSON string
  local json_string=$(generate_json "$hostname" "$platform" "$arch" "${mac_addresses[@]}" "$cpu_info" "$machine_id")
  
  # Debug: show JSON string if debug mode is enabled
  if [ "$DEBUG" = true ]; then
    echo ""
    print_info "Debug - JSON String:"
    echo -e "${GRAY}$json_string${NC}"
    echo ""
  fi
  
  # Generate SHA-256 hash
  local fingerprint=$(calculate_sha256 "$json_string")
  
  # Display fingerprint
  echo ""
  print_header "Device Fingerprint (SHA-256 Hash):"
  echo -e "${WHITE}$fingerprint${NC}"
  print_header ""
  
  echo ""
  print_success "📋 Next Steps:"
  echo "1. Copy the device fingerprint above"
  echo "2. Send it to the administrator"
  echo "3. Administrator will generate an activation code for this device"
  echo "4. Install the application with the generated activation code"
  echo ""
  print_warning "💡 Note: Device fingerprint is a SHA-256 hash of multiple device"
  echo "   information (hostname, MAC addresses, CPU ID, Machine GUID, etc.)"
  echo "   It is NOT just the Machine ID."
  echo ""
  
  # Try to copy to clipboard (if available)
  if command -v xclip >/dev/null 2>&1; then
    # Linux with xclip
    echo -n "$fingerprint" | xclip -selection clipboard 2>/dev/null && print_success "✅ Device fingerprint has been copied to clipboard!" && echo ""
  elif command -v xsel >/dev/null 2>&1; then
    # Linux with xsel
    echo -n "$fingerprint" | xsel --clipboard --input 2>/dev/null && print_success "✅ Device fingerprint has been copied to clipboard!" && echo ""
  elif command -v pbcopy >/dev/null 2>&1; then
    # macOS
    echo -n "$fingerprint" | pbcopy 2>/dev/null && print_success "✅ Device fingerprint has been copied to clipboard!" && echo ""
  fi
}

# Run main function
main "$@"
