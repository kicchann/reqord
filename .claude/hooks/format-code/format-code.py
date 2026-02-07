#!/usr/bin/env python3
"""
Multi-language formatter/linter for Claude Code PostToolUse hook.
Runs appropriate linter/formatter based on file extension.
Configuration is loaded from settings.json in the same directory.
"""

import json
import os
import platform
import re
import subprocess
import shutil
import sys
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.resolve()
SETTINGS_FILE = SCRIPT_DIR / "settings.json"


def load_settings() -> dict:
    """Load formatter settings from settings.json."""
    if not SETTINGS_FILE.exists():
        return {"formatters": []}

    with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_formatter_entry(entry: dict, index: int) -> list[str]:
    """
    Validate a single formatter entry.
    commands must be Array<Command> where Command = Array<string>.
    Returns list of error messages (empty if valid).
    """
    errors = []

    if not isinstance(entry, dict):
        errors.append(f"Formatter [{index}]: must be an object")
        return errors

    extensions = entry.get("extensions")
    if extensions is None:
        errors.append(f"Formatter [{index}]: missing 'extensions' field")
    elif not isinstance(extensions, list):
        errors.append(f"Formatter [{index}]: 'extensions' must be a list")
    elif not all(isinstance(ext, str) for ext in extensions):
        errors.append(f"Formatter [{index}]: all extensions must be strings")

    commands = entry.get("commands")
    if commands is None:
        errors.append(f"Formatter [{index}]: missing 'commands' field")
    elif not isinstance(commands, list):
        errors.append(f"Formatter [{index}]: 'commands' must be a list")
    elif not all(isinstance(cmd, list) for cmd in commands):
        errors.append(f"Formatter [{index}]: each command must be a list of strings")
    elif not all(isinstance(arg, str) for cmd in commands for arg in cmd):
        errors.append(f"Formatter [{index}]: each command argument must be a string")

    return errors


def build_formatter_map(settings: dict) -> dict:
    """
    Build a mapping from file extension to formatter config.
    Returns: {'.py': {'commands': [...], 'install_hint': '...'}, ...}
    Only includes formatters where enabled is true (default: true).
    Merges commands if same extension appears multiple times.
    """
    formatter_map = {}
    for i, entry in enumerate(settings.get("formatters", [])):
        # Validate entry
        errors = validate_formatter_entry(entry, i)
        if errors:
            for err in errors:
                print(f"Warning: {err}", file=sys.stderr)
            continue

        # Skip disabled formatters (enabled defaults to true)
        if not entry.get("enabled", True):
            continue

        extensions = entry.get("extensions", [])
        commands = entry.get("commands", [])
        install_hint = entry.get("install_hint", "")

        for ext in extensions:
            ext_lower = ext.lower()
            if ext_lower in formatter_map:
                # Merge commands for duplicate extensions
                formatter_map[ext_lower]["commands"].extend(commands)
                # Keep first non-empty install_hint
                if not formatter_map[ext_lower]["install_hint"] and install_hint:
                    formatter_map[ext_lower]["install_hint"] = install_hint
            else:
                formatter_map[ext_lower] = {
                    "commands": list(commands),
                    "install_hint": install_hint,
                }

    return formatter_map


def detect_language(code: str) -> str:
    """Best-effort language detection from code content."""
    s = code.strip()

    # JSON detection
    if re.search(r"^\s*[{\[]", s):
        try:
            json.loads(s)
            return "json"
        except json.JSONDecodeError:
            pass

    # Python detection
    if re.search(r"^\s*def\s+\w+\s*\(", s, re.M) or re.search(
        r"^\s*(import|from)\s+\w+", s, re.M
    ):
        return "python"

    # JavaScript detection
    if re.search(r"\b(function\s+\w+\s*\(|const\s+\w+\s*=)", s) or re.search(
        r"=>|console\.(log|error)", s
    ):
        return "javascript"

    # TypeScript detection
    if re.search(r":\s*(string|number|boolean|any)\b", s) or re.search(
        r"\binterface\s+\w+", s
    ):
        return "typescript"

    # Bash detection
    if re.search(r"^#!.*\b(bash|sh)\b", s, re.M) or re.search(
        r"\b(if|then|fi|for|in|do|done)\b", s
    ):
        return "bash"

    # SQL detection
    if re.search(r"\b(SELECT|INSERT|UPDATE|DELETE|CREATE)\s+", s, re.I):
        return "sql"

    # YAML detection
    if re.search(r"^\s*[\w-]+:\s*[\w\-\.\"\'\[\{]", s, re.M):
        return "yaml"

    return "text"


