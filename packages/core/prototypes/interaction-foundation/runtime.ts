import type { Temporal } from 'temporal-polyfill';
import type { Calendar_Atom, Calendar_EventInput, Calendar_Feature } from '../../src/calendar.types.ts';

// oxlint-disable-next-line no-unused-vars -- operation declarations share the consumer's payload type
export interface OperationMap<TData = unknown> {}
export interface InputSettings {}
export type OperationKind = Extract<keyof OperationMap, string>;
type Envelope = { kind: string };
type Entry<K extends OperationKind, D = unknown> = OperationMap<D>[K] extends {
  intent: infer I extends Envelope;
  target: infer T;
  proposal: infer P extends Envelope;
}
  ? { intent: I; target: T; proposal: P }
  : never;
export type Intent<K extends OperationKind = OperationKind> = { [P in K]: Entry<P>['intent'] & { kind: P } }[K];
export type OperationTarget<K extends OperationKind = OperationKind> = { [P in K]: Entry<P>['target'] }[K];
export type Proposal<D = unknown, K extends OperationKind = OperationKind> = {
  [P in K]: Entry<P, D>['proposal'] & { kind: P };
}[K];
export type Evaluation<T = Proposal> =
  | { status: 'valid'; proposal: T }
  | { status: 'rejected' | 'unavailable'; reason: string };
export type Start = { status: 'active'; token: number } | { status: 'busy' | 'awaiting-owner' | 'unavailable' };
export type Session = { token: number; intent: Intent; source?: unknown; target?: OperationTarget };
export type Snapshot = { session: Session | null; candidate: Evaluation | null; outcome: string | null };
export type Ownership =
  | { mode: 'internal' }
  | { mode: 'controlled'; read: () => Snapshot; onChange: (next: Snapshot) => void }
  | { mode: 'external'; atom: Calendar_Atom<Snapshot> };
export type Input<TData = unknown> = {
  view: string;
  date: Temporal.PlainDate;
  timeZone: string;
  events: Calendar_EventInput<TData>[];
  views: Record<string, { '~features': object } & InputSettings>;
} & InputSettings;
export type OperationCommands<K extends OperationKind> = {
  begin: (intent: Intent<K>) => Start;
  evaluate: (intent: Intent<K>, target: OperationTarget<K>) => Evaluation<Proposal<unknown, K>>;
};
export type OperationSpec<K extends OperationKind> = {
  kind: K;
  enabled?: (input: Input) => boolean;
  source?: (intent: Intent<K>, input: Input) => unknown;
  acceptsTarget: (target: unknown) => target is OperationTarget<K>;
  sameTarget?: (a: OperationTarget<K>, b: OperationTarget<K>) => boolean;
  create: (intent: Intent<K>, target: OperationTarget<K>, input: Input) => Evaluation<Proposal<unknown, K>>;
  api?: (commands: OperationCommands<K>) => Record<string, unknown>;
  emit?: (proposal: Proposal<unknown, K>, options: unknown) => void;
};
type Commands = {
  begin: (intent: Envelope) => Start;
  evaluate: (intent: Envelope, target: unknown) => Evaluation<Envelope>;
};
export type Operation = {
  kind: string;
  enabled?: (input: Input) => boolean;
  source?: (intent: Envelope, input: Input) => unknown;
  acceptsTarget: (target: unknown) => boolean;
  sameTarget?: (a: unknown, b: unknown) => boolean;
  create: (intent: Envelope, target: unknown, input: Input) => Evaluation<Envelope>;
  bind?: (commands: Commands) => Record<string, unknown>;
  emit?: (proposal: Envelope, options: unknown) => void;
};

/** Erases typed descriptors for registry dispatch; kind and target are checked before creation. */
export const defineOperation = <const K extends OperationKind>(spec: OperationSpec<K>): Operation & { kind: K } => ({
  kind: spec.kind,
  enabled: spec.enabled,
  source: spec.source ? (intent, input) => spec.source!(intent as Intent<K>, input) : undefined,
  acceptsTarget: spec.acceptsTarget,
  sameTarget: spec.sameTarget
    ? (a, b) => spec.sameTarget!(a as OperationTarget<K>, b as OperationTarget<K>)
    : undefined,
  create: (intent, target, input) => spec.create(intent as Intent<K>, target as OperationTarget<K>, input),
  bind: commands =>
    spec.api?.({
      begin: intent => commands.begin(intent),
      evaluate: (intent, target) => commands.evaluate(intent, target) as Evaluation<Proposal<unknown, K>>,
    }) ?? {},
  emit: (proposal, options) => spec.emit?.(proposal as Proposal<unknown, K>, options),
});
export type Feature = Calendar_Feature & {
  requires?: readonly string[];
  operation?: Operation;
  bindRuntime?: (runtime: Runtime) => Record<string, unknown>;
  validate?: (proposal: Proposal, input: Input) => string | undefined;
  interactionDeps?: (input: Input) => readonly unknown[];
};
export type Features = Record<string, Feature>;
export const idle = (): Snapshot => ({ session: null, candidate: null, outcome: null });
type InternalSnapshot = {
  session: { token: number; intent: Envelope; source?: unknown; target?: unknown } | null;
  candidate: Evaluation<Envelope> | null;
  outcome: string | null;
};

