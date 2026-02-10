import { ZodError, type ZodIssue } from "zod";

export interface FormatOptions {
  prefix?: string;      // Default: "- "
  separator?: string;   // Default: "\n"
}

/**
 * パスをフォーマットする
 * @param path - パス配列
 * @returns フォーマットされたパス文字列
 */
export function formatPath(path: (string | number)[]): string {
  if (path.length === 0) {
    return "(root)";
  }

  let result = "";
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];

    if (typeof segment === "number") {
      // 配列インデックス
      result += `[${segment}]`;
    } else {
      // プロパティ名
      if (i === 0) {
        result = segment;
      } else {
        result += `.${segment}`;
      }
    }
  }

  return result;
}

const TYPE_NAMES_JA: Record<string, string> = {
  string: "文字列",
  number: "数値",
  boolean: "真偽値",
  object: "オブジェクト",
  array: "配列",
  null: "null",
  undefined: "未定義",
};

/**
 * ZodIssueをフォーマットする
 * @param issue - ZodIssue
 * @returns フォーマットされたエラーメッセージ
 */
export function formatZodIssue(issue: ZodIssue): string {
  const path = formatPath(issue.path);

  switch (issue.code) {
    case "invalid_type": {
      const expected = TYPE_NAMES_JA[issue.expected] || issue.expected;
      const received = issue.received;
      return `${path}: ${expected}が必要です（実際の型: ${received}）`;
    }

    case "invalid_enum_value": {
      const options = issue.options.map((o) => `'${o}'`).join(", ");
      return `${path}: 不正な値 '${issue.received}'（期待値: ${options}）`;
    }

    case "too_small": {
      const minimum = issue.minimum;
      if (issue.type === "string") {
        return `${path}: ${minimum}文字以上の文字列が必要です`;
      } else if (issue.type === "number") {
        if (issue.exact === false && minimum === 0 && !issue.inclusive) {
          return `${path}: 正の数値が必要です`;
        }
        return `${path}: ${minimum}以上の数値が必要です`;
      } else if (issue.type === "array") {
        return `${path}: ${minimum}個以上の要素が必要です`;
      }
      return `${path}: ${issue.message}`;
    }

    case "too_big": {
      const maximum = issue.maximum;
      if (issue.type === "string") {
        return `${path}: ${maximum}文字以下の文字列が必要です`;
      } else if (issue.type === "number") {
        return `${path}: ${maximum}以下の数値が必要です`;
      } else if (issue.type === "array") {
        return `${path}: ${maximum}個以下の要素が必要です`;
      }
      return `${path}: ${issue.message}`;
    }

    case "invalid_string": {
      return `${path}: 形式が不正です`;
    }

    case "unrecognized_keys": {
      const keys = issue.keys.join(", ");
      return `${path}: 不明なフィールド '${keys}'`;
    }

    default: {
      // Fallback for other error codes
      return `${path}: ${issue.message}`;
    }
  }
}

/**
 * ZodErrorをフォーマットする
 * @param error - ZodError
 * @param options - フォーマットオプション
 * @returns フォーマットされたエラーメッセージ
 */
export function formatZodError(error: ZodError, options?: FormatOptions): string {
  const prefix = options?.prefix ?? "- ";
  const separator = options?.separator ?? "\n";

  if (error.issues.length === 0) {
    return "";
  }

  const formattedIssues = error.issues.map((issue) => {
    const message = formatZodIssue(issue);
    return `${prefix}${message}`;
  });

  return formattedIssues.join(separator);
}
