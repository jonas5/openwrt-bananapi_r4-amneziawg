# AmneziaWG OpenWrt Packages

This repository contains the OpenWrt package directories for AmneziaWG VPN:

- **package/amneziawg-tools** - Userspace control program (`awg`) and netifd protocol helper
- **package/luci-proto-amneziawg** - LuCI Web UI for AmneziaWG
- **package/kmod-amneziawg** - Linux kernel module (optional)

## Features

### Core Features
- **AmneziaWG VPN Protocol** - Full AmneziaWG support in OpenWrt
- **Userspace Tool** - `awg` command line tool for managing the VPN
- **Web UI** - Configure interfaces via LuCI (OpenWrt web interface)
- **Key Management** - Generate key pairs in the web UI
- **Configuration Import** - Import existing .conf files
- **QR Code Export** - Generate QR codes for mobile app configuration

### Transport Options
- **UDP** (default) - Standard AmneziaWG transport
- **TCP** - Can bypass firewalls that block UDP

### Advanced Features

**Kill Switch**
- Blocks all internet traffic when VPN connection drops
- Located in Advanced tab

**DNS Leak Protection**
- Ensures DNS queries go through the VPN tunnel
- Configures dnsmasq to use VPN DNS only
- Located in Advanced tab

**Allowed Clients**
- Route only specific devices through the VPN
- Specify client MAC addresses
- Other devices use regular WAN
- Perfect for routing specific devices (TVs, consoles) through VPN
- Located in Advanced tab

**AmneziaWG Specific Parameters**
- Jc (Junk packet count)
- Jmin (Junk packet minimum size)
- Jmax (Junk packet maximum size)
- S1-S4 (Handshake packet sizes)
- H1-H4 (Handshake packet type headers)
- I1-I5 (Special junk packet signatures)

## Usage (Local Build)

1. Edit `compile_openwrt.sh` as needed
2. Run `./compile_openwrt.sh`
3. The script will clone OpenWrt if not provided and copy these package directories into the OpenWrt tree before building

## Installation (Pre-built)

Install the packages on your OpenWrt device:

```bash
# Add the amneziawg feed (if not already added)
opkg update
opkg install amneziawg-tools luci-proto-amneziawg

# Or with APK (for newer OpenWrt versions)
apk add amneziawg-tools luci-proto-amneziawg
```

## Configuration via Web UI

1. Go to **Network > Interfaces**
2. Click **Add new interface...**
3. Select **AmneziaWG VPN** as the protocol
4. Configure your keys and settings:
   - Private Key (or generate new)
   - Listen Port (optional)
   - Transport (UDP/TCP)
5. In **Advanced** tab:
   - Kill Switch
   - DNS Leak Protection
   - Allowed Clients (MAC addresses)
6. Add peers in the Peers tab
7. Save and Apply

## Using Allowed Clients Feature

To route only specific devices through the VPN:

1. Go to your device's network settings
2. Note the device's MAC address (e.g., `AA:BB:CC:DD:EE:FF`)
3. In AmneziaWG interface settings, go to **Advanced** tab
4. Enter the MAC address in **Allowed Clients** field
5. Only that device will use the VPN - other devices will use regular WAN

## Package Structure

```
package/
├── amneziawg-tools/
│   ├── files/amneziawg.sh      # netifd protocol helper
│   ├── files/amneziawg_watchdog # DNS re-resolve watchdog
│   └── Makefile
├── luci-proto-amneziawg/
│   ├── htdocs/luci-static/resources/protocol/amneziawg.js  # Web UI protocol
│   ├── root/usr/share/luci/menu.d/luci-proto-amneziawg.json
│   └── Makefile
└── kmod-amneziawg/
    └── Makefile   # Linux kernel module
```