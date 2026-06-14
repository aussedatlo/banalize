module.exports = {
  extends: "stylelint-config-standard",
  plugins: ["stylelint-prettier"],
  rules: {
    "prettier/prettier": true,
    // Tailwind v4 requires the bare-string import (`@import "tailwindcss"`).
    "import-notation": "string",
    // Tailwind's directives are not standard CSS at-rules.
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "config",
          "screen",
          "variants",
          "responsive",
        ],
      },
    ],
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]+$",
      {
        message: "Expected class name to be lowerCamelCase",
      },
    ],
  },
};
