import type { Calendar_EventInput } from '#events/event.types';
import { createInteractionOperation as defineOperation } from '#features/interaction/interaction-runtime';
import type {
  Calendar_InteractionEvaluation as Evaluation,
  Calendar_InteractionStart as Start,
} from '#features/interaction/interaction.types';
import type { Calendar_ConfiguredFeature as Feature } from '#features/feature.types';

export type PriorityTarget = { kind: 'priority'; value: 'low' | 'high' };
export type PriorityIntent = { kind: 'priority'; eventId: string; reason: string };
export type PriorityProposal<D = unknown> = {
  kind: 'priority';
  event: Calendar_EventInput<D>;
  value: PriorityTarget['value'];
  reason: string;
};
export type PriorityApi<D> = {
  begin: (eventId: string, reason: string) => Start<'priority', D>;
  evaluate: (eventId: string, reason: string, target: PriorityTarget) => Evaluation<PriorityProposal<D>>;
};

declare module '#features/interaction/interaction.types' {
  interface Calendar_OperationMap<TData> {
    priority: { intent: PriorityIntent; target: PriorityTarget; proposal: PriorityProposal<TData> };
  }
}
declare module '#features/feature-maps.types' {
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    eventPriorityFeature: {
      priority?: { enabled?: boolean; allowHigh?: boolean };
      onPriorityChange?: (proposal: PriorityProposal<TData>) => void;
    };
  }
  interface Calendar_ViewSettings_FeatureMap {
    eventPriorityFeature: { priority?: { enabled?: boolean; allowHigh?: boolean } };
  }
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    eventPriorityFeature: { priority: PriorityApi<TData> };
  }
}

export const eventPriorityFeature = (config: { enabled?: boolean; allowHigh?: boolean } = {}) =>
  ({
    '~id': 'eventPriorityFeature',
    '~config': config,
    requires: ['interactionFeature'],
    interaction: {
      settings: 'priority',
      deps: input => [
        input.priority?.enabled,
        input.priority?.allowHigh,
        input.views[input.view].priority?.enabled,
        input.views[input.view].priority?.allowHigh,
      ],
      operation: defineOperation({
        kind: 'priority',
        enabled: input => (input.views[input.view].priority?.enabled ?? input.priority?.enabled) !== false,
        source: (intent, input) => input.events.find(event => event.id === intent.eventId),
        acceptsTarget: (target): target is PriorityTarget =>
          !!target &&
          typeof target === 'object' &&
          'kind' in target &&
          target.kind === 'priority' &&
          'value' in target &&
          (target.value === 'low' || target.value === 'high'),
        sameTarget: (a, b) => a.value === b.value,
        create(intent, target, input): Evaluation<PriorityProposal> {
          const event = input.events.find(event => event.id === intent.eventId);
          if (!event) return { status: 'rejected', reason: 'source-removed' };
          if (event['~source']) return { status: 'unavailable', reason: 'source-unsupported' };
          if (!intent.reason.trim()) return { status: 'rejected', reason: 'reason-required' };
          return { status: 'valid', proposal: { kind: 'priority', event, value: target.value, reason: intent.reason } };
        },
        api: commands => ({
          priority: {
            begin: (eventId: string, reason: string) => commands.begin({ kind: 'priority', eventId, reason }),
            evaluate: (eventId: string, reason: string, target: PriorityTarget) =>
              commands.evaluate({ kind: 'priority', eventId, reason }, target),
          },
        }),
        emit: (proposal, context) => context.options.onPriorityChange?.(proposal),
      }),
      validate(proposal, input) {
        if (
          proposal.kind === 'priority' &&
          proposal.value === 'high' &&
          (input.views[input.view].priority?.allowHigh ?? input.priority?.allowHigh) === false
        )
          return 'high-priority-disabled';
      },
    },
  }) as const satisfies Feature;
