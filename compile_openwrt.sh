#!/bin/bash

set -e

# When running from the package-only repository this script will use the repository
# root as the build workspace and will clone OpenWrt into ./openwrt-main if needed.

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="${BUILD_DIR:-$REPO_DIR}"
PARALLEL_JOBS=52
LUCI_PACKAGES=""

ARCH_NAME="mediatek_filogic_bananapi_bpi-r4"
TARGET_PATH="mediatek/filogic/bananapi_bpi-r4"

OPENWRT_DIR="$BUILD_DIR/openwrt-bananapi"
# Artifact directory (used by CI/workflows). Can be overridden by env var.
ARTIFACT_DIR="${ARTIFACT_DIR:-$OPENWRT_DIR/artifacts}"

setup_packages() {
    mkdir -p "$OPENWRT_DIR/package"
    for pkg in $LUCI_PACKAGES; do
        if [ -d "$BUILD_DIR/$pkg" ]; then
            pkg_name=$(basename "$pkg")
            rm -rf "$OPENWRT_DIR/package/$pkg_name"
            cp -a "$BUILD_DIR/$pkg" "$OPENWRT_DIR/package/$pkg_name"
            echo "  Copied $pkg_name"
        fi
    done

    # Also copy any local package/* directories from the repository root (useful for standalone package repos)
    if [ -d "$BUILD_DIR/package" ]; then
        echo "  Copying local repository package/* into OpenWrt tree"
        for d in "$BUILD_DIR"/package/*; do
            [ -d "$d" ] || continue
            name=$(basename "$d")
            # Skip if we already copied via LUCI_PACKAGES list
            if [ -d "$OPENWRT_DIR/package/$name" ]; then
                echo "    Skipping $name (already present)"
                continue
            fi
            echo "    Copying $name"
            cp -a "$d" "$OPENWRT_DIR/package/$name"
        done
    fi
}

echo ""
echo "=========================================="
echo "Building: $ARCH_NAME ($TARGET_PATH)"
echo "Jobs: $PARALLEL_JOBS"
echo "=========================================="

if [ -d "$OPENWRT_DIR" ]; then
    echo "  Reusing existing directory..."
else
    # Allow overriding the OpenWrt source path via OPENWRT_SRC (useful for CI)
    # If OPENWRT_SRC is provided but its parent directory is not writable (eg. '/openwrt-main'),
    # fall back to cloning into the workspace under $BUILD_DIR/openwrt-main.
    PROVIDED_OPENWRT_SRC="${OPENWRT_SRC:-}"
    if [ -n "$PROVIDED_OPENWRT_SRC" ]; then
        PARENT_DIR=$(dirname "$PROVIDED_OPENWRT_SRC")
        if [ -d "$PROVIDED_OPENWRT_SRC" ]; then
            OPENWRT_SRC="$PROVIDED_OPENWRT_SRC"
        elif [ -w "$PARENT_DIR" ]; then
            OPENWRT_SRC="$PROVIDED_OPENWRT_SRC"
        else
            echo "  WARNING: provided OPENWRT_SRC parent ($PARENT_DIR) is not writable. Falling back to workspace path."
            OPENWRT_SRC="$BUILD_DIR/openwrt-main"
        fi
    else
        OPENWRT_SRC="$BUILD_DIR/openwrt-main"
    fi

    if [ -d "$OPENWRT_SRC" ]; then
        echo "  Copying OpenWrt source from $OPENWRT_SRC"
        cp -r "$OPENWRT_SRC" "$OPENWRT_DIR"
    else
        echo "  OpenWrt source not found at $OPENWRT_SRC - attempting to git clone official repo"
        git clone --depth 1 https://git.openwrt.org/openwrt/openwrt.git "$OPENWRT_SRC" || {
            echo "  ERROR: could not clone OpenWrt source to $OPENWRT_SRC"
            exit 1
        }
        echo "  Copying OpenWrt source from $OPENWRT_SRC"
        cp -r "$OPENWRT_SRC" "$OPENWRT_DIR"
    fi
fi

cd "$OPENWRT_DIR"
# Using cloned source; skip git operations since the working copy may not be a git repo

setup_packages

echo "  > Updating feeds..."
./scripts/feeds update -a && ./scripts/feeds install -a

echo "  > Downloading config..."
if ! wget -4 "https://downloads.openwrt.org/releases/${OPENWRT_VERSION:-latest}/targets/${TARGET_PATH}/config.buildinfo" -O .config 2>/dev/null; then
    echo "  WARNING: Could not download config, using defconfig"
    make defconfig
fi

if [ -f "$BUILD_DIR/amneziawg-openwrt-packages/amneziawg-packages.config" ]; then
    echo "  > Using package config from amneziawg-openwrt-packages/amneziawg-packages.config"
    cat "$BUILD_DIR/amneziawg-openwrt-packages/amneziawg-packages.config" >> .config
else
cat >> .config << 'AMNEZWG_EOF'
CONFIG_PACKAGE_kmod-amneziawg=m
CONFIG_PACKAGE_amneziawg-tools=m
CONFIG_PACKAGE_luci-proto-amneziawg=m
CONFIG_PACKAGE_kmod-crypto-lib-chacha20=m
CONFIG_PACKAGE_kmod-crypto-lib-chacha20poly1305=m
CONFIG_PACKAGE_kmod-crypto-lib-curve25519=m
CONFIG_PACKAGE_ethtool=m
AMNEZWG_EOF
fi

mkdir -p ./target/linux/mediatek/patches-6.6
cp "$BUILD_DIR/001-add-sfp-quirk.patch" ./target/linux/mediatek/patches-6.6/ 2>/dev/null || true

make defconfig

echo "  > make tools/install -j$PARALLEL_JOBS"
make tools/install -j$PARALLEL_JOBS

echo "  > make toolchain/install -j$PARALLEL_JOBS"
make toolchain/install -j$PARALLEL_JOBS

echo "  > make target/linux/compile -j$PARALLEL_JOBS"
make target/linux/compile -j$PARALLEL_JOBS

echo "  > make package/luci-proto-amneziawg/compile -j$PARALLEL_JOBS"
make package/luci-proto-amneziawg/{clean,download,prepare} V=s
make package/luci-proto-amneziawg/compile -j$PARALLEL_JOBS

echo "  > make package/kmod-amneziawg/compile -j$PARALLEL_JOBS"
make package/kmod-amneziawg/{clean,download,prepare} V=s || true
make package/kmod-amneziawg/compile -j$PARALLEL_JOBS V=s

echo "  > make package/amneziawg-tools/compile -j$PARALLEL_JOBS"
make package/amneziawg-tools/{clean,download,prepare} V=s
make package/amneziawg-tools/compile -j$PARALLEL_JOBS

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="
find bin -name "*amneziawg*" -o -name "*kmod*" 2>/dev/null | head -20

# Collect APKs into artifact dir for CI
echo "\nCollecting APKs into artifacts directory: $ARTIFACT_DIR"
mkdir -p "$ARTIFACT_DIR"

# Copy package APKS under bin/packages
echo "  > Copying package apks from bin/packages..."
if [ -d "$OPENWRT_DIR/bin/packages" ]; then
  find "$OPENWRT_DIR/bin/packages" -type f \( -iname "*amneziawg*.apk" -o -iname "*kmod-amneziawg*.apk" \) -print -exec cp -a {} "$ARTIFACT_DIR" \; || true
fi

# Copy kernel/target-specific APKS under bin/targets
echo "  > Copying target apks from bin/targets..."
if [ -d "$OPENWRT_DIR/bin/targets" ]; then
  find "$OPENWRT_DIR/bin/targets" -type f -iname "*kmod-amneziawg*.apk" -print -exec cp -a {} "$ARTIFACT_DIR" \; || true
fi

# Create a tar.xz archive containing the found APKs (if any)
cd "$ARTIFACT_DIR"
APK_COUNT=$(ls -1 *.apk 2>/dev/null | wc -l || true)
if [ "$APK_COUNT" -gt 0 ]; then
  ARCHIVE_NAME="amneziawg-packages-$(echo "$TARGET_PATH" | tr '/ ' '-' ).tar.xz"
  echo "  > Creating archive: $ARCHIVE_NAME"
  # Use xz compression; overwrite if exists
  tar -cJf "$ARCHIVE_NAME" --force-local --ignore-failed-read *.apk || true
  echo "Artifacts prepared:"
  ls -lah
else
  echo "  > No APKs found to archive."
fi

echo ""
echo "Output in: $OPENWRT_DIR/bin"
