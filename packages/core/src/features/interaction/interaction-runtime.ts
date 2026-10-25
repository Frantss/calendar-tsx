import type { Calendar_Operation } from '#features/interaction/operation.internal';
import { createStore } from '@tanstack/store';
import type { Calendar_FeatureContext, Calendar_Features } from '#features/feature.types';
import { calendarFeatures_active } from '#features/calendar-features';
import type {
  Calendar_OperationKind,
  Calendar_InteractionIntent,
  Calendar_OperationTarget,
  Calendar_InteractionProposal,
  Calendar_InteractionEvaluation,
  Calendar_InteractionStart,
  Calendar_InteractionSnapshot,
  Calendar_InteractionState,
  Calendar_InteractionOwnership,
  Calendar_InteractionInput,
  Calendar_OperationSpec,
  Calendar_InteractionResult,
  Calendar_InteractionHandle,
} from '#features/interaction/interaction.types';
import type {
  Calendar_ActiveLayout,
  Calendar_LayoutPoint,
  Calendar_LayoutLocation,
  Calendar_LayoutProjection,
} from '#layouts/interaction.types';

type Envelope = { kind: string };

export const createInteractionOperation = <const K extends Calendar_OperationKind>(
  spec: Calendar_OperationSpec<K>,
): Calendar_OperationSpec<K> => spec;

const eraseOperation = <K extends Calendar_OperationKind>(spec: Calendar_OperationSpec<K>): Calendar_Operation => ({
  kind: spec.kind,
  enabled: spec.enabled,
  source: spec.source ? (intent, input) => spec.source!(intent as Calendar_InteractionIntent<K>, input) : undefined,
  acceptsTarget: spec.acceptsTarget,
  sameTarget: spec.sameTarget
    ? (a, b) => spec.sameTarget!(a as Calendar_OperationTarget<K>, b as Calendar_OperationTarget<K>)
    : undefined,
  create: (intent, target, input) =>
    spec.create(intent as Calendar_InteractionIntent<K>, target as Calendar_OperationTarget<K>, input),
  scheduling: spec.scheduling
    ? proposal => spec.scheduling!(proposal as Calendar_InteractionProposal<unknown, K>)
    : undefined,
  bind: (commands, context) =>
    spec.api?.(
      {
        begin: intent => commands.begin(intent) as Calendar_InteractionStart<K>,
        evaluate: (intent, target) =>
          commands.evaluate(intent, target) as Calendar_InteractionEvaluation<Calendar_InteractionProposal<unknown, K>>,
      },
      context,
    ) ?? {},
  emit: (proposal, context, intent) =>
    spec.emit?.(proposal as Calendar_InteractionProposal<unknown, K>, context, intent as Calendar_InteractionIntent<K>),
});

export const interactionIdle = (): Calendar_InteractionSnapshot => ({ session: null, candidate: null, outcome: null });

type InternalSnapshot = {
  session: { token: number; intent: Envelope; source?: unknown; target?: unknown } | null;
  candidate: Calendar_InteractionEvaluation<Envelope> | null;
  outcome: string | null;
};

const activeKeys = (features: Calendar_Features, input: Calendar_InteractionInput) =>
  calendarFeatures_active(features, input.views[input.view]).map(([key]) => key);

