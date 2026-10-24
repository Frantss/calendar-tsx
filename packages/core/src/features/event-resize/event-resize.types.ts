import type { Calendar_EventInput } from '#events/event.types';
import type {
  Calendar_InteractionEvaluation,
  Calendar_InteractionStart,
} from '#features/interaction/interaction.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export type Calendar_ResizeIntent = { kind: 'resize'; eventId: string; edge: 'start' | 'end' };

export type Calendar_ResizeProposal<TData = unknown> = {
  kind: 'resize';
  edge: Calendar_ResizeIntent['edge'];
  before: Calendar_EventInput<TData>;
  after: Calendar_EventInput<TData>;
};

export type Calendar_ResizeApi<D> = {
  begin: (eventId: string, edge: Calendar_ResizeIntent['edge']) => Calendar_InteractionStart;
  evaluate: (
    eventId: string,
    edge: Calendar_ResizeIntent['edge'],
    target: Calendar_DateTarget,
  ) => Calendar_InteractionEvaluation<Calendar_ResizeProposal<D>>;
};

export type Calendar_ResizeSettings = {
  enabled?: boolean;
  fromStart?: boolean;
  canResize?: (event: Calendar_EventInput<unknown>, edge: 'start' | 'end') => boolean;
};
