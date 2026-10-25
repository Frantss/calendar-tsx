import { calendarDateEdit_evaluate } from '#features/interaction/date-edit';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type { Calendar_ResizeIntent } from '#features/event-resize/event-resize.types';
import { isDateTarget, calendarDateTarget_equal } from '#features/interaction/date-target';

const resizeOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].resizing?.enabled ?? input.resizing?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'resize',
  create: (intent, target, input) => calendarDateEdit_evaluate('resize', intent, target, input),
  scheduling: proposal => ({ kind: 'event', event: proposal.after, excludeEventId: proposal.before.id }),
  api: commands => ({
    resize: {
      begin: (eventId: string, edge: Calendar_ResizeIntent['edge']) =>
        commands.begin({ kind: 'resize', eventId, edge }),
      evaluate: (eventId: string, edge: Calendar_ResizeIntent['edge'], target: Calendar_DateTarget) =>
        commands.evaluate({ kind: 'resize', eventId, edge }, target),
    },
  }),
  emit: (proposal, context) => context.options.onEventResize?.(proposal),
});

export const eventResizeFeature = (
  config: import('#features/event-resize/event-resize.types').Calendar_ResizeSettings = {},
) =>
  ({
    '~id': 'eventResizeFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'resizing',
      deps: input => [
        input.resizing?.enabled,
        input.resizing?.fromStart,
        input.resizing?.canResize,
        ...Object.values(input.views[input.view].resizing ?? {}),
      ],
      operation: resizeOperation,
    },
  }) as const satisfies Calendar_ConfiguredFeature;
