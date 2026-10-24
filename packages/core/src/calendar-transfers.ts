import { calendarFeatures_active } from '#features/calendar-features';
import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_DateTarget } from '#calendar-editing';
import { isDateTarget, calendarDateTarget_equal } from '#calendar-editing';
import { calendarMovement_place } from '#calendar-policies';
import { createInteractionOperation } from '#calendar-interactions';
import type { Calendar_InteractionEvaluation, Calendar_InteractionStart } from '#calendar-interaction.types';

export type Calendar_CreateIntent = { kind: 'create'; event: Calendar_EventInput<unknown>; metadata?: unknown };
export type Calendar_CreateProposal<D = unknown> = {
  kind: 'create';
  after: Calendar_EventInput<D>;
  metadata?: unknown;
};
export type Calendar_TransferProposal<D = unknown> = {
  kind: 'transfer';
  sourceId: string;
  destinationId: string;
  before: Calendar_EventInput<D>;
  after: Calendar_EventInput<D>;
};
export type Calendar_TransferSource<D = unknown> = {
  token: number;
  id: string;
  sourceResourceId?: string;
  read: () => Calendar_EventInput<D> | undefined;
  release: () => void;
  complete: (proposal: Calendar_TransferProposal<D>) => void;
};
export type Calendar_TransferIntent = { kind: 'transfer'; source: Calendar_TransferSource };
export type Calendar_ExternalDropSettings<D = unknown> = {
  enabled?: boolean;
  placement?: import('#calendar-policies').Calendar_MovementSettings;
  accept?: (event: Calendar_EventInput<D>, metadata: unknown) => boolean;
};
export type Calendar_CrossCalendarSettings = { id: string; enabled?: boolean; accept?: (sourceId: string) => boolean };
export type Calendar_ExternalDropApi<D> = {
  begin: (event: Calendar_EventInput<D>, metadata?: unknown) => Calendar_InteractionStart;
  evaluate: (
    event: Calendar_EventInput<D>,
    target: Calendar_DateTarget,
    metadata?: unknown,
  ) => Calendar_InteractionEvaluation<Calendar_CreateProposal<D>>;
};
export type Calendar_TransferApi<D> = {
  begin: (source: Calendar_TransferSource<D>) => Calendar_InteractionStart;
  evaluate: (
    source: Calendar_TransferSource<D>,
    target: Calendar_DateTarget,
  ) => Calendar_InteractionEvaluation<Calendar_TransferProposal<D>>;
};
export type Calendar_CrossCalendarApi<D> = {
  prepare: (eventId: string, sourceResourceId?: string) => Calendar_TransferSource<D> | undefined;
};
const createOperation = createInteractionOperation({
  kind: 'create',
  enabled: input => (input.views[input.view].externalDrop?.enabled ?? input.externalDrop?.enabled) !== false,
  source: intent => intent.event,
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  create(intent, target, input) {
    const settings = { ...input.externalDrop, ...input.views[input.view].externalDrop };
    if (settings.accept?.(intent.event, intent.metadata) === false)
      return { status: 'rejected', reason: 'external-source-rejected' };
    if (input.events.some(event => event.id === intent.event.id))
      return { status: 'rejected', reason: 'duplicate-event-id' };
    const after = calendarMovement_place(intent.event, target, settings.placement ?? {});
    return typeof after === 'string'
      ? { status: 'unavailable', reason: after }
      : { status: 'valid', proposal: { kind: 'create', after, metadata: intent.metadata } };
  },
  api: commands => ({
    externalDrop: {
      begin: (event: Calendar_EventInput<unknown>, metadata?: unknown) =>
        commands.begin({ kind: 'create', event, metadata }),
      evaluate: (event: Calendar_EventInput<unknown>, target: Calendar_DateTarget, metadata?: unknown) =>
        commands.evaluate({ kind: 'create', event, metadata }, target),
    },
  }),
  emit: (proposal, context) => context.options.onExternalDrop?.(proposal),
});
export const externalDropFeature = (config: Calendar_ExternalDropSettings = {}) =>
  ({
    '~id': 'externalDropFeature',
    '~config': config,
    requires: ['interactionFeature', 'pointerFeature'],
    interaction: {
      settings: 'externalDrop',
      operation: createOperation,
      deps: input => [
        input.externalDrop?.enabled,
        input.externalDrop?.accept,
        ...Object.values(input.externalDrop?.placement ?? {}),
        input.views[input.view].externalDrop?.enabled,
        input.views[input.view].externalDrop?.accept,
        ...Object.values(input.views[input.view].externalDrop?.placement ?? {}),
      ],
    },
  }) as const satisfies Calendar_ConfiguredFeature;
