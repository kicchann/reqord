#!/bin/bash
# 親ディレクトリの .claude/ 設定を子プロジェクトにリンク
#
# 使い方:
#   .claude/scripts/link-parent-claude.sh apps/frontend
#   .claude/scripts/link-parent-claude.sh apps/backend-billing
#
# ワークスペースルートから実行することを想定

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 使い方表示
usage() {
  echo "使い方: $0 <target-project-dir>"
  echo ""
  echo "例:"
  echo "  $0 apps/frontend"
  echo "  $0 apps/backend-billing"
  echo ""
  echo "ワークスペースルートから実行してください。"
  exit 1
}

# 引数チェック
[ $# -lt 1 ] && usage

TARGET_PROJECT="$1"

# スクリプトの場所から親の .claude/ を特定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_CLAUDE="$(dirname "$SCRIPT_DIR")"
WORKSPACE_ROOT="$(dirname "$PARENT_CLAUDE")"

# 検証
if [ ! -d "$PARENT_CLAUDE/commands" ]; then
  log_error "親の .claude/ が正しくありません: $PARENT_CLAUDE"
  exit 1
fi

if [ ! -d "$TARGET_PROJECT" ]; then
  log_error "対象ディレクトリが存在しません: $TARGET_PROJECT"
  exit 1
fi

TARGET_CLAUDE="$TARGET_PROJECT/.claude"

# .claude/ がなければ作成
if [ ! -d "$TARGET_CLAUDE" ]; then
  log_warn "$TARGET_CLAUDE が存在しません。作成します。"
  mkdir -p "$TARGET_CLAUDE"
fi

log_info "親の .claude/: $PARENT_CLAUDE"
log_info "対象: $TARGET_CLAUDE"
echo ""

# 相対パスを計算
compute_relative_path() {
  local from="$1"
  local to="$2"
  python3 -c "import os.path; print(os.path.relpath('$to', '$from'))"
}

# リンク作成
link_items() {
  local dir="$1"
  local pattern="$2"
  local mode="$3"  # skip or overwrite

  local target_dir="$TARGET_CLAUDE/$dir"
  mkdir -p "$target_dir"

  local count=0
  local skipped=0

  for item in "$PARENT_CLAUDE/$dir/"$pattern; do
    [ -e "$item" ] || continue

    local name="$(basename "$item")"
    local target="$target_dir/$name"

    # 既存チェック
    if [ "$mode" = "skip" ]; then
      if [ -e "$target" ] && [ ! -L "$target" ]; then
        skipped=$((skipped + 1))
        continue
      fi
    fi

    # 相対パスを計算
    local abs_target_dir="$(cd "$target_dir" && pwd)"
    local rel_path="$(compute_relative_path "$abs_target_dir" "$item")"

    ln -sf "$rel_path" "$target"
    count=$((count + 1))
  done

  log_info "$dir: ${count}個リンク"
  if [ $skipped -gt 0 ]; then
    log_warn "$dir: ${skipped}個スキップ（既存）"
  fi
}

log_info "=== リンク作成開始 ==="

# agents - 全てリンク
link_items "agents" "*.md" "overwrite"

# commands - 既存はスキップ
link_items "commands" "*.md" "skip"

# hooks - 全てリンク
link_items "hooks" "*" "overwrite"

# rules - 既存はスキップ
link_items "rules" "*.md" "skip"

# skills - 既存ディレクトリはスキップ
skills_dir="$TARGET_CLAUDE/skills"
mkdir -p "$skills_dir"
skills_count=0
for item in "$PARENT_CLAUDE/skills/"*/; do
  [ -d "$item" ] || continue
  name="$(basename "$item")"
  target="$skills_dir/$name"

  if [ -d "$target" ] && [ ! -L "$target" ]; then
    log_warn "skills: $name スキップ（既存）"
    continue
  fi

  abs_skills_dir="$(cd "$skills_dir" && pwd)"
  rel_path="$(compute_relative_path "$abs_skills_dir" "$item")"
  ln -sf "$rel_path" "$target"
  skills_count=$((skills_count + 1))
done
log_info "skills: ${skills_count}個リンク"

echo ""
log_info "=== 完了 ==="
log_info "確認: ls -la $TARGET_CLAUDE/"
