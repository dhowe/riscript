// Minimal flat config: only ESLint's own `recommended` rules, scoped to src/.
// Deliberately no stylistic/plugin rules — this repo is intentionally terse,
// and the goal is to catch real bugs, not churn formatting.
import js from '@eslint/js';

export default [
  // Nothing to lint outside these.
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'types/**',
      'test/**',
      'misc/**',
      'npnb/**',
      '*.config.js',
      'parser-type-gen.js'
    ]
  },

  js.configs.recommended,

  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: {
      // --- Noise we are not going to chase ---
      // Regex-heavy codebase: escapes and control chars are intentional.
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-misleading-character-class': 'off',
      'no-regex-spaces': 'off',
      // Terse/idiomatic patterns we want to keep.
      'no-empty': 'off',
      'no-fallthrough': 'off',
      'no-prototype-builtins': 'off',
      'no-unsafe-optional-chaining': 'off',
      'no-async-promise-executor': 'off',
      'no-constant-condition': 'off',
      'no-inner-declarations': 'off',
      'no-redeclare': 'off',
      'no-sparse-arrays': 'off',
      'no-useless-catch': 'off',
      'no-useless-rename': 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'prefer-rest-params': 'off',
      'require-atomic-updates': 'off',
      // Unused args/vars in a visitor-heavy codebase are usually signature artifacts.
      'no-unused-vars': ['warn', { args: 'none', vars: 'all', caughtErrors: 'none' }],

      // --- Kept ON because they are real bug detectors ---
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-cond-assign': 'error',
      'no-const-assign': 'error',
      'no-obj-calls': 'error',
      'no-import-assign': 'error',
      'no-class-assign': 'error',
      'no-func-assign': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-finally': 'error',
      'no-invalid-regexp': 'error',
      'no-mixed-operators': 'off',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-shadow-restricted-names': 'error',
      'no-new-symbol': 'error',
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-catch-shadow': 'off'
    }
  }
];