def format_markdown(content: str) -> str:
    """Format markdown content with language detection."""
    # Pattern for matching code fences (with optional trailing whitespace for replacement)
    fence_pattern = r"(?ms)^([ \t]{0,3})```([^\n]*)\n(.*?)(\n\1```)"

    # Fix unlabeled code fences
    def add_lang_to_fence(match):
        indent, info, body, closing = match.groups()
        if not info.strip():
            lang = detect_language(body)
            return f"{indent}```{lang}\n{body}{closing}"
        return match.group(0)

    content = re.sub(fence_pattern, add_lang_to_fence, content)

    # Fix excessive blank lines ONLY outside code fences
    # Split content by code fences and process only non-fence parts
    parts = []
    last_end = 0
    for match in re.finditer(fence_pattern, content):
        # Process text before this fence
        before_fence = content[last_end : match.start()]
        before_fence = re.sub(r"\n{3,}", "\n\n", before_fence)
        parts.append(before_fence)
        # Keep fence as-is
        parts.append(match.group(0))
        last_end = match.end()

    # Process remaining text after last fence
    after_last = content[last_end:]
    after_last = re.sub(r"\n{3,}", "\n\n", after_last)
    parts.append(after_last)

    content = "".join(parts)

    return content.rstrip() + "\n"


def run_formatter(cmd_args: list, file_path: str) -> str:
    """
    Run a formatter command.
    cmd_args: ['ruff', 'format', '{file}'] or similar
    Returns: "success", "not_found", or "failed"
    """
    if not cmd_args:
        return "failed"

    cmd = cmd_args[0]

    # Check if command exists
    cmd_path = shutil.which(cmd)
    if not cmd_path:
        return "not_found"

    # Replace {file} placeholder with actual path
    resolved_args = [arg.replace("{file}", file_path) for arg in cmd_args]

    # On Windows, use shell=True to support .CMD and .BAT files
    use_shell = platform.system() == "Windows"

    try:
        result = subprocess.run(
            resolved_args, capture_output=True, text=True, timeout=30, shell=use_shell
        )
        return "success" if result.returncode == 0 else "failed"
    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        return "failed"


def format_file(file_path: str, formatter_map: dict) -> tuple[bool, str]:
    """
    Format a file based on its extension.
    commands is Array<Command> where Command = Array<string>.
    Commands are executed sequentially (all run).
    Returns (success, message).
    """
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}"

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext not in formatter_map:
        return True, ""  # No formatter configured, skip silently

    config = formatter_map[ext]
    commands = config["commands"]
    install_hint = config.get("install_hint", "")

    any_found = False
    missing_cmds = []
    success_messages = []

    for cmd in commands:
        if not cmd:
            continue

        # Special case: built-in markdown formatter
        if cmd[0] == "__markdown__":
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                formatted = format_markdown(content)

                if formatted != content:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(formatted)
                    success_messages.append(f"Formatted markdown: {file_path}")
                any_found = True
                continue
            except Exception as e:
                return False, f"Markdown format error: {e}"

        # Try external formatter
        status = run_formatter(cmd, file_path)
        if status == "success":
            success_messages.append(f"Formatted with {cmd[0]}: {file_path}")
            any_found = True
        elif status == "not_found":
            missing_cmds.append(cmd[0])
        else:  # failed
            any_found = True

    # All commands missing → block with error
    if not any_found and missing_cmds:
        msg = f"⚠️ FORMAT ERROR: Formatter not found for '{ext}': {', '.join(missing_cmds)}"
        if install_hint:
            msg += f"\n   💡 Install: {install_hint}"
        return False, msg

    # Some commands missing → warn without blocking
    if missing_cmds:
        warn = f"⚠️ Some formatters not found for '{ext}': {', '.join(missing_cmds)}"
        if install_hint:
            warn += f"\n   💡 Install: {install_hint}"
        print(warn, file=sys.stderr)

    return True, "; ".join(success_messages) if success_messages else ""


def main():
    try:
        input_data = json.load(sys.stdin)
        file_path = input_data.get("tool_input", {}).get("file_path", "")

        if not file_path:
            sys.exit(0)

        # Load settings and build formatter map
        settings = load_settings()
        formatter_map = build_formatter_map(settings)

        success, message = format_file(file_path, formatter_map)

        if not success and message:
            # Exit 2 with stderr = blocking error shown to Claude
            print(message, file=sys.stderr, flush=True)
            sys.exit(2)
        elif message:
            # Success message to stdout
            print(message, flush=True)
            sys.exit(0)
        else:
            # Silent success
            sys.exit(0)

    except json.JSONDecodeError:
        print("⚠️ FORMAT HOOK ERROR: Invalid JSON input", file=sys.stderr, flush=True)
        sys.exit(2)
    except Exception as e:
        print(f"⚠️ FORMAT HOOK ERROR: {e}", file=sys.stderr, flush=True)
        sys.exit(2)


if __name__ == "__main__":
    main()
