# AmneziaWG Tools

This package provides the AmneziaWG userspace tools for OpenWrt.

## Components

### awg (Command Line Tool)
The `awg` command line tool for managing AmneziaWG interfaces.

```bash
# Generate a key pair
awg genkey | awg pubkey

# Show interface status
awg show <interface>

# Get help
awg --help
```

### netifd Protocol Helper (`amneziawg.sh`)
Located at `/lib/netifd/proto/amneziawg.sh`, this script handles:
- Interface setup and teardown
- Peer configuration
- Route management
- Kill switch functionality
- DNS leak protection
- Client-based routing (Allowed Clients)

### Watchdog (`amneziawg_watchdog`)
Located at `/usr/bin/amneziawg_watchdog`, handles DNS re-resolution for the VPN tunnel.

## Configuration Options

The proto helper supports the following UCI options:

| Option | Type | Description |
|--------|------|-------------|
| `private_key` | string | Base64-encoded private key |
| `public_key` | string | Base64-encoded public key |
| `listen_port` | port | UDP/TCP listen port |
| `addresses` | list | Interface IP addresses |
| `mtu` | integer | Interface MTU |
| `fwmark` | hex | Firewall mark |
| `transport` | string | `udp` or `tcp` |
| `kill_switch` | bool | Enable kill switch |
| `dns_leak_protection` | bool | Enable DNS leak protection |
| `allowed_clients` | list | MAC addresses for per-client routing |
| `awg_jc`, `awg_jmin`, `awg_jmax` | integer | Junk packet parameters |
| `awg_s1`-`awg_s4` | integer | Handshake packet sizes |
| `awg_h1`-`awg_h4` | string | Handshake packet type headers |
| `awg_i1`-`awg_i5` | string | Special junk packet signatures |

## Examples

### Basic Configuration via UCI

```bash
# Create interface
uci set network.wgtest=interface
uci set network.wgtest.proto='amneziawg'
uci set network.wgtest.private_key='YOUR_PRIVATE_KEY'
uci set network.wgtest.listen_port='51820'
uci set network.wgtest.addresses='10.0.0.2/24'
uci commit network
```

### With TCP Transport

```bash
uci set network.wgtest.transport='tcp'
```

### With Kill Switch

```bash
uci set network.wgtest.kill_switch='1'
```

### With Allowed Clients (per-device routing)

```bash
# Only route specific devices through VPN (by MAC address)
uci set network.wgtest.allowed_clients='AA:BB:CC:DD:EE:FF 11:22:33:44:55:66'
```

## Usage

This repository is intended to be a packages-only repository. The default build config in
amneziawg-packages.config marks this package as a module (CONFIG_PACKAGE_amneziawg-tools=m).