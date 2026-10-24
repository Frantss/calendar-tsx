import type { Calendar_EventInput } from '#events/event.types';
import type {
  Calendar_InteractionEvaluation,
  Calendar_InteractionStart,
} from '#features/interaction/interaction.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

export type Calendar_MoveIntent = { kind: 'move'; eventId: string; sourceResourceId?: string };

export type Calendar_MoveProposal<TData = unknown> = {
  kind: 'move';
  before: Calendar_EventInput<TData>;
  after: Calendar_EventInput<TData>;
};

export type Calendar_MoveApi<D = unknown> = {
  begin: (eventId: string, sourceResourceId?: string) => Calendar_InteractionStart<'move', D>;
  evaluate: (
    eventId: string,
    target: Calendar_DateTarget,
    sourceResourceId?: string,
  ) => Calendar_InteractionEvaluation<Calendar_MoveProposal<D>>;
};

export type Calendar_MovementSettings = {
  relocationPolicy?: import('#features/interaction/scheduling.types').Calendar_EventRelocationPolicy;
  enabled?: boolean;
  canMove?: (event: Calendar_EventInput<unknown>) => boolean;
};
