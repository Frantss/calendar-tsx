import { playwright } from 'vite-plus/test/browser-playwright';
import { defineConfig } from 'vite-plus';

export const base = defineConfig({
  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**'],
    plugins: ['oxc', 'typescript', 'import', 'promise', 'react', 'react-perf'],
    env: {
      browser: true,
    },
    rules: {
      'typescript/no-base-to-string': 'off',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    arrowParens: 'avoid' as const,
    singleQuote: true,
    jsxSingleQuote: true,
    printWidth: 120,
    objectWrap: 'preserve' as const,
    overrides: [
      {
        files: ['*.spec.ts', '*.spec.tsx'],
        options: {
          printWidth: 150,
        },
      },
    ],
  },
  test: {
    browser: {
      provider: playwright({}),
      enabled: true,
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: 'chromium' as const }],
      viewport: { width: 1280, height: 720 },
    },
    globals: false,
    coverage: {
      enabled: false,
      reporter: 'html' as const,
      provider: 'v8' as const,
    },
    include: ['**/*.spec.{ts,tsx}'],
  },
});

export default base;