const activeKeys = (features: Features, input: Input) => {
  const declared = new Set(Object.values(input.views).flatMap(view => Object.keys(view['~features'])));
  return Object.keys(features).filter(key => !declared.has(key) || key in input.views[input.view]['~features']);
};

export const validateRegistration = (features: Features, input: Input) => {
  const errors: string[] = [];
  const visit = (key: string, path: string[]) => {
    if (path.includes(key)) {
      errors.push(`cycle: ${[...path, key].join(' -> ')}`);
      return;
    }
    for (const dependency of features[key]?.requires ?? []) {
      if (!features[dependency]) errors.push(`${key} requires ${dependency}`);
      else visit(dependency, [...path, key]);
    }
  };
  Object.keys(features).forEach(key => visit(key, []));
  for (const view of Object.keys(input.views)) {
    for (const key of Object.keys(input.views[view]['~features']))
      if (!(key in features)) errors.push(`${view}: missing feature ${key}`);
    const active = activeKeys(features, { ...input, view });
    for (const key of active)
      for (const dependency of features[key].requires ?? [])
        if (!active.includes(dependency)) errors.push(`${view}: ${key} requires active ${dependency}`);
  }
  return [...new Set(errors)];
};

export const createRuntime = (host: {
  features: Features;
  read: () => Input;
  emit: (proposal: Proposal) => void;
  ownership?: Ownership;
}) => {
  const ownership = host.ownership ?? { mode: 'internal' };
  let internal: InternalSnapshot = idle();
  let sequence = 0;
  let lease: number | null = null;
  let pending: InternalSnapshot | null = null;
  const listeners = new Set<() => void>();
  const read = (): InternalSnapshot =>
    ownership.mode === 'controlled'
      ? ownership.read()
      : ownership.mode === 'external'
        ? ownership.atom.state
        : internal;
  let observed = read();
  const notify = () => {
    const current = read();
    if (current === observed) return;
    observed = current;
    listeners.forEach(listener => listener());
  };
  const publish = (next: InternalSnapshot) => {
    if (ownership.mode === 'controlled') {
      pending = next;
      ownership.onChange(next as Snapshot);
      if (read() === next) pending = null;
    } else if (ownership.mode === 'external') ownership.atom.setState(() => next as Snapshot);
    else internal = next;
    notify();
  };
  const errors = validateRegistration(host.features, host.read());
  if (errors.length) throw new Error(errors.join('; '));
  const registry = new Map<string, { key: string; operation: Operation }>();
  for (const [key, feature] of Object.entries(host.features))
    if (feature.operation) {
      if (registry.has(feature.operation.kind)) throw new Error(`duplicate operation: ${feature.operation.kind}`);
      registry.set(feature.operation.kind, { key, operation: feature.operation });
    }
  const operationFor = (kind: string, input: Input) => {
    const entry = registry.get(kind);
    return entry && activeKeys(host.features, input).includes(entry.key) && entry.operation.enabled?.(input) !== false
      ? entry.operation
      : undefined;
  };
  const depsFor = (input: Input) =>
    activeKeys(host.features, input).flatMap(key => host.features[key].interactionDeps?.(input) ?? []);
  let context = host.read();
  let dependencies = depsFor(context);
  const evaluate = (intent: Envelope, target: unknown): Evaluation<Envelope> => {
    const input = host.read();
    const active = activeKeys(host.features, input).map(key => host.features[key]);
    const operation = operationFor(intent.kind, input);
    if (!operation) return { status: 'unavailable', reason: 'operation-disabled' };
    if (!operation.acceptsTarget(target)) return { status: 'unavailable', reason: 'unsupported-target' };
    const result = operation.create(intent, target, input);
    if (result.status !== 'valid') return result;
    if (result.proposal.kind !== operation.kind) return { status: 'rejected', reason: 'operation-result-mismatch' };
    for (const feature of active) {
      const reason = feature.validate?.(result.proposal as Proposal, input);
      if (reason) return { status: 'rejected', reason };
    }
    return result;
  };
  const cancel = (token: number, reason = 'cancelled') => {
    if (lease !== token) return 'stale-token';
    lease = null;
    publish({ ...idle(), outcome: reason });
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
  const begin = (intent: Envelope): Start => {
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
  const update = (token: number, target: OperationTarget) => {
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
    publish({ ...idle(), outcome: 'committed' });
    host.emit(result.proposal as Proposal);
    return 'committed';
  };
  const runtime = {
    store: {
      get state() {
        return read() as Snapshot;
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    evaluate: evaluate as <const I extends Intent>(
      intent: I,
      target: NoInfer<OperationTarget<I['kind']>>,
    ) => Evaluation<Proposal<unknown, I['kind']>>,
    begin: begin as (intent: Intent) => Start,
    bind() {
      const api: Record<string, unknown> = {};
      for (const feature of Object.values(host.features)) {
        Object.assign(api, feature.bindRuntime?.(runtime), feature.operation?.bind?.({ begin, evaluate }));
      }
      return api;
    },
    dispatch(proposal: Envelope, options: unknown) {
      registry.get(proposal.kind)?.operation.emit?.(proposal, options);
    },
    update,
    unavailable(token: number, reason: string) {
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
    dispose: () => {
      if (lease !== null) cancel(lease, 'unmounted');
      listeners.clear();
    },
  };
  return runtime;
};

export type Runtime = ReturnType<typeof createRuntime>;
