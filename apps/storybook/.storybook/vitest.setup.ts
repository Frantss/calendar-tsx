import { setProjectAnnotations } from '@storybook/react-vite';
import { beforeAll, expect } from 'vitest';
import { page, commands } from 'vitest/browser';
import type { ScreenshotParameters } from './screenshot';
import preview from './preview';

const annotations = setProjectAnnotations([
  preview,
  {
    beforeEach: async ({ parameters }) => {
      const { screenshot, forcedColors } = parameters as ScreenshotParameters;
      await commands.storyMedia({ forcedColors: forcedColors ? 'active' : 'none' });
      const viewport = typeof screenshot === 'object' ? screenshot.viewport : undefined;
      await page.viewport(viewport?.width ?? 1280, viewport?.height ?? 720);
    },
    afterEach: async ({ id, parameters, canvasElement }) => {
      const { screenshot } = parameters as ScreenshotParameters;
      if (!screenshot) return;

      await document.fonts.ready;
      const target =
        typeof screenshot === 'object' && screenshot.selector
          ? canvasElement.querySelector(screenshot.selector)
          : canvasElement;
      if (!target) throw new Error(`Screenshot target not found for ${id}`);

      const bottom = Math.ceil(target.getBoundingClientRect().bottom + window.scrollY);
      if (bottom > window.innerHeight) await page.viewport(window.innerWidth, bottom);

      await expect(target).toMatchScreenshot(id, typeof screenshot === 'object' ? screenshot.options : undefined);
    },
  },
]);

beforeAll(annotations.beforeAll);
