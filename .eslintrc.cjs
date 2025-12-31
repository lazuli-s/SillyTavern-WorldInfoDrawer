module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  globals: {
    $: "readonly",
    toastr: "readonly",
    hljs: "readonly",
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-undef": "error",
    "no-unused-vars": ["error", { argsIgnorePattern: "^(_|evt)$" }],
    "no-unreachable": "error",
    eqeqeq: "warn",
    "no-redeclare": "error",
    "no-shadow": "warn",
  },
};