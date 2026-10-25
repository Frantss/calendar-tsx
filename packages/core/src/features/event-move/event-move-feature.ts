import { calendarDateEdit_evaluate } from '#features/interaction/date-edit';
import { calendarRelocation_mergeSettings, calendarRelocation_resolve } from '#features/interaction/placement';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import { isDateTarget, calendarDateTarget_equal } from '#features/interaction/date-target';

const moveOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].movement?.enabled ?? input.movement?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'move',
  create: (intent, target, input) => calendarDateEdit_evaluate('move', intent, target, input),
  scheduling: proposal => ({ kind: 'event', event: proposal.after, excludeEventId: proposal.before.id }),
  api: commands => ({
    move: {
      begin: (eventId: string, sourceResourceId?: string) =>
        commands.begin({ kind: 'move', eventId, sourceResourceId }),
      evaluate: (eventId: string, target: Calendar_DateTarget, sourceResourceId?: string) =>
        commands.evaluate({ kind: 'move', eventId, sourceResourceId }, target),
    },
  }),
  emit: (proposal, context) => context.options.onEventMove?.(proposal),
});

export const eventMoveFeature = (
  config: import('#features/event-move/event-move.types').Calendar_MovementSettings = {},
) =>
  ({
    '~id': 'eventMoveFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'movement',
      mergeSettings: calendarRelocation_mergeSettings,
      deps: input => [
        input.movement?.enabled,
        input.movement?.canMove,
        input.views[input.view].movement?.enabled,
        input.views[input.view].movement?.canMove,
        ...Object.values(calendarRelocation_resolve(input, 'movement')),
      ],
      operation: moveOperation,
    },
  }) as const satisfies Calendar_ConfiguredFeature;
