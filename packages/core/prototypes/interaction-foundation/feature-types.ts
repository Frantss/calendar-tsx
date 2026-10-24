import type {
  Calendar_Api_FeatureMap,
  Calendar_Features,
  Calendar_FeaturesOf,
  Calendar_Options,
  Calendar_PickFeatures,
  Calendar_ValidateFeatures,
  Calendar_Views,
} from '../../src/calendar.types.ts';
import {
  createRuntime,
  type Evaluation,
  type Features,
  type MoveProposal,
  type Ownership,
  type Runtime,
  type SelectProposal,
  type Selection,
  type Target,
} from './runtime.ts';

type Start = ReturnType<Runtime['begin']>;
type SelectionApi = {
  begin: (anchor: Target) => Start;
  evaluate: (anchor: Target, target: Target) => Evaluation<SelectProposal>;
};
type MoveApi<D = unknown> = {
  begin: (eventId: string) => Start;
  evaluate: (eventId: string, target: Target) => Evaluation<MoveProposal<D>>;
};

declare module '../../src/calendar.types.ts' {
  interface Calendar_Options_FeatureMap<TData, TResourceData> {
    interactionFeature: { interactionOwnership?: Ownership };
    dateSelectionFeature: { selection?: { enabled?: boolean }; onSelectionChange?: (range: Selection) => void };
    eventMoveFeature: { movement?: { enabled?: boolean }; onEventMove?: (proposal: MoveProposal<TData>) => void };
    constraintsFeature: { constraints?: { preventOverlap?: boolean } };
  }
  interface Calendar_ViewSettings_FeatureMap {
    dateSelectionFeature: { selection?: { enabled?: boolean } };
    eventMoveFeature: { movement?: { enabled?: boolean } };
    constraintsFeature: { constraints?: { preventOverlap?: boolean } };
  }
  interface Calendar_State_FeatureMap {
    dateSelectionFeature: { selectedRange: Selection | null };
  }
  interface Calendar_Api_FeatureMap<TData, TResourceData> {
    interactionFeature: {
      interactions: Pick<Runtime, 'store' | 'update' | 'commit' | 'cancel' | 'refresh' | 'dispose'>;
    };
    dateSelectionFeature: { selection: SelectionApi };
    eventMoveFeature: { move: MoveApi<TData> };
  }
}

type Dependencies<F> = {
  [K in keyof F]: F[K] extends { requires: readonly (infer R extends string)[] } ? Exclude<R, keyof F> : never;
}[keyof F];
type Active<V extends Calendar_Views, F, W extends keyof V> = Pick<
  F,
  Extract<Exclude<keyof F, keyof Calendar_FeaturesOf<V>> | keyof V[W]['~features'], keyof F>
>;
type MissingByView<V extends Calendar_Views, F> = {
  [W in keyof V]: Dependencies<Active<V, F, W>>;
}[keyof V];
export type ValidateDependencies<V extends Calendar_Views, F> = [Dependencies<F> | MissingByView<V, F>] extends [never]
  ? unknown
  : { features: `Error: missing active prerequisite '${(Dependencies<F> | MissingByView<V, F>) & string}'` };

export type PrototypeOptions<D, R, V extends Calendar_Views, F extends Calendar_Features> = Calendar_Options<
  D,
  R,
  V,
  F
> &
  Calendar_ValidateFeatures<V, NoInfer<F>> &
  ValidateDependencies<V, NoInfer<F>>;

// This facade models a post-descriptor construction phase. Production createCalendar does not have it yet.
export const createTypedRuntime = <D, R, const V extends Calendar_Views, const F extends Features>(
  options: PrototypeOptions<D, R, V, F>,
) => {
  const wide = options as Calendar_Options<D, R, Calendar_Views, Calendar_Features>;
  const runtime = createRuntime({
    features: options.features,
    read: () => options,
    ownership: wide.interactionOwnership,
    emit(proposal) {
      if (proposal.kind === 'select') wide.onSelectionChange?.(proposal.range);
      else wide.onEventMove?.(proposal as MoveProposal<D>);
    },
  });
  const api: Record<string, unknown> = {};
  if ('interactionFeature' in options.features) api.interactions = runtime;
  if ('dateSelectionFeature' in options.features)
    api.selection = {
      begin: (anchor: Target) => runtime.begin({ kind: 'select', anchor }),
      evaluate: (anchor: Target, target: Target) => runtime.evaluate({ kind: 'select', anchor }, target),
    };
  if ('eventMoveFeature' in options.features)
    api.move = {
      begin: (eventId: string) => runtime.begin({ kind: 'move', eventId }),
      evaluate: (eventId: string, target: Target) => runtime.evaluate({ kind: 'move', eventId }, target),
    };
  return api as Calendar_PickFeatures<Calendar_Api_FeatureMap<D, R>, F>;
};
