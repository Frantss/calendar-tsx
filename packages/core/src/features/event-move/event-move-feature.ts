import type { Calendar_InteractionInput } from '#features/interaction/interaction.types';
import {
  calendarPlacement_place,
  calendarRelocation_mergeSettings,
  calendarRelocation_resolve,
} from '#features/interaction/placement';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import type { Calendar_InteractionEvaluation } from '#features/interaction/interaction.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type { Calendar_MoveProposal } from '#features/event-move/event-move.types';
import { isDateTarget, calendarDateTarget_equal } from '#features/interaction/date-target';

const relocationPolicy = (input: Calendar_InteractionInput) =>
  calendarRelocation_resolve(
    input,
    input.movement?.relocationPolicy,
    input.views[input.view].movement?.relocationPolicy,
  );

const moveOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].movement?.enabled ?? input.movement?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'move',
  create(intent, target, input): Calendar_InteractionEvaluation<Calendar_MoveProposal> {
    if (intent.kind !== 'move') return { status: 'unavailable', reason: 'wrong-operation' };
    const before = input.events.find(event => event.id === intent.eventId);
    if (!before) return { status: 'rejected', reason: 'source-removed' };
    if (before['~source']) return { status: 'unavailable', reason: 'source-unsupported' };
    const settings = { ...input.movement, ...input.views[input.view].movement };
    if (settings.canMove?.(before) === false) return { status: 'unavailable', reason: 'event-not-editable' };
    const after = calendarPlacement_place(before, target, relocationPolicy(input), intent.sourceResourceId);
    return typeof after === 'string'
      ? { status: 'unavailable', reason: after }
      : { status: 'valid', proposal: { kind: 'move', before, after } };
  },
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
        ...Object.values(relocationPolicy(input)),
      ],
      operation: moveOperation,
    },
  }) as const satisfies Calendar_ConfiguredFeature;
