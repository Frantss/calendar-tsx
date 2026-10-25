import type { Calendar_EventInput } from '#events/event.types';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import { isDateTarget, calendarDateTarget_equal } from '#features/interaction/date-target';
import {
  calendarPlacement_place,
  calendarRelocation_mergeSettings,
  calendarRelocation_resolve,
} from '#features/interaction/placement';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import type { Calendar_ExternalDropSettings } from '#features/external-drop/external-drop.types';

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
    const after = calendarPlacement_place(intent.event, target, calendarRelocation_resolve(input, 'externalDrop'));
    return typeof after === 'string'
      ? { status: 'unavailable', reason: after }
      : { status: 'valid', proposal: { kind: 'create', after, metadata: intent.metadata } };
  },
  scheduling: proposal => ({ kind: 'event', event: proposal.after }),
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
    requires: ['interactionFeature'],
    interaction: {
      settings: 'externalDrop',
      mergeSettings: calendarRelocation_mergeSettings,
      operation: createOperation,
      deps: input => [
        input.externalDrop?.enabled,
        input.externalDrop?.accept,
        input.views[input.view].externalDrop?.enabled,
        input.views[input.view].externalDrop?.accept,
        ...Object.values(calendarRelocation_resolve(input, 'externalDrop')),
      ],
    },
  }) as const satisfies Calendar_ConfiguredFeature;
