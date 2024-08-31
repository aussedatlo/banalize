module.exports = {
  extends: ["@repo/eslint-config"],
  plugins: ["react", "react-hooks"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/jsx-filename-extension": ["warn", { extensions: [".tsx"] }],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
