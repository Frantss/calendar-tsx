import { createInteractionOperation } from '@calendar-tsx/core';
import type {
  Calendar_EventInput,
  Calendar_ConfiguredFeature,
  Calendar_InteractionEvaluation,
  Calendar_InteractionStart,
} from '@calendar-tsx/core';

export type ApprovalProposal<D = unknown> = { kind: 'approve'; event: Calendar_EventInput<D>; accepted: boolean };
declare module '@calendar-tsx/core' {
  interface Calendar_OperationMap<TData> {
    approve: { intent: { kind: 'approve'; eventId: string }; target: boolean; proposal: ApprovalProposal<TData> };
  }
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    approvalFeature: {
      approval: {
        begin: (eventId: string) => Calendar_InteractionStart;
        evaluate: (eventId: string, accepted: boolean) => Calendar_InteractionEvaluation<ApprovalProposal<TData>>;
      };
    };
  }
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    approvalFeature: { onApproval?: (proposal: ApprovalProposal<TData>) => void };
  }
}
export const approvalFeature = {
  '~id': 'approvalFeature',
  '~config': {},
  requires: ['interactionFeature'],
  interaction: {
    operation: createInteractionOperation({
      kind: 'approve',
      source: (intent, input) => input.events.find(event => event.id === intent.eventId),
      acceptsTarget: (target): target is boolean => typeof target === 'boolean',
      create(intent, target, input): Calendar_InteractionEvaluation<ApprovalProposal> {
        const event = input.events.find(event => event.id === intent.eventId);
        return event && !event['~source']
          ? { status: 'valid', proposal: { kind: 'approve', event, accepted: target } }
          : { status: 'unavailable', reason: 'source-removed' };
      },
      api: commands => ({
        approval: {
          begin: (eventId: string) => commands.begin({ kind: 'approve', eventId }),
          evaluate: (eventId: string, accepted: boolean) => commands.evaluate({ kind: 'approve', eventId }, accepted),
        },
      }),
      emit: (proposal, context) => context.options.onApproval?.(proposal),
    }),
  },
} as const satisfies Calendar_ConfiguredFeature;
