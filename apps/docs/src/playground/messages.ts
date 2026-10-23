import type { PlaygroundConfig } from './config';
import type { Measurement } from './measure';
import type { PlaygroundView } from './views';

/** From the playground page to the preview iframe. */
export type PlaygroundToPreview =
  | { type: 'config'; config: PlaygroundConfig }
  | { type: 'action'; action: 'prev' | 'next' | 'today' };

/** From the preview iframe to the playground page. */
export type PreviewToPlayground =
  | { type: 'ready' }
  | { type: 'navigate'; view: PlaygroundView; date: string }
  | { type: 'measure'; measurement: Measurement };

const source = 'calendar-tsx-playground';

export const postPlaygroundMessage = (target: Window, message: PlaygroundToPreview | PreviewToPlayground) =>
  target.postMessage({ source, message }, window.location.origin);

/** The message, when it comes from this origin and this protocol; anything else is ignored. */
export const readPlaygroundMessage = <TMessage>(event: MessageEvent): TMessage | undefined => {
  if (event.origin !== window.location.origin) return undefined;

  const data = event.data as { source?: string; message?: TMessage } | null;

  return data?.source === source ? data.message : undefined;
};
