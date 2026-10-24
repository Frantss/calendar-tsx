import type { BrowserCommand } from 'vitest/node';
import '@vitest/browser-playwright';

export const storyMedia: BrowserCommand<[{ forcedColors: 'active' | 'none' }]> = async ({ page }, media) => {
  await page.emulateMedia(media);
};

declare module 'vitest/internal/browser' {
  interface BrowserCommands {
    storyMedia: (media: { forcedColors: 'active' | 'none' }) => Promise<void>;
  }
}
