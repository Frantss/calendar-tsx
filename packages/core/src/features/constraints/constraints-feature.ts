import { calendarConstraints_check } from '#features/constraints/validation';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';

export const constraintsFeature = (
  config: import('#features/constraints/constraints.types').Calendar_ConstraintSettings = {},
) =>
  ({
    '~id': 'constraintsFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'constraints',
      deps: input => [
        ...Object.values(input.constraints ?? {}),
        ...Object.values(input.views[input.view].constraints ?? {}),
      ],
      validate(proposal, input, scheduling) {
        if (!scheduling) return;
        return calendarConstraints_check(
          proposal,
          scheduling.kind === 'range' ? scheduling.range : scheduling.event,
          input,
          scheduling.kind === 'event' ? scheduling.excludeEventId : undefined,
        );
      },
    },
  }) as const satisfies Calendar_ConfiguredFeature;
