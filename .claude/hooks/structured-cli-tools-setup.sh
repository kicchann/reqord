#!/bin/bash
# =============================================================================
# structured-cli-tools-setup.sh
# =============================================================================
# SessionStart hook: CLI tools auto-installation for remote environments
#
# Installs recommended CLI tools for AI-assisted coding:
#
# [Fast alternatives]
#   - fd: find alternative                        (github.com/sharkdp/fd)
#   - sd: sed alternative, intuitive syntax       (github.com/chmln/sd)
#   - fcp: cp alternative, parallel processing   (github.com/Svetlitski/fcp)
#   - choose: cut/awk alternative                 (github.com/theryangeary/choose)
#
# [Structured extraction]
#   - jq: JSON processor                          (github.com/jqlang/jq)
#   - yq: YAML/TOML/XML processor (jq-like)      (github.com/mikefarah/yq)
#   - htmlq: HTML query with CSS selectors       (github.com/mgdm/htmlq)
#   - mdq: Markdown query                         (github.com/yshavit/mdq)
#   - csvq: CSV query with SQL                   (github.com/mithrandie/csvq)
#   - rga: ripgrep for PDFs, Office, archives    (github.com/phiresky/ripgrep-all)
#
# Features:
#   - Idempotent: skips already installed tools
#   - Fail-safe: continues on failure
#   - Retry: up to 3 attempts with exponential backoff
#   - Multi-arch: x86_64 / aarch64 (arm64)
#
# Reference: https://dev.sin5d.com/バイブコーディングするならこれ入れとけ！なcli/
# =============================================================================

set -e

LOG_PREFIX="[structured-cli-tools-setup]"

log() {
    echo "$LOG_PREFIX $1" >&2
}

# Only run in remote Claude Code environment
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
    log "Not a remote session, skipping CLI tools setup"
    exit 0
fi

log "Remote session detected, checking CLI tools..."

# Setup local bin directory
LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

# Ensure PATH includes local bin
if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
    export PATH="$LOCAL_BIN:$PATH"
    if [ -n "$CLAUDE_ENV_FILE" ]; then
        echo "export PATH=\"$LOCAL_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
        log "PATH updated in CLAUDE_ENV_FILE"
    fi
fi

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        ARCH_SUFFIX="x86_64"
        ARCH_ALT="amd64"
        ;;
    aarch64|arm64)
        ARCH_SUFFIX="aarch64"
        ARCH_ALT="arm64"
        ;;
    *)
        log "Unsupported architecture: $ARCH"
        exit 0
        ;;
esac

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Curl options with proxy support
CURL_OPTS="-fsSL --connect-timeout 30 --max-time 120"
if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
    log "Using proxy: ${HTTPS_PROXY:-$HTTP_PROXY}"
    CURL_OPTS="$CURL_OPTS --proxy ${HTTPS_PROXY:-$HTTP_PROXY}"
fi

# Download with retry logic
download_with_retry() {
    local url="$1"
    local output="$2"
    local name="$3"

    for attempt in 1 2 3; do
        log "$name: Download attempt $attempt/3..."
        if curl $CURL_OPTS "$url" -o "$output"; then
            return 0
        fi
        if [ $attempt -lt 3 ]; then
            sleep_time=$((2 ** attempt))
            log "$name: Download failed, retrying in ${sleep_time}s..."
            sleep $sleep_time
        fi
    done
    return 1
}

# ============================================
# 1. htmlq - HTML query with CSS selectors
# ============================================
install_htmlq() {
    if command -v htmlq &>/dev/null; then
        log "htmlq already installed: $(htmlq --version 2>&1 | head -1)"
        return 0
    fi

    log "Installing htmlq..."

    HTMLQ_VERSION="0.4.0"
    # htmlq only provides x86_64 Linux binaries currently
    case "$ARCH_SUFFIX" in
        x86_64)
            HTMLQ_TARBALL="htmlq-x86_64-linux.tar.gz"
            ;;
        aarch64)
            log "htmlq: aarch64 not supported, skipping"
            return 0
            ;;
    esac
    HTMLQ_URL="https://github.com/mgdm/htmlq/releases/download/v${HTMLQ_VERSION}/${HTMLQ_TARBALL}"

    if download_with_retry "$HTMLQ_URL" "$TEMP_DIR/$HTMLQ_TARBALL" "htmlq"; then
        tar -xzf "$TEMP_DIR/$HTMLQ_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/htmlq" "$LOCAL_BIN/htmlq"
        chmod +x "$LOCAL_BIN/htmlq"
        log "htmlq installed successfully: $($LOCAL_BIN/htmlq --version 2>&1 | head -1)"
    else
        log "Failed to install htmlq"
    fi
}

