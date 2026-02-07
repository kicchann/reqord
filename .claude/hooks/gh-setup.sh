#!/bin/bash
# This is sample script, and you should verify your own.
# SessionStart hook: GitHub CLI auto-installation for remote environments
# This script installs gh CLI when running in Claude Code on the Web
# following best practices: idempotent, fail-safe, proper logging

set -e

LOG_PREFIX="[gh-setup]"

log() {
    echo "$LOG_PREFIX $1" >&2
}

# Only run in remote Claude Code environment
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
    log "Not a remote session, skipping gh setup"
    exit 0
fi

log "Remote session detected, checking gh CLI..."

# Check if gh is already available
if command -v gh &>/dev/null; then
    log "gh CLI already available: $(gh --version | head -1)"
    exit 0
fi

# Setup local bin directory
LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

# Check if gh exists in local bin
if [ -x "$LOCAL_BIN/gh" ]; then
    log "gh found in $LOCAL_BIN"
    # Ensure PATH includes local bin
    if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
        export PATH="$LOCAL_BIN:$PATH"
        # Persist to CLAUDE_ENV_FILE if available
        if [ -n "$CLAUDE_ENV_FILE" ]; then
            echo "export PATH=\"$LOCAL_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
            log "PATH updated in CLAUDE_ENV_FILE"
        fi
    fi
    exit 0
fi

log "Installing gh CLI to $LOCAL_BIN..."

# Create temp directory for installation
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        GH_ARCH="amd64"
        ;;
    aarch64|arm64)
        GH_ARCH="arm64"
        ;;
    *)
        log "Unsupported architecture: $ARCH"
        exit 0  # Fail-safe: exit 0 even on failure
        ;;
esac

# Download and install gh CLI
GH_VERSION="2.63.2"
GH_TARBALL="gh_${GH_VERSION}_linux_${GH_ARCH}.tar.gz"
GH_URL="https://github.com/cli/cli/releases/download/v${GH_VERSION}/${GH_TARBALL}"

log "Downloading gh v${GH_VERSION} for ${GH_ARCH}..."

# Build curl options with proxy support if available
CURL_OPTS="-fsSL --connect-timeout 30 --max-time 120"
if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
    log "Using proxy: ${HTTPS_PROXY:-$HTTP_PROXY}"
    CURL_OPTS="$CURL_OPTS --proxy ${HTTPS_PROXY:-$HTTP_PROXY}"
fi

# Download with retry logic (up to 3 attempts with exponential backoff)
download_success=false
for attempt in 1 2 3; do
    log "Download attempt $attempt/3..."
    if curl $CURL_OPTS "$GH_URL" -o "$TEMP_DIR/$GH_TARBALL"; then
        download_success=true
        break
    fi
    if [ $attempt -lt 3 ]; then
        sleep_time=$((2 ** attempt))
        log "Download failed, retrying in ${sleep_time}s..."
        sleep $sleep_time
    fi
done

if [ "$download_success" != "true" ]; then
    log "Failed to download gh CLI after 3 attempts"
    exit 0  # Fail-safe
fi

log "Extracting..."
if ! tar -xzf "$TEMP_DIR/$GH_TARBALL" -C "$TEMP_DIR"; then
    log "Failed to extract gh CLI"
    exit 0  # Fail-safe
fi

# Move binary to local bin
if ! mv "$TEMP_DIR/gh_${GH_VERSION}_linux_${GH_ARCH}/bin/gh" "$LOCAL_BIN/gh"; then
    log "Failed to install gh CLI"
    exit 0  # Fail-safe
fi

chmod +x "$LOCAL_BIN/gh"

# Update PATH
export PATH="$LOCAL_BIN:$PATH"

# Persist PATH to CLAUDE_ENV_FILE if available
if [ -n "$CLAUDE_ENV_FILE" ]; then
    echo "export PATH=\"$LOCAL_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
    log "PATH persisted to CLAUDE_ENV_FILE"
fi

log "gh CLI installed successfully: $($LOCAL_BIN/gh --version | head -1)"
exit 0