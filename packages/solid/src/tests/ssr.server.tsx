import { generateHydrationScript, renderToString } from 'solid-js/web';

import type { SsrApp_Props } from '#tests/ssr.app';
import { SsrApp } from '#tests/ssr.app';

/** Runs in Node through Vite's SSR pipeline, so Solid's server runtime renders the parts (D32). */
export const ssrServer_render = (props: SsrApp_Props) => ({
  html: renderToString(() => <SsrApp {...props} />),
  script: generateHydrationScript(),
});
