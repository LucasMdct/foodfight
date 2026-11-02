// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  {
    ignores: [
      'dist/*',
      '.agents/**',
      '.superpowers/**',
      'docs/design/**',
      'node_modules/**',
    ],
  },
  expoConfig,
  {
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'import/no-named-as-default': 'off',
    },
  },
  prettier,
]);
