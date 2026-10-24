import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type {
  Calendar_InteractionEvaluation,
  Calendar_InteractionStart,
} from '#features/interaction/interaction.types';

export type Calendar_CreateIntent = { kind: 'create'; event: Calendar_EventInput<unknown>; metadata?: unknown };

export type Calendar_CreateProposal<D = unknown> = {
  kind: 'create';
  after: Calendar_EventInput<D>;
  metadata?: unknown;
};

export type Calendar_ExternalDropSettings<D = unknown> = {
  enabled?: boolean;
  placement?: import('#features/interaction/scheduling.types').Calendar_PlacementSettings;
  accept?: (event: Calendar_EventInput<D>, metadata: unknown) => boolean;
};

export type Calendar_ExternalDropApi<D> = {
  begin: (event: Calendar_EventInput<D>, metadata?: unknown) => Calendar_InteractionStart<'create', D>;
  evaluate: (
    event: Calendar_EventInput<D>,
    target: Calendar_DateTarget,
    metadata?: unknown,
  ) => Calendar_InteractionEvaluation<Calendar_CreateProposal<D>>;
};
