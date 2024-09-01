/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@repo/eslint-config"],
  ignorePatterns: ["jest.config.ts", "jest.setup.ts"],
};