const transferOperation = createInteractionOperation({
  kind: 'transfer',
  enabled: input =>
    !!input.crossCalendar?.id &&
    (input.views[input.view].crossCalendar?.enabled ?? input.crossCalendar?.enabled) !== false,
  source: intent => intent.source.read(),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  create(intent, target, input) {
    const before = intent.source.read();
    if (!before) return { status: 'unavailable', reason: 'source-changed' };
    const settings = { ...input.crossCalendar, ...input.views[input.view].crossCalendar };
    if (!settings.id || settings.id === intent.source.id) return { status: 'rejected', reason: 'same-calendar' };
    if (settings.accept?.(intent.source.id) === false) return { status: 'rejected', reason: 'calendar-rejected' };
    if (input.events.some(event => event.id === before.id)) return { status: 'rejected', reason: 'duplicate-event-id' };
    const after = calendarMovement_place(
      before,
      target,
      { ...input.movement, ...input.views[input.view].movement },
      intent.source.sourceResourceId,
    );
    return typeof after === 'string'
      ? { status: 'unavailable', reason: after }
      : {
          status: 'valid',
          proposal: { kind: 'transfer', before, after, sourceId: intent.source.id, destinationId: settings.id },
        };
  },
  api: commands => ({
    transfer: {
      begin: (source: Calendar_TransferSource) => commands.begin({ kind: 'transfer', source }),
      evaluate: (source: Calendar_TransferSource, target: Calendar_DateTarget) =>
        commands.evaluate({ kind: 'transfer', source }, target),
    },
  }),
  emit: (proposal, _context, intent) => intent.source.complete(proposal),
});
export const crossCalendarFeature = (config: Partial<Calendar_CrossCalendarSettings> = {}) =>
  ({
    '~id': 'crossCalendarFeature',
    '~config': config,
    requires: ['interactionFeature', 'pointerFeature'],
    constructApi(context) {
      return {
        crossCalendar: {
          prepare(eventId: string, sourceResourceId?: string): Calendar_TransferSource | undefined {
            const isActive = () =>
              calendarFeatures_active(context.features, context.view).some(([key]) => key === 'crossCalendarFeature');
            if (!isActive()) return;
            const settings = context.settings<Partial<Calendar_CrossCalendarSettings>>('crossCalendar', {});
            if (!settings.id || settings.enabled === false) return;
            const before = context.options.events.find(event => event.id === eventId);
            if (!before || before['~source']) return;
            if (
              context
                .settings<import('#calendar-policies').Calendar_MovementSettings>('movement', {})
                .canMove?.(before) === false
            )
              return;
            const session = context.api.move?.begin(eventId, sourceResourceId);
            if (session?.status !== 'active') return;
            let released = false;
            const read = () => {
              context.api.interactions.refresh();
              if (
                released ||
                context.settings<Partial<Calendar_CrossCalendarSettings>>('crossCalendar', {}).id !== settings.id ||
                !isActive() ||
                context
                  .settings<import('#calendar-policies').Calendar_MovementSettings>('movement', {})
                  .canMove?.(before) === false ||
                context.settings<Partial<Calendar_CrossCalendarSettings>>('crossCalendar', {}).enabled === false ||
                !context.api.interactions.isActive(session.token)
              )
                return;
              return context.options.events.find(event => event === before) as Calendar_EventInput<unknown> | undefined;
            };
            const release = () => {
              if (released) return;
              released = true;
              context.api.interactions.cancel(session.token, 'transfer-released');
            };
            return {
              token: session.token,
              id: settings.id,
              sourceResourceId,
              read,
              release,
              complete: proposal => {
                if (!read()) return;
                release();
                context.options.onEventTransfer?.(proposal);
              },
            };
          },
        },
      };
    },
    interaction: {
      settings: 'crossCalendar',
      operation: transferOperation,
      deps: input => [
        input.crossCalendar?.enabled,
        input.crossCalendar?.id,
        input.crossCalendar?.accept,
        ...Object.values(input.views[input.view].crossCalendar ?? {}),
      ],
    },
  }) as const satisfies Calendar_ConfiguredFeature;