export const calendarInteractions_create = (host: {
  features: Calendar_Features;
  read: () => Calendar_InteractionInput;
  emit: (proposal: Calendar_InteractionProposal, intent: Calendar_InteractionIntent) => void;
  ownership?: Calendar_InteractionOwnership;
  layout?: () => Calendar_ActiveLayout;
}) => {
  const registry = new Map<string, { key: string; operation: Calendar_Operation }>();
  for (const [key, feature] of Object.entries(host.features))
    if (feature.interaction?.operation) {
      if (registry.has(feature.interaction.operation.kind))
        throw new Error(`duplicate operation: ${feature.interaction.operation.kind}`);
      registry.set(feature.interaction.operation.kind, {
        key,
        operation: eraseOperation(feature.interaction.operation as Calendar_OperationSpec<Calendar_OperationKind>),
      });
    }
  const ownership = host.ownership ?? { mode: 'internal' };
  let internal: InternalSnapshot = interactionIdle();
  let sequence = 0;
  let lease: number | null = null;
  let pending: InternalSnapshot | null = null;
  const read = (): InternalSnapshot =>
    ownership.mode === 'controlled'
      ? ownership.read()
      : ownership.mode === 'external'
        ? ownership.atom.state
        : internal;
  const store = createStore<Calendar_InteractionSnapshot>(read() as Calendar_InteractionSnapshot);
  const project = (proposal: Calendar_InteractionProposal): Calendar_LayoutProjection => {
    const layout = host.layout?.();
    return (
      layout?.feature.project?.(
        { ...layout, scheduling: registry.get(proposal.kind)?.operation.scheduling?.(proposal) },
        proposal,
      ) ?? { status: 'unavailable', reason: 'project-unsupported' }
    );
  };
  const readonlyStore = createStore((): Calendar_InteractionState => {
    const snapshot = store.state;
    return {
      ...snapshot,
      preview: snapshot.candidate?.status === 'valid' ? project(snapshot.candidate.proposal) : null,
    };
  });
  const notify = () => {
    const current = read() as Calendar_InteractionSnapshot;
    if (current !== store.state) store.setState(() => current);
  };
  const publish = (next: InternalSnapshot) => {
    if (ownership.mode === 'controlled') {
      pending = next;
      ownership.onChange(next as Calendar_InteractionSnapshot);
      if (read() === next) pending = null;
    } else if (ownership.mode === 'external') ownership.atom.setState(() => next as Calendar_InteractionSnapshot);
    else internal = next;
    notify();
  };
  const operationFor = (kind: string, input: Calendar_InteractionInput) => {
    const entry = registry.get(kind);
    return entry && activeKeys(host.features, input).includes(entry.key) && entry.operation.enabled?.(input) !== false
      ? entry.operation
      : undefined;
  };
  const depsFor = (input: Calendar_InteractionInput) =>
    activeKeys(host.features, input).flatMap(key => host.features[key].interaction?.deps?.(input) ?? []);
  let context = host.read();
  let dependencies = depsFor(context);
  const evaluate = (intent: Envelope, target: unknown): Calendar_InteractionEvaluation<Envelope> => {
    const input = host.read();
    const active = activeKeys(host.features, input).map(key => host.features[key]);
    const operation = operationFor(intent.kind, input);
    if (!operation) return { status: 'unavailable', reason: 'operation-disabled' };
    if (!operation.acceptsTarget(target)) return { status: 'unavailable', reason: 'unsupported-target' };
    const result = operation.create(intent, target, input);
    if (result.status !== 'valid') return result;
    if (result.proposal.kind !== operation.kind) return { status: 'rejected', reason: 'operation-result-mismatch' };
    for (const feature of active) {
      const reason = feature.interaction?.validate?.(
        result.proposal as Calendar_InteractionProposal,
        input,
        operation.scheduling?.(result.proposal),
      );
      if (reason) return { status: 'rejected', reason };
    }
    return result;
  };
  const refresh = () => {
    if (read() === pending) pending = null;
    notify();
    const input = host.read();
    const session = read().session;
    const changedContext =
      input.view !== context.view || !input.date.equals(context.date) || input.timeZone !== context.timeZone;
    const nextDependencies = depsFor(input);
    const changed =
      changedContext ||
      input.events !== context.events ||
      input.resources !== context.resources ||
      input.views !== context.views ||
      dependencies.length !== nextDependencies.length ||
      dependencies.some((value, index) => !Object.is(value, nextDependencies[index]));
    if (changedContext && lease !== null) {
      cancel(lease, 'context-changed');
      context = input;
      return;
    }
    if (!session || session.token !== lease) return;
    context = input;
    dependencies = nextDependencies;
    const operation = operationFor(session.intent.kind, input);
    if (!operation) {
      cancel(session.token, 'operation-disabled');
      return;
    }
    if (operation.source && operation.source(session.intent, input) !== session.source) {
      cancel(session.token, 'source-changed');
      return;
    }
    if (changed && session.target !== undefined)
      publish({ ...read(), candidate: evaluate(session.intent, session.target) });
  };
  const begin = (intent: Envelope): Calendar_InteractionStart => {
    if (lease !== null) return { status: 'busy' } as const;
    refresh();
    if (pending) return { status: 'awaiting-owner' } as const;
    const input = host.read();
    const operation = operationFor(intent.kind, input);
    if (!operation) return { status: 'unavailable' };
    const source = operation.source?.(intent, input);
    if (operation.source && source === undefined) return { status: 'unavailable' };
    const token = ++sequence;
    lease = token;
    context = input;
    dependencies = depsFor(input);
    publish({ session: { token, intent, source }, candidate: null, outcome: null });
    return { status: 'active', session: handle(token) } as const;
  };
  const dispatch = (
    token: number,
    command: 'update' | 'commit' | 'cancel' | 'unavailable',
    value?: unknown,
  ): Calendar_InteractionResult => {
    if (lease !== token) return { status: 'stale-session' };
    if (command === 'cancel') {
      const reason = value === undefined ? 'cancelled' : (value as string);
      lease = null;
      publish({ ...interactionIdle(), outcome: reason });
      return { status: 'cancelled', reason };
    }
    if (command !== 'unavailable') refresh();
    if (lease !== token) return { status: 'stale-session' };
    if (pending || read().session?.token !== token) return { status: 'awaiting-owner' };
    const current = read();
    const session = current.session;
    if (command === 'unavailable') {
      const candidate = { status: 'unavailable' as const, reason: value as string };
      publish({ ...current, session: { ...session!, target: undefined }, candidate });
      return { ...candidate };
    }
    if (!session) return { status: 'stale-session' };
    if (command === 'update') {
      const operation = operationFor(session.intent.kind, host.read());
      if (
        session.target !== undefined &&
        operation?.acceptsTarget(session.target) &&
        operation.acceptsTarget(value) &&
        (operation.sameTarget?.(session.target, value) ?? Object.is(session.target, value))
      )
        return { status: 'unchanged' };
      publish({ ...current, session: { ...session, target: value }, candidate: evaluate(session.intent, value) });
      if (lease !== token) return { status: 'stale-session' };
      return pending
        ? { status: 'awaiting-owner' }
        : ((read().candidate as Calendar_InteractionEvaluation | null) ?? { status: 'stale-session' });
    }
    if (session.target === undefined) return { status: 'no-target' };
    const result = evaluate(session.intent, session.target);
    if (result.status !== 'valid') {
      publish({ ...read(), candidate: result });
      return result as Calendar_InteractionEvaluation;
    }
    lease = null;
    publish({ ...interactionIdle(), outcome: 'committed' });
    host.emit(result.proposal as Calendar_InteractionProposal, session.intent as Calendar_InteractionIntent);
    return { status: 'committed', proposal: result.proposal as Calendar_InteractionProposal };
  };
  const cancel = (token: number, reason?: string) => dispatch(token, 'cancel', reason);
  const handle = (token: number): Calendar_InteractionHandle => ({
    update: target => dispatch(token, 'update', target),
    commit: () => dispatch(token, 'commit'),
    cancel: reason => cancel(token, reason),
    unavailable: reason => dispatch(token, 'unavailable', reason),
    isActive: () => lease === token,
  });
  const runtime = {
    store: readonlyStore,
    locate: <const P extends Calendar_LayoutPoint>(point: P): Calendar_LayoutLocation<P['kind']> => {
      const layout = host.layout?.();
      if (!layout?.feature.locate) return { status: 'unavailable', reason: 'locate-unsupported' };
      if (layout.feature.kind !== point.kind) return { status: 'unavailable', reason: 'different-layout' };
      return layout.feature.locate(layout, point) as Calendar_LayoutLocation<P['kind']>;
    },
    project,
    evaluate: evaluate as <const I extends Calendar_InteractionIntent>(
      intent: I,
      target: NoInfer<Calendar_OperationTarget<I['kind']>>,
    ) => Calendar_InteractionEvaluation<Calendar_InteractionProposal<unknown, I['kind']>>,
    begin: begin as (intent: Calendar_InteractionIntent) => Calendar_InteractionStart,
    bind(context: Calendar_FeatureContext) {
      const api: Record<string, unknown> = {};
      for (const { operation } of registry.values()) {
        Object.assign(api, operation.bind?.({ begin, evaluate }, context));
      }
      return api;
    },
    dispatch(proposal: Envelope, context: Calendar_FeatureContext, intent: Envelope) {
      registry.get(proposal.kind)?.operation.emit?.(proposal, context, intent);
    },
    refresh,
    unmount: () => {
      if (lease !== null) cancel(lease, 'unmounted');
    },
  };
  return runtime;
};
