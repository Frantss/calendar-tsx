import type { ExternalDrop_OperationMap } from '#features/external-drop/external-drop.feature-maps';
import type { CrossCalendar_OperationMap } from '#features/cross-calendar/cross-calendar.feature-maps';
import type { DateSelection_OperationMap } from '#features/date-selection/date-selection.feature-maps';
import type { EventMove_OperationMap } from '#features/event-move/event-move.feature-maps';
import type { EventResize_OperationMap } from '#features/event-resize/event-resize.feature-maps';
import type {
  Calendar_FeatureContext,
  Calendar_Features,
  Calendar_Atom,
  Calendar_PickFeatures,
} from '#features/feature.types';
import type { ReadonlyStore } from '@tanstack/store';
import type {
  Calendar_LayoutPoint,
  Calendar_LayoutLocation,
  Calendar_LayoutProjection,
} from '#layouts/interaction.types';
import type { Calendar_SchedulingEffect } from '#features/interaction/scheduling.types';
import type { Calendar_Options } from '#calendar/calendar.types';
import type { Calendar_Views, Calendar_View } from '#views/view.types';
import type { Calendar_ViewSettings_FeatureMap } from '#features/feature-maps.types';

export interface Calendar_OperationMap<TData = unknown>
  extends
    ExternalDrop_OperationMap<TData>,
    CrossCalendar_OperationMap<TData>,
    DateSelection_OperationMap,
    EventMove_OperationMap<TData>,
    EventResize_OperationMap<TData> {}

export type Calendar_OperationKind = Extract<keyof Calendar_OperationMap, string>;

type Envelope = { kind: string };

type Entry<K extends Calendar_OperationKind, D = unknown> = Calendar_OperationMap<D>[K] extends {
  intent: infer I extends Envelope;
  target: infer T;
  proposal: infer P extends Envelope;
}
  ? { intent: I; target: T; proposal: P }
  : never;

export type Calendar_InteractionIntent<K extends Calendar_OperationKind = Calendar_OperationKind> = {
  [P in K]: Entry<P>['intent'] & { kind: P };
}[K];

export type Calendar_OperationTarget<K extends Calendar_OperationKind = Calendar_OperationKind> = {
  [P in K]: Entry<P>['target'];
}[K];

export type Calendar_InteractionProposal<D = unknown, K extends Calendar_OperationKind = Calendar_OperationKind> = {
  [P in K]: Entry<P, D>['proposal'] & { kind: P };
}[K];

export type Calendar_InteractionEvaluation<T = Calendar_InteractionProposal> =
  | { status: 'valid'; proposal: T }
  | { status: 'rejected' | 'unavailable'; reason: string };

export type Calendar_InteractionResult<P = Calendar_InteractionProposal> =
  | Calendar_InteractionEvaluation<P>
  | { status: 'committed'; proposal: P }
  | { status: 'cancelled'; reason: string }
  | { status: 'stale-session' | 'awaiting-owner' | 'unchanged' | 'no-target' };

export type Calendar_InteractionHandle<K extends Calendar_OperationKind = Calendar_OperationKind, D = unknown> = {
  update: (target: Calendar_OperationTarget<K>) => Calendar_InteractionResult<Calendar_InteractionProposal<D, K>>;
  commit: () => Calendar_InteractionResult<Calendar_InteractionProposal<D, K>>;
  cancel: (reason?: string) => Calendar_InteractionResult<Calendar_InteractionProposal<D, K>>;
  unavailable: (reason: string) => Calendar_InteractionResult<Calendar_InteractionProposal<D, K>>;
  isActive: () => boolean;
};

export type Calendar_InteractionStart<K extends Calendar_OperationKind = Calendar_OperationKind, D = unknown> =
  | { status: 'active'; session: Calendar_InteractionHandle<K, D> }
  | { status: 'busy' | 'awaiting-owner' | 'unavailable' };

