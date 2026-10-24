import { Temporal } from 'temporal-polyfill';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import type { Calendar_InteractionEvaluation } from '#features/interaction/interaction.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type { Calendar_ResizeIntent, Calendar_ResizeProposal } from '#features/event-resize/event-resize.types';
import { isDateTarget, calendarDateTarget_equal } from '#features/interaction/date-target';

const resizeOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].resizing?.enabled ?? input.resizing?.enabled) !== false,
  source: (intent, input) => input.events.find(event => event.id === intent.eventId),
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'resize',
  create(intent, target, input): Calendar_InteractionEvaluation<Calendar_ResizeProposal> {
    if (intent.kind !== 'resize') return { status: 'unavailable', reason: 'wrong-operation' };
    if (intent.edge !== 'start' && intent.edge !== 'end') return { status: 'rejected', reason: 'invalid-edge' };
    const before = input.events.find(event => event.id === intent.eventId);
    if (!before) return { status: 'rejected', reason: 'source-removed' };
    if (before['~source']) return { status: 'unavailable', reason: 'source-unsupported' };
    const settings = { ...input.resizing, ...input.views[input.view].resizing };
    if (
      (intent.edge === 'start' && settings.fromStart === false) ||
      settings.canResize?.(before, intent.edge) === false
    )
      return { status: 'rejected', reason: 'event-not-editable' };
    if (target.resourceId && before.resourceIds?.length && !before.resourceIds.includes(target.resourceId))
      return { status: 'rejected', reason: 'different-resources' };
    if (before.kind === 'timed' && target.kind === 'timed') {
      if (Temporal.ZonedDateTime.compare(before.start, before.end) >= 0)
        return { status: 'rejected', reason: 'invalid-source-range' };
      const start = intent.edge === 'start' ? target.at : before.start;
      const end = intent.edge === 'end' ? target.at : before.end;
      if (Temporal.ZonedDateTime.compare(start, end) >= 0) return { status: 'rejected', reason: 'invalid-range' };
      return {
        status: 'valid',
        proposal: { kind: 'resize', edge: intent.edge, before, after: { ...before, start, end } },
      };
    }
    if (before.kind === 'allDay' && target.kind === 'allDay') {
      const fixedEnd = before.end ?? before.start;
      if (Temporal.PlainDate.compare(before.start, fixedEnd) > 0)
        return { status: 'rejected', reason: 'invalid-source-range' };
      const start = intent.edge === 'start' ? target.at : before.start;
      const end = intent.edge === 'end' ? target.at : fixedEnd;
      if (Temporal.PlainDate.compare(start, end) > 0) return { status: 'rejected', reason: 'invalid-range' };
      return {
        status: 'valid',
        proposal: { kind: 'resize', edge: intent.edge, before, after: { ...before, start, end } },
      };
    }
    return { status: 'unavailable', reason: 'conversion-unsupported' };
  },
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
