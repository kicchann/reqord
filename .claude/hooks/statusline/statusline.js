#!/usr/bin/env node

const path = require("path");
const fs = require("fs");

/**
 * Get session summary (title) from sessions-index.json
 * @param {string} transcriptPath - Path to the transcript file
 * @returns {string} - Session summary or empty string
 */
const getSessionSummary = (transcriptPath) => {
  try {
    if (!transcriptPath) return "";

    const projectDir = path.dirname(transcriptPath);
    const sessionId = path.basename(transcriptPath, ".jsonl");
    const indexPath = path.join(projectDir, "sessions-index.json");

    // まずsessions-index.jsonから検索
    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      const entries = indexData.entries || {};

      for (const entry of Object.values(entries)) {
        if (entry.sessionId === sessionId && entry.summary) {
          const summary = entry.summary;
          return summary.length > 20 ? summary.substring(0, 17) + "..." : summary;
        }
      }
    }

    // indexに無い場合、transcriptファイルから最初のユーザープロンプトを取得
    if (fs.existsSync(transcriptPath)) {
      const content = fs.readFileSync(transcriptPath, "utf-8");
      const lines = content.split("\n").filter(line => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === "user" && entry.message?.content) {
            let text = "";
            const msgContent = entry.message.content;

            // contentが配列の場合
            if (Array.isArray(msgContent)) {
              const textContent = msgContent.find(c => c.type === "text");
              if (textContent?.text) {
                text = textContent.text;
              }
            } else if (typeof msgContent === "string") {
              // contentが文字列の場合
              text = msgContent;
            }

            // システムタグを除外してテキストを抽出
            // <tag>...</tag> 形式のタグを繰り返し除去
            let prevText;
            do {
              prevText = text;
              text = text.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "");
            } while (text !== prevText);
            // 自己閉じタグも除去
            text = text.replace(/<[^>]+\/>/g, "").trim();

            if (text && text.length > 0) {
              return text.length > 20 ? text.substring(0, 17) + "..." : text;
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    return "";
  } catch (err) {
    return "";
  }
};

/**
 * Detect OS platform and return appropriate emoji
 * @returns {string}
 */
const getPlatformEmoji = () => {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      return '🪟';
    }

    if (platform === 'darwin') {
      return '🍎';
    }

    if (platform === 'linux') {
      return '🐧';  // WSLもLinuxもペンギン
    }

    return '💻';  // フォールバック
  } catch (err) {
    return '💻';
  }
};

/**
 * @param {number} tokens
 * @returns {string}
 */
const formatTokenCount = (tokens) =>
  tokens >= 1000000
    ? `${(tokens / 1000000).toFixed(1)}M`
    : tokens >= 1000
      ? `${(tokens / 1000).toFixed(1)}K`
      : tokens.toString();

/**
 * モデル名に基づいて色コードを返す
 * @param {string} modelName
 * @returns {string} ANSIカラーコード
 */
const getModelColor = (modelName) => {
  const name = modelName.toLowerCase();

  if (name.includes('opus')) {
    return '\x1b[93m';  // ゴールド（明るい黄色）- 賢い
  }
  if (name.includes('sonnet')) {
    return '\x1b[92m';  // 優しい緑（明るい緑）- 親切
  }
  if (name.includes('haiku')) {
    return '\x1b[34m';  // 青 - 速い
  }

  return '\x1b[37m';  // デフォルト：白
};

/**
 * @param {string} input
 * @returns {string}
 */
const buildStatusLine = (input) => {
  const data = JSON.parse(input);
  const model = data.model?.display_name || "Unknown";
  const currentDir = path.basename(
    data.workspace?.current_dir || data.cwd || ".",
  );

  const contextWindow = data.context_window || {};
  const contextSize = contextWindow.context_window_size;
  const currentUsage = contextWindow.current_usage;

  const currentTokens =
    (currentUsage.input_tokens || 0) +
    (currentUsage.cache_creation_input_tokens || 0) +
    (currentUsage.cache_read_input_tokens || 0);

  const percentage = Math.min(
    100,
    Math.round((currentTokens / contextSize) * 100),
  );
  const tokenDisplay = formatTokenCount(currentTokens);

  const percentageColor =
    percentage >= 90
      ? "\x1b[31m" // Red
      : percentage >= 70
        ? "\x1b[33m" // Yellow
        : "\x1b[32m"; // Green

  const osEmoji = getPlatformEmoji();
  const summary = getSessionSummary(data.transcript_path);
  const summaryPart = summary ? ` 📝 ${summary}` : "";
  const modelColor = getModelColor(model);
  return `${osEmoji} ${modelColor}[${model}]\x1b[0m 📁 ${currentDir}${summaryPart} 🪙 ${tokenDisplay} ${percentageColor}${percentage}%\x1b[0m`;
};

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => console.log(buildStatusLine(chunks.join(""))));