# ============================================
# 2. fd - Fast file finder
# ============================================
install_fd() {
    if command -v fd &>/dev/null; then
        log "fd already installed: $(fd --version)"
        return 0
    fi

    log "Installing fd..."

    FD_VERSION="10.2.0"
    FD_TARBALL="fd-v${FD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl.tar.gz"
    FD_URL="https://github.com/sharkdp/fd/releases/download/v${FD_VERSION}/${FD_TARBALL}"

    if download_with_retry "$FD_URL" "$TEMP_DIR/$FD_TARBALL" "fd"; then
        tar -xzf "$TEMP_DIR/$FD_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/fd-v${FD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl/fd" "$LOCAL_BIN/fd"
        chmod +x "$LOCAL_BIN/fd"
        log "fd installed successfully: $($LOCAL_BIN/fd --version)"
    else
        log "Failed to install fd"
    fi
}

# ============================================
# 3. sd - Fast sed alternative
# ============================================
install_sd() {
    if command -v sd &>/dev/null; then
        log "sd already installed: $(sd --version)"
        return 0
    fi

    log "Installing sd..."

    SD_VERSION="1.0.0"
    SD_TARBALL="sd-v${SD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl.tar.gz"
    SD_URL="https://github.com/chmln/sd/releases/download/v${SD_VERSION}/${SD_TARBALL}"

    if download_with_retry "$SD_URL" "$TEMP_DIR/$SD_TARBALL" "sd"; then
        tar -xzf "$TEMP_DIR/$SD_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/sd-v${SD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl/sd" "$LOCAL_BIN/sd"
        chmod +x "$LOCAL_BIN/sd"
        log "sd installed successfully: $($LOCAL_BIN/sd --version)"
    else
        log "Failed to install sd"
    fi
}

# ============================================
# 4. mdq - Markdown query tool
# ============================================
install_mdq() {
    if command -v mdq &>/dev/null; then
        log "mdq already installed: $(mdq --version)"
        return 0
    fi

    log "Installing mdq..."

    MDQ_VERSION="0.9.0"
    # mdq only provides x64 Linux binaries currently
    case "$ARCH_SUFFIX" in
        x86_64)
            MDQ_TARBALL="mdq-linux-x64-musl.tar.gz"
            ;;
        aarch64)
            log "mdq: aarch64 not supported, skipping"
            return 0
            ;;
    esac
    MDQ_URL="https://github.com/yshavit/mdq/releases/download/v${MDQ_VERSION}/${MDQ_TARBALL}"

    if download_with_retry "$MDQ_URL" "$TEMP_DIR/$MDQ_TARBALL" "mdq"; then
        tar -xzf "$TEMP_DIR/$MDQ_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/mdq" "$LOCAL_BIN/mdq"
        chmod +x "$LOCAL_BIN/mdq"
        log "mdq installed successfully: $($LOCAL_BIN/mdq --version)"
    else
        log "Failed to install mdq"
    fi
}

# ============================================
# 5. fcp - Fast file copy
# ============================================
install_fcp() {
    if command -v fcp &>/dev/null; then
        log "fcp already installed: $(fcp --version 2>&1 | head -1)"
        return 0
    fi

    log "Installing fcp..."

    FCP_VERSION="0.2.1"
    case "$ARCH_SUFFIX" in
        x86_64)
            FCP_ZIP="fcp-${FCP_VERSION}-x86_64-unknown-linux-musl.zip"
            FCP_BIN="fcp-${FCP_VERSION}-x86_64-unknown-linux-musl"
            ;;
        aarch64)
            FCP_ZIP="fcp-${FCP_VERSION}-aarch64-unknown-linux-gnu.zip"
            FCP_BIN="fcp-${FCP_VERSION}-aarch64-unknown-linux-gnu"
            ;;
    esac
    FCP_URL="https://github.com/Svetlitski/fcp/releases/download/v${FCP_VERSION}/${FCP_ZIP}"

    if download_with_retry "$FCP_URL" "$TEMP_DIR/$FCP_ZIP" "fcp"; then
        unzip -q "$TEMP_DIR/$FCP_ZIP" -d "$TEMP_DIR"
        mv "$TEMP_DIR/$FCP_BIN" "$LOCAL_BIN/fcp"
        chmod +x "$LOCAL_BIN/fcp"
        log "fcp installed successfully"
    else
        log "Failed to install fcp"
    fi
}

# ============================================
# 6. choose - Fast field selection (cut alternative)
# ============================================
install_choose() {
    if command -v choose &>/dev/null; then
        log "choose already installed: $(choose --version 2>&1 | head -1)"
        return 0
    fi

    log "Installing choose..."

    CHOOSE_VERSION="1.3.7"
    case "$ARCH_SUFFIX" in
        x86_64)
            CHOOSE_FILE="choose-x86_64-unknown-linux-musl"
            ;;
        aarch64)
            CHOOSE_FILE="choose-aarch64-unknown-linux-gnu"
            ;;
    esac
    CHOOSE_URL="https://github.com/theryangeary/choose/releases/download/v${CHOOSE_VERSION}/${CHOOSE_FILE}"

    if download_with_retry "$CHOOSE_URL" "$LOCAL_BIN/choose" "choose"; then
        chmod +x "$LOCAL_BIN/choose"
        log "choose installed successfully: $($LOCAL_BIN/choose --version 2>&1 | head -1)"
    else
        log "Failed to install choose"
    fi
}

