import { renderToString } from '@solidjs/web';
import { SsrApp } from './ssr-app';

export const ssr_render = () => renderToString(() => <SsrApp />);
