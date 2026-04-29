import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import litPlugin from 'eslint-plugin-lit';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettierConfig,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module',
            },
            globals: {
                document: 'readonly',
                window: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                HTMLElement: 'readonly',
                customElements: 'readonly',
                CustomEvent: 'readonly',
                localStorage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                URL: 'readonly',
                Headers: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                RequestInit: 'readonly',
                AbortController: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            'lit': litPlugin,
        },
        rules: {
            'indent': ['error', 4],
            'semi': ['error', 'always'],
            'quotes': ['error', 'single'],
            '@typescript-eslint/parameter-properties': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-unused-vars': 'off',
        },
    },
    {
        ignores: ['dist/', 'node_modules/', 'vite.config.ts'],
    },
];
