import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig, mergeConfig } from 'vite-plus';
import { base } from '../../vite.config';
import viteConfig from './vite.config';
import { storyMedia } from './.storybook/media';

export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [storybookTest({ configDir: fileURLToPath(new URL('./.storybook', import.meta.url)) })],
    test: {
      ...base.test,
      browser: { ...base.test?.browser, commands: { storyMedia } },
      name: 'storybook',
      include: undefined,
      api: { host: '127.0.0.1', allowWrite: true },
      setupFiles: ['./.storybook/vitest.setup.ts'],
    },
  }),
);
