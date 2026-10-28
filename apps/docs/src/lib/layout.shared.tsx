import { DocsBrand } from '@frantss/fumadocs-theme';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <DocsBrand>{appName}</DocsBrand>,
    },
    links: [{ text: 'Playground', url: '/docs/playground' }],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
