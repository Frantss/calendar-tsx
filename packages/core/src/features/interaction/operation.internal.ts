import type { Calendar_FeatureContext } from '#features/feature.types';
import type {
  Calendar_InteractionStart,
  Calendar_InteractionInput,
  Calendar_InteractionEvaluation,
} from '#features/interaction/interaction.types';
import type { Calendar_SchedulingEffect } from '#features/interaction/scheduling.types';
type Envelope = { kind: string };

export type OperationCommands = {
  begin: (intent: Envelope) => Calendar_InteractionStart;
  evaluate: (intent: Envelope, target: unknown) => Calendar_InteractionEvaluation<Envelope>;
};

export type Calendar_Operation = {
  kind: string;
  enabled?: (input: Calendar_InteractionInput) => boolean;
  source?: (intent: Envelope, input: Calendar_InteractionInput) => unknown;
  acceptsTarget: (target: unknown) => boolean;
  sameTarget?: (a: unknown, b: unknown) => boolean;
  create: (
    intent: Envelope,
    target: unknown,
    input: Calendar_InteractionInput,
  ) => Calendar_InteractionEvaluation<Envelope>;
  scheduling?: (proposal: Envelope) => Calendar_SchedulingEffect;
  bind?: (commands: OperationCommands, context: Calendar_FeatureContext) => Record<string, unknown>;
  emit?: (proposal: Envelope, context: Calendar_FeatureContext, intent: Envelope) => void;
};
