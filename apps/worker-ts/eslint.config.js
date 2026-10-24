import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['src/**/*.ts'],
  languageOptions: { globals: { crypto: 'readonly', ReadableStream: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly', Response: 'readonly', Request: 'readonly', URL: 'readonly', console: 'readonly' } },
});
