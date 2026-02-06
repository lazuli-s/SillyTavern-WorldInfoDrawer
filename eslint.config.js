export default [
    {
        ignores: ['node_modules/**', 'vendor/**', 'coverage/**'],
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                $: 'readonly',
                toastr: 'readonly',
                hljs: 'readonly',
            },
        },
        rules: {
            'no-undef': 'warn',
            'no-unused-vars': ['error', { argsIgnorePattern: '^(_|evt)$' }],
            'no-unreachable': 'error',
            eqeqeq: 'warn',
            'no-redeclare': 'error',
            'no-shadow': 'warn',
        },
    },
];
