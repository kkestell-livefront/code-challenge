import nextVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig, globalIgnores } from 'eslint/config';

const importRules = {
  'import/newline-after-import': ['error'],
  'import/no-duplicates': ['error'],
  'import/no-named-as-default': ['error'],
};

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', '.claude/**']),

  ...nextVitals,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      eqeqeq: ['error'],
      semi: 'off',
      ...importRules,
      'import/order': [
        'error',
        {
          groups: ['builtin', 'unknown', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  {
    files: ['**/*.{js,jsx,mjs}'],
    rules: importRules,
  },
]);
