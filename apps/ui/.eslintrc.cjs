/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@banalize/eslint-config"],
  plugins: ["react-hooks", "react-refresh"],
  // Build config files live outside the tsconfig project, so the type-aware
  // parser can't resolve them; they don't need linting.
  ignorePatterns: ["*.config.ts"],
  rules: {
    "react-refresh/only-export-components": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
};
