const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['vendor/sillytavern/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        $: 'readonly',
        toastr: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
