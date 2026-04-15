#
# Copyright (C) 2016 Dan Luedtke <mail@danrl.com>
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

PKG_MAINTAINER:=Amnezia Admin <admin@amnezia.org>
PKG_VERSION:=2.0.4
PKG_RELEASE:=1
LUCI_TITLE:=Support for AmneziaWG VPN
LUCI_DESCRIPTION:=Provides support and Web UI for AmneziaWG VPN
LUCI_DEPENDS:=+amneziawg-tools +ucode +luci-lib-uqr +resolveip
LUCI_PKGARCH:=all
PKGARCH:=all
PKG_LICENSE:=Apache-2.0

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
