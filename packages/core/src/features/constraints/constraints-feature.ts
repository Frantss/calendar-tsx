import { calendarConstraints_check } from '#features/constraints/validation';
import type { Calendar_ConfiguredFeature } from '#features/feature.types';
import { isBuiltinProposal } from '#features/interaction/date-target';

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
      validate(proposal, input) {
        if (isBuiltinProposal(proposal))
          return calendarConstraints_check(
            proposal,
            proposal.kind === 'select' ? proposal.range : proposal.after,
            input,
            proposal.kind === 'select' ? undefined : proposal.before.id,
          );
        if (proposal.kind === 'create' || proposal.kind === 'transfer')
          return calendarConstraints_check(proposal, proposal.after, input);
      },
    },
  }) as const satisfies Calendar_ConfiguredFeature;
