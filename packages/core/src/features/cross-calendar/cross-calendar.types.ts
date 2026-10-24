import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type {
  Calendar_InteractionEvaluation,
  Calendar_InteractionStart,
} from '#features/interaction/interaction.types';

export type Calendar_TransferProposal<D = unknown> = {
  kind: 'transfer';
  sourceId: string;
  destinationId: string;
  before: Calendar_EventInput<D>;
  after: Calendar_EventInput<D>;
};

export type Calendar_TransferSource<D = unknown> = {
  session: import('#features/interaction/interaction.types').Calendar_InteractionHandle<'move', D>;
  id: string;
  sourceResourceId?: string;
  read: () => Calendar_EventInput<D> | undefined;
  release: () => void;
  complete: (proposal: Calendar_TransferProposal<D>) => void;
};

export type Calendar_TransferIntent = { kind: 'transfer'; source: Calendar_TransferSource };

export type Calendar_CrossCalendarSettings = {
  id: string;
  enabled?: boolean;
  accept?: (sourceId: string) => boolean;
  placement?: import('#features/interaction/scheduling.types').Calendar_PlacementSettings;
};

export type Calendar_TransferApi<D> = {
  prepare: (eventId: string, sourceResourceId?: string) => Calendar_TransferSource<D> | undefined;
  begin: (source: Calendar_TransferSource<D>) => Calendar_InteractionStart<'transfer', D>;
  evaluate: (
    source: Calendar_TransferSource<D>,
    target: Calendar_DateTarget,
  ) => Calendar_InteractionEvaluation<Calendar_TransferProposal<D>>;
};
