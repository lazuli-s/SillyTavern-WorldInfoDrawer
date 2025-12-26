const globals = require('globals');

module.exports = [
  {
    ignores: ['vendor/sillytavern/**'],
  },
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
      'eqeqeq': 'error',
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-shadow': 'warn',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
