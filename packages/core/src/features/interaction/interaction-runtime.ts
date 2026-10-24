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
  Calendar_Operation,
} from '#features/interaction/interaction.types';
import type {
  Calendar_ActiveLayout,
  Calendar_LayoutPoint,
  Calendar_LayoutLocation,
  Calendar_LayoutProjection,
} from '#layouts/interaction.types';

type Envelope = { kind: string };

/** Erases typed descriptors for registry dispatch; kind and target are checked before creation. */
export const createInteractionOperation = <const K extends Calendar_OperationKind>(
  spec: Calendar_OperationSpec<K>,
): Calendar_Operation & { kind: K } => ({
  kind: spec.kind,
  enabled: spec.enabled,
  source: spec.source ? (intent, input) => spec.source!(intent as Calendar_InteractionIntent<K>, input) : undefined,
  acceptsTarget: spec.acceptsTarget,
  sameTarget: spec.sameTarget
    ? (a, b) => spec.sameTarget!(a as Calendar_OperationTarget<K>, b as Calendar_OperationTarget<K>)
    : undefined,
  create: (intent, target, input) =>
    spec.create(intent as Calendar_InteractionIntent<K>, target as Calendar_OperationTarget<K>, input),
  bind: commands =>
    spec.api?.({
      begin: intent => commands.begin(intent),
      evaluate: (intent, target) =>
        commands.evaluate(intent, target) as Calendar_InteractionEvaluation<Calendar_InteractionProposal<unknown, K>>,
    }) ?? {},
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
    return layout?.feature.project?.(layout, proposal) ?? { status: 'unavailable', reason: 'project-unsupported' };
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
  const registry = new Map<string, { key: string; operation: Calendar_Operation }>();
  for (const [key, feature] of Object.entries(host.features))
    if (feature.interaction?.operation) {
      if (registry.has(feature.interaction.operation.kind))
        throw new Error(`duplicate operation: ${feature.interaction.operation.kind}`);
      registry.set(feature.interaction.operation.kind, { key, operation: feature.interaction.operation });
    }
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
      const reason = feature.interaction?.validate?.(result.proposal as Calendar_InteractionProposal, input);
      if (reason) return { status: 'rejected', reason };
    }
    return result;
  };
  const cancel = (token: number, reason = 'cancelled') => {
    if (lease !== token) return 'stale-token';
    lease = null;
    publish({ ...interactionIdle(), outcome: reason });
    return reason;
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
    return { status: 'active', token } as const;
  };
  const update = (token: number, target: Calendar_OperationTarget) => {
    if (lease !== token) return 'stale-token';
    refresh();
    if (lease !== token) return 'stale-token';
    if (pending || read().session?.token !== token) return 'awaiting-owner';
    const current = read();
    if (!current.session) return current.outcome;
    const operation = operationFor(current.session.intent.kind, host.read());
    if (
      current.session.target !== undefined &&
      operation?.acceptsTarget(current.session.target) &&
      operation.acceptsTarget(target) &&
      (operation.sameTarget?.(current.session.target, target) ?? Object.is(current.session.target, target))
    )
      return 'unchanged';
    publish({
      ...current,
      session: { ...current.session, target },
      candidate: evaluate(current.session.intent, target),
    });
    return pending ? 'awaiting-owner' : read().candidate?.status;
  };
  const commit = (token: number) => {
    if (lease !== token) return 'stale-token';
    refresh();
    if (lease !== token) return 'stale-token';
    if (pending || read().session?.token !== token) return 'awaiting-owner';
    const { session } = read();
    if (!session) return read().outcome;
    if (session.target === undefined) return 'no-target';
    const result = evaluate(session.intent, session.target);
    if (result.status !== 'valid') {
      publish({ ...read(), candidate: result });
      return result.status;
    }
    lease = null;
    publish({ ...interactionIdle(), outcome: 'committed' });
    host.emit(result.proposal as Calendar_InteractionProposal, session.intent as Calendar_InteractionIntent);
    return 'committed';
  };
  const runtime = {
    isActive: (token: number) => lease === token,
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
    bind() {
      const api: Record<string, unknown> = {};
      for (const feature of Object.values(host.features)) {
        Object.assign(api, feature.interaction?.operation?.bind?.({ begin, evaluate }));
      }
      return api;
    },
    dispatch(proposal: Envelope, context: Calendar_FeatureContext, intent: Envelope) {
      registry.get(proposal.kind)?.operation.emit?.(proposal, context, intent);
    },
    update,
    unavailable: (token: number, reason: string) => {
      if (lease !== token) return 'stale-token';
      if (pending || read().session?.token !== token) return 'awaiting-owner';
      const current = read();
      publish({
        ...current,
        session: { ...current.session!, target: undefined },
        candidate: { status: 'unavailable', reason },
      });
      return 'unavailable';
    },
    commit,
    cancel,
    refresh,
    unmount: () => {
      if (lease !== null) cancel(lease, 'unmounted');
    },
  };
  return runtime;
};