export type Calendar_InteractionSession = {
  token: number;
  intent: Calendar_InteractionIntent;
  source?: unknown;
  target?: Calendar_OperationTarget;
};

export type Calendar_InteractionSnapshot = {
  session: Calendar_InteractionSession | null;
  candidate: Calendar_InteractionEvaluation | null;
  outcome: string | null;
};

/** Geometry is derived locally; controlled and external owners store only semantic snapshots. */
export type Calendar_InteractionState = Calendar_InteractionSnapshot & {
  preview: import('#layouts/interaction.types').Calendar_LayoutProjection | null;
};

export type Calendar_InteractionOwnership =
  | { mode: 'internal' }
  | {
      mode: 'controlled';
      read: () => Calendar_InteractionSnapshot;
      onChange: (next: Calendar_InteractionSnapshot) => void;
    }
  | {
      mode: 'external';
      atom: Calendar_Atom<Calendar_InteractionSnapshot> & {
        subscribe?: (listener: () => void) => (() => void) | { unsubscribe: () => void };
      };
    };

export type Calendar_InteractionInput<TData = unknown> = Calendar_Options<
  TData,
  unknown,
  Calendar_Views,
  Calendar_Features
> & {
  views: Record<string, Calendar_View & Calendar_PickFeatures<Calendar_ViewSettings_FeatureMap, Calendar_Features>>;
};

export type Calendar_OperationCommands<K extends Calendar_OperationKind> = {
  begin: (intent: Calendar_InteractionIntent<K>) => Calendar_InteractionStart<K>;
  evaluate: (
    intent: Calendar_InteractionIntent<K>,
    target: Calendar_OperationTarget<K>,
  ) => Calendar_InteractionEvaluation<Calendar_InteractionProposal<unknown, K>>;
};

export type Calendar_OperationSpec<K extends Calendar_OperationKind> = {
  kind: K;
  enabled?: (input: Calendar_InteractionInput) => boolean;
  source?: (intent: Calendar_InteractionIntent<K>, input: Calendar_InteractionInput) => unknown;
  acceptsTarget: (target: unknown) => target is Calendar_OperationTarget<K>;
  sameTarget?: (a: Calendar_OperationTarget<K>, b: Calendar_OperationTarget<K>) => boolean;
  create: (
    intent: Calendar_InteractionIntent<K>,
    target: Calendar_OperationTarget<K>,
    input: Calendar_InteractionInput,
  ) => Calendar_InteractionEvaluation<Calendar_InteractionProposal<unknown, K>>;
  scheduling?: (proposal: Calendar_InteractionProposal<unknown, K>) => Calendar_SchedulingEffect;
  api?: (commands: Calendar_OperationCommands<K>, context: Calendar_FeatureContext) => Record<string, unknown>;
  emit?: (
    proposal: Calendar_InteractionProposal<unknown, K>,
    context: Calendar_FeatureContext,
    intent: Calendar_InteractionIntent<K>,
  ) => void;
};

export type Calendar_OperationDefinition = {
  [K in Calendar_OperationKind]: Calendar_OperationSpec<K>;
}[Calendar_OperationKind];

export type Calendar_InteractionContribution = {
  settings?: string;
  /** Layers run from factory defaults to direct view settings; nested merges belong to the feature. */
  mergeSettings?: (layers: readonly unknown[]) => object;
  operation?: Calendar_OperationDefinition;
  validate?: (
    proposal: Calendar_InteractionProposal,
    input: Calendar_InteractionInput,
    scheduling?: Calendar_SchedulingEffect,
  ) => string | undefined;
  deps?: (input: Calendar_InteractionInput) => readonly unknown[];
};

export type Calendar_InteractionControls = {
  store: ReadonlyStore<Calendar_InteractionState>;
  locate: <P extends Calendar_LayoutPoint>(point: P) => Calendar_LayoutLocation<P['kind']>;
  project: (proposal: Calendar_InteractionProposal) => Calendar_LayoutProjection;
  refresh: () => void;
};
