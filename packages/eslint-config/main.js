const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

/**
 * Shared flat config (ESLint 9+). Consumers spread this array into their own
 * `eslint.config.js` and layer on framework-specific rules.
 */
module.exports = [
  { ignores: ["**/.turbo/**", "**/node_modules/**", "**/dist/**"] },
  js.configs.recommended,
  ...tseslint.configs["flat/recommended"],
  prettierRecommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
