// #region renderer
import type { JSX } from '@solidjs/web';
import { hydrate, renderToString } from '@solidjs/web';

export const renderSchedule = (app: () => JSX.Element) => renderToString(app);
export const hydrateSchedule = (app: () => JSX.Element, root: HTMLElement) => hydrate(app, root);
// #endregion renderer
