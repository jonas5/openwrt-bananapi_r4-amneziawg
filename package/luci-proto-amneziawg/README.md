# LuCI protocol module for AmneziaWG

Provides Web UI for AmneziaWG VPN in OpenWrt LuCI.

## Features

### Core Features
- **Protocol Selection** - AmneziaWG VPN protocol for network interfaces
- **Key Generation** - Generate key pairs directly in the web UI
- **QR Code Generation** - Export configuration as QR code for mobile apps
- **Configuration Import** - Import existing WireGuard/AmneziaWG config files

### Transport Options
- **Transport Protocol** - Choose between UDP (default) and TCP
  - UDP: Standard WireGuard/AmneziaWG transport
  - TCP: Can bypass firewalls that block UDP

### Advanced Features

**Kill Switch**
- Blocks all internet traffic when VPN connection drops
- Provides privacy protection
- Located in Advanced tab

**DNS Leak Protection**
- Ensures DNS queries go through the VPN tunnel
- Configures dnsmasq to use VPN DNS only
- Prevents DNS leaks
- Located in Advanced tab

**Allowed Clients**
- Route only specific devices through the VPN
- Specify client MAC addresses
- Only listed devices will use the VPN tunnel
- Other devices use regular WAN
- Perfect for routing specific devices (TVs, consoles) through VPN
- Located in Advanced tab

## Installation

This package is part of the amneziawg-openwrt-packages feed.

Default selection in amneziawg-packages.config marks this as module (CONFIG_PACKAGE_luci-proto-amneziawg=m).

## Dependencies

- luci-base
- amneziawg-tools
- ucode
- luci-lib-uqr (for QR code generation)
- resolveip (for hostname resolution)

## Usage

1. Install the packages:
   - amneziawg-tools
   - luci-proto-amneziawg

2. Go to Network > Interfaces in LuCI

3. Click "Add new interface..."

4. Select "AmneziaWG VPN" as protocol

5. Configure your keys and settings

6. Save and Apply

## Advanced Configuration

For advanced users, the following options are available in the Advanced tab:
- MTU
- Firewall Mark
- Kill Switch
- DNS Leak Protection
- Allowed Clients (MAC addresses)
- AmneziaWG specific parameters (Jc, Jmin, Jmax, S1-S4, H1-H4, I1-I5)