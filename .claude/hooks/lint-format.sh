#!/bin/bash
# PostToolUse hook: Edit/Write後に自動でlint+format実行
# ファイルパスに基づいて適切なlinter/formatterを選択
# エラー時は exit 2 で Claude にフィードバック

set -o pipefail

# stdinからJSONを読み込み
INPUT=$(cat)

# file_pathを抽出
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# ファイルが存在しない場合はスキップ（削除された可能性）
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# プロジェクトルートを取得
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# ファイルパスからアプリを判定
get_app_type() {
  local file="$1"
  case "$file" in
    */apps/frontend/*)
      echo "frontend"
      ;;
    */apps/backend/*)
      echo "backend"
      ;;
    */apps/backend-billing/*)
      echo "backend-billing"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

APP_TYPE=$(get_app_type "$FILE_PATH")

# 対象拡張子のチェックと処理
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    if [ "$APP_TYPE" = "frontend" ]; then
      # Frontend: ESLint + Prettier
      cd "$PROJECT_ROOT/apps/frontend" || exit 0

      ERRORS=""

      # ESLint実行
      ESLINT_OUTPUT=$(npx eslint "$FILE_PATH" --fix 2>&1)
      ESLINT_EXIT=$?

      if [ $ESLINT_EXIT -ne 0 ]; then
        ERRORS="ESLint errors in $FILE_PATH:\n$ESLINT_OUTPUT"
      fi

      # Prettier実行
      PRETTIER_OUTPUT=$(npx prettier --write "$FILE_PATH" 2>&1)
      PRETTIER_EXIT=$?

      if [ $PRETTIER_EXIT -ne 0 ]; then
        if [ -n "$ERRORS" ]; then
          ERRORS="$ERRORS\n\n"
        fi
        ERRORS="${ERRORS}Prettier errors in $FILE_PATH:\n$PRETTIER_OUTPUT"
      fi

      if [ -n "$ERRORS" ]; then
        echo -e "$ERRORS" >&2
        exit 2
      fi
    fi
    # backend/backend-billing: 現在は未対応（ruff導入後に追加）
    ;;

  *.py)
    # Python: ruff（将来実装）
    # if [ "$APP_TYPE" = "backend" ] || [ "$APP_TYPE" = "backend-billing" ]; then
    #   cd "$PROJECT_ROOT/apps/$APP_TYPE" || exit 0
    #   ruff check --fix "$FILE_PATH"
    #   ruff format "$FILE_PATH"
    # fi
    ;;

  *.json)
    if [ "$APP_TYPE" = "frontend" ]; then
      cd "$PROJECT_ROOT/apps/frontend" || exit 0
      PRETTIER_OUTPUT=$(npx prettier --write "$FILE_PATH" 2>&1)
      if [ $? -ne 0 ]; then
        echo "Prettier errors in $FILE_PATH:\n$PRETTIER_OUTPUT" >&2
        exit 2
      fi
    fi
    ;;

  *.md|*.mdx)
    if [ "$APP_TYPE" = "frontend" ]; then
      cd "$PROJECT_ROOT/apps/frontend" || exit 0
      PRETTIER_OUTPUT=$(npx prettier --write "$FILE_PATH" 2>&1)
      if [ $? -ne 0 ]; then
        echo "Prettier errors in $FILE_PATH:\n$PRETTIER_OUTPUT" >&2
        exit 2
      fi
    fi
    ;;

  *.css|*.scss)
    if [ "$APP_TYPE" = "frontend" ]; then
      cd "$PROJECT_ROOT/apps/frontend" || exit 0
      PRETTIER_OUTPUT=$(npx prettier --write "$FILE_PATH" 2>&1)
      if [ $? -ne 0 ]; then
        echo "Prettier errors in $FILE_PATH:\n$PRETTIER_OUTPUT" >&2
        exit 2
      fi
    fi
    ;;
esac

exit 0
