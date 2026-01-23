// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      '.react-router/**',
      'coverage/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Global settings for all TS/JS files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // React Router v7 route files - ignore false positives for framework-consumed exports
  // React Router uses named exports (meta, loader, action, links, handle, headers, shouldRevalidate)
  // and default exports (route component) that are consumed by the framework
  {
    files: ['app/routes/**/*.tsx', 'app/routes/**/*.ts'],
    rules: {
      // Disable unused vars warnings for route exports consumed by React Router
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^(meta|loader|action|links|handle|headers|shouldRevalidate|clientLoader|clientAction|HydrateFallback|ErrorBoundary)$',
      }],
    },
  },
);