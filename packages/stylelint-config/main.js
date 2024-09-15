module.exports = {
  extends: "stylelint-config-standard",
  plugins: ["stylelint-prettier"],
  rules: {
    "prettier/prettier": true,
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]+$",
      {
        message: "Expected class name to be lowerCamelCase",
      },
    ],
  },
};
