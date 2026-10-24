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
import { calendarInteractions_create } from '#features/interaction/interaction-runtime';
import type { Calendar_Options } from '#calendar/calendar.types';
import type { Calendar_Views, Calendar_View } from '#views/view.types';
import type { Calendar_ViewSettings_FeatureMap } from '#features/feature-maps.types';

export type Calendar_InteractionRuntime = ReturnType<typeof calendarInteractions_create>;

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

export type Calendar_InteractionStart =
  | { status: 'active'; token: number }
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
  begin: (intent: Calendar_InteractionIntent<K>) => Calendar_InteractionStart;
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
  api?: (commands: Calendar_OperationCommands<K>) => Record<string, unknown>;
  emit?: (
    proposal: Calendar_InteractionProposal<unknown, K>,
    context: Calendar_FeatureContext,
    intent: Calendar_InteractionIntent<K>,
  ) => void;
};

type Commands = {
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
  bind?: (commands: Commands) => Record<string, unknown>;
  emit?: (proposal: Envelope, context: Calendar_FeatureContext, intent: Envelope) => void;
};

export type Calendar_InteractionContribution = {
  settings?: string;
  operation?: Calendar_Operation;
  validate?: (proposal: Calendar_InteractionProposal, input: Calendar_InteractionInput) => string | undefined;
  deps?: (input: Calendar_InteractionInput) => readonly unknown[];
};

export type Calendar_InteractionControls = Pick<
  Calendar_InteractionRuntime,
  'store' | 'locate' | 'project' | 'update' | 'unavailable' | 'commit' | 'cancel' | 'refresh' | 'isActive'
>;
