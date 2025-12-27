module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  rules: {
    "no-undef": "error",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-unreachable": "error",
    eqeqeq: "error",
    "no-redeclare": "error",
    "no-shadow": "warn",
  },
};
