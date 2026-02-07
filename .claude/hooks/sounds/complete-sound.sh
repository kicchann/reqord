#!/bin/bash
# 完了音 - Claudeがタスク完了時に鳴らす
# クロスプラットフォーム対応（WSL2, Linux, macOS）

# プラットフォーム検出
detect_platform() {
    if [ -f /proc/version ] && grep -qi "microsoft\|wsl" /proc/version 2>/dev/null; then
        echo "wsl2"
    elif [ "$(uname -s)" = "Darwin" ]; then
        echo "macos"
    else
        echo "linux"
    fi
}

# WSL2用音声再生
play_wsl2() {
    powershell.exe -NoProfile -NonInteractive "
[console]::beep(523, 80)
[console]::beep(659, 80)
[console]::beep(783, 80)
[console]::beep(1046, 120)
" 2>/dev/null
}

# macOS用音声再生
play_macos() {
    # Try Glass.aiff first, fallback to Ping.aiff if not available
    if [ -f /System/Library/Sounds/Glass.aiff ]; then
        afplay /System/Library/Sounds/Glass.aiff 2>/dev/null
    elif [ -f /System/Library/Sounds/Ping.aiff ]; then
        afplay /System/Library/Sounds/Ping.aiff 2>/dev/null
    fi
}

# Linux用音声再生（フォールバックチェーン）
play_linux() {
    # Try multiple methods in order of preference

    # 1. paplay (PulseAudio)
    if command -v paplay >/dev/null 2>&1; then
        # Try to play a system sound if available
        for sound in /usr/share/sounds/freedesktop/stereo/complete.oga \
                     /usr/share/sounds/freedesktop/stereo/bell.oga \
                     /usr/share/sounds/ubuntu/stereo/bell.ogg; do
            if [ -f "$sound" ]; then
                paplay "$sound" 2>/dev/null && return
            fi
        done
    fi

    # 2. aplay (ALSA)
    if command -v aplay >/dev/null 2>&1; then
        # Try to play a wav sound if available
        for sound in /usr/share/sounds/freedesktop/stereo/complete.wav \
                     /usr/share/sounds/alsa/Noise.wav; do
            if [ -f "$sound" ]; then
                aplay -q "$sound" 2>/dev/null && return
            fi
        done
    fi

    # 3. beep (PC speaker)
    if command -v beep >/dev/null 2>&1; then
        beep -f 523 -l 80 2>/dev/null && \
        beep -f 659 -l 80 2>/dev/null && \
        beep -f 783 -l 80 2>/dev/null && \
        beep -f 1046 -l 120 2>/dev/null && return
    fi

    # 4. speaker-test (ALSA speaker test)
    if command -v speaker-test >/dev/null 2>&1; then
        speaker-test -t sine -f 1000 -l 1 2>/dev/null >/dev/null && return
    fi

    # 5. Silent fallback - do nothing, always succeed
    return 0
}

# メイン処理
main() {
    local platform
    platform=$(detect_platform)

    case "$platform" in
        wsl2)  play_wsl2 ;;
        macos) play_macos ;;
        linux) play_linux ;;
    esac
}

main
exit 0
