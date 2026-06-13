/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@banalize/eslint-config"],
  plugins: ["react-hooks", "react-refresh"],
  rules: {
    "react-refresh/only-export-components": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
};
