/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  extends: ["@banalize/eslint-config", "next", "next/core-web-vitals"],
};
