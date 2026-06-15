import baseConfig from "@banalize/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Mirror the previous `--ext .ts,.tsx` scope: only lint TS sources. Build and
  // tooling config files (*.config.ts, *.cjs, *.js) live outside the tsconfig
  // project and don't need linting.
  {
    ignores: [
      "**/*.config.ts",
      "**/*.{js,cjs,mjs}",
      "dist",
      ".turbo",
    ],
  },
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
