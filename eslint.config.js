import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/*.config.{js,mjs,ts}",
      "**/next-env.d.ts",
      ".claude/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // shared + cli: Node.js環境
  {
    files: ["packages/shared/src/**/*.ts", "packages/cli/src/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // cli: console.log許可（CLIツールのため）
  { files: ["packages/cli/src/**/*.ts"], rules: { "no-console": "off" } },
  // web: Browser + React
  {
    files: ["packages/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);