# ============================================
# 7. ripgrep-all (rga) - ripgrep for PDFs, archives, etc.
# ============================================
install_rga() {
    if command -v rga &>/dev/null; then
        log "rga already installed: $(rga --version 2>&1 | head -1)"
        return 0
    fi

    log "Installing ripgrep-all..."

    RGA_VERSION="0.10.10"
    case "$ARCH_SUFFIX" in
        x86_64)
            RGA_TARBALL="ripgrep_all-v${RGA_VERSION}-x86_64-unknown-linux-musl.tar.gz"
            RGA_DIR="ripgrep_all-v${RGA_VERSION}-x86_64-unknown-linux-musl"
            ;;
        aarch64)
            RGA_TARBALL="ripgrep_all-v${RGA_VERSION}-aarch64-unknown-linux-gnu.tar.gz"
            RGA_DIR="ripgrep_all-v${RGA_VERSION}-aarch64-unknown-linux-gnu"
            ;;
    esac
    RGA_URL="https://github.com/phiresky/ripgrep-all/releases/download/v${RGA_VERSION}/${RGA_TARBALL}"

    if download_with_retry "$RGA_URL" "$TEMP_DIR/$RGA_TARBALL" "rga"; then
        tar -xzf "$TEMP_DIR/$RGA_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/$RGA_DIR/rga" "$LOCAL_BIN/rga"
        chmod +x "$LOCAL_BIN/rga"
        # Also install rga-preproc if available
        if [ -f "$TEMP_DIR/$RGA_DIR/rga-preproc" ]; then
            mv "$TEMP_DIR/$RGA_DIR/rga-preproc" "$LOCAL_BIN/rga-preproc"
            chmod +x "$LOCAL_BIN/rga-preproc"
        fi
        log "rga installed successfully: $($LOCAL_BIN/rga --version 2>&1 | head -1)"
    else
        log "Failed to install rga"
    fi
}

# ============================================
# 8. yq - YAML/TOML/XML processor (jq-like syntax)
# ============================================
install_yq() {
    # Check if mikefarah/yq is installed (not kislyuk/yq)
    if [ -x "$LOCAL_BIN/yq" ]; then
        log "yq already installed: $($LOCAL_BIN/yq --version 2>&1 | head -1)"
        return 0
    fi

    log "Installing yq (mikefarah/yq)..."

    YQ_VERSION="4.44.3"
    case "$ARCH_SUFFIX" in
        x86_64)
            YQ_FILE="yq_linux_amd64"
            ;;
        aarch64)
            YQ_FILE="yq_linux_arm64"
            ;;
    esac
    YQ_URL="https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/${YQ_FILE}"

    if download_with_retry "$YQ_URL" "$LOCAL_BIN/yq" "yq"; then
        chmod +x "$LOCAL_BIN/yq"
        log "yq installed successfully: $($LOCAL_BIN/yq --version 2>&1 | head -1)"
    else
        log "Failed to install yq"
    fi
}

# ============================================
# 9. csvq - CSV query with SQL syntax
# ============================================
install_csvq() {
    if command -v csvq &>/dev/null; then
        log "csvq already installed: $(csvq --version 2>&1 | head -1)"
        return 0
    fi

    log "Installing csvq..."

    CSVQ_VERSION="1.18.1"
    case "$ARCH_SUFFIX" in
        x86_64)
            CSVQ_TARBALL="csvq-v${CSVQ_VERSION}-linux-amd64.tar.gz"
            CSVQ_DIR="csvq-v${CSVQ_VERSION}-linux-amd64"
            ;;
        aarch64)
            CSVQ_TARBALL="csvq-v${CSVQ_VERSION}-linux-arm64.tar.gz"
            CSVQ_DIR="csvq-v${CSVQ_VERSION}-linux-arm64"
            ;;
    esac
    CSVQ_URL="https://github.com/mithrandie/csvq/releases/download/v${CSVQ_VERSION}/${CSVQ_TARBALL}"

    if download_with_retry "$CSVQ_URL" "$TEMP_DIR/$CSVQ_TARBALL" "csvq"; then
        tar -xzf "$TEMP_DIR/$CSVQ_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/$CSVQ_DIR/csvq" "$LOCAL_BIN/csvq"
        chmod +x "$LOCAL_BIN/csvq"
        log "csvq installed successfully: $($LOCAL_BIN/csvq --version 2>&1 | head -1)"
    else
        log "Failed to install csvq"

# ============================================
# Run installations
# ============================================
log "Starting CLI tools installation..."
install_yq
install_htmlq
install_fd
install_sd
install_mdq
install_fcp
install_choose
install_rga
install_csvq

log "CLI tools setup complete"
exit 0
