import { Temporal } from 'temporal-polyfill';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { createInteractionOperation } from '#features/interaction/interaction-runtime';
import type { Calendar_InteractionEvaluation } from '#features/interaction/interaction.types';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';
import type { Calendar_Selection, Calendar_SelectProposal } from '#features/date-selection/date-selection.types';
import { isDateTarget, calendarDateTarget_equal } from '#features/interaction/date-target';

const selectOperation = createInteractionOperation({
  enabled: input => (input.views[input.view].selection?.enabled ?? input.selection?.enabled) !== false,
  acceptsTarget: isDateTarget,
  sameTarget: calendarDateTarget_equal,
  kind: 'select',
  create(intent, target): Calendar_InteractionEvaluation<Calendar_SelectProposal> {
    if (intent.kind !== 'select' || intent.anchor.kind !== target.kind)
      return { status: 'unavailable', reason: 'different-date-kinds' };
    const anchor = intent.anchor;
    if (anchor.resourceId !== target.resourceId) return { status: 'rejected', reason: 'different-resources' };
    const resourceIds = target.resourceId ? [target.resourceId] : undefined;
    if (anchor.kind === 'timed' && target.kind === 'timed') {
      const forward = Temporal.ZonedDateTime.compare(anchor.at, target.at) < 0;
      const start = forward ? anchor.at : target.at;
      const end = forward ? target.at : anchor.at;
      if (start.equals(end)) return { status: 'rejected', reason: 'empty-range' };
      return { status: 'valid', proposal: { kind: 'select', range: { kind: 'timed', start, end, resourceIds } } };
    }
    if (anchor.kind === 'allDay' && target.kind === 'allDay') {
      const forward = Temporal.PlainDate.compare(anchor.at, target.at) <= 0;
      return {
        status: 'valid',
        proposal: {
          kind: 'select',
          range: {
            kind: 'allDay',
            start: forward ? anchor.at : target.at,
            end: forward ? target.at : anchor.at,
            resourceIds,
          },
        },
      };
    }
    return { status: 'unavailable', reason: 'different-date-kinds' };
  },
  scheduling: proposal => ({ kind: 'range', range: proposal.range }),
  api: commands => ({
    selection: {
      begin: (anchor: Calendar_DateTarget) => commands.begin({ kind: 'select', anchor }),
      evaluate: (anchor: Calendar_DateTarget, target: Calendar_DateTarget) =>
        commands.evaluate({ kind: 'select', anchor }, target),
    },
  }),
  emit: (proposal, context) => {
    context.setState('selectedRange', () => proposal.range);
    context.options.onSelectionChange?.(proposal.range);
  },
});

export const dateSelectionFeature = (config: { enabled?: boolean } = {}) =>
  ({
    '~id': 'dateSelectionFeature',
    '~config': config,
    requires: ['interactionFeature'],
    getInitialState: () => ({ selectedRange: null as Calendar_Selection | null }),
    interaction: {
      settings: 'selection',
      deps: input => [input.selection?.enabled, input.views[input.view].selection?.enabled],
      operation: selectOperation,
    },
  }) as const satisfies Calendar_ConfiguredFeature;
