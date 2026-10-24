import type { ScreenshotMatcherOptions } from 'vitest/browser';

export type ScreenshotParameters = {
  forcedColors?: boolean;
  screenshot?:
    | boolean
    | {
        viewport?: { width: number; height: number };
        selector?: string;
        options?: ScreenshotMatcherOptions;
      };
};
