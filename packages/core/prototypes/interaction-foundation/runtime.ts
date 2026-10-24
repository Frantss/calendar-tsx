import { Temporal } from 'temporal-polyfill';
import type { Calendar_Atom, Calendar_EventInput, Calendar_Feature } from '../../src/calendar.types.ts';

export type Target =
  | { kind: 'timed'; at: Temporal.ZonedDateTime; resourceId?: string }
  | { kind: 'allDay'; at: Temporal.PlainDate; resourceId?: string };
export type Selection =
  | { kind: 'timed'; start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime; resourceIds?: string[] }
  | { kind: 'allDay'; start: Temporal.PlainDate; end: Temporal.PlainDate; resourceIds?: string[] };
export type SelectIntent = { kind: 'select'; anchor: Target };
export type MoveIntent = { kind: 'move'; eventId: string };
export type Intent = SelectIntent | MoveIntent;
export type SelectProposal = { kind: 'select'; range: Selection };
export type MoveProposal<TData = unknown> = {
  kind: 'move';
  before: Calendar_EventInput<TData>;
  after: Calendar_EventInput<TData>;
};
export type Proposal<TData = unknown> = SelectProposal | MoveProposal<TData>;
export type Evaluation<T = Proposal> =
  | { status: 'valid'; proposal: T }
  | { status: 'rejected' | 'unavailable'; reason: string };
export type Session = { token: number; intent: Intent; source?: Calendar_EventInput<unknown>; target?: Target };
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
  views: Record<
    string,
    {
      '~features': object;
      selection?: { enabled?: boolean };
      movement?: { enabled?: boolean };
      constraints?: { preventOverlap?: boolean };
    }
  >;
  selection?: { enabled?: boolean };
  movement?: { enabled?: boolean };
  constraints?: { preventOverlap?: boolean };
};
export type Rule = (proposal: Proposal, input: Input) => string | undefined;
export type Operation = {
  kind: Intent['kind'];
  create: (intent: Intent, target: Target, input: Input) => Evaluation;
};
export type Feature = Calendar_Feature & {
  requires?: readonly string[];
  operation?: Operation;
  validate?: Rule;
};
export type Features = Record<string, Feature>;

export const idle = (): Snapshot => ({ session: null, candidate: null, outcome: null });

const selectOperation: Operation = {
  kind: 'select',
  create(intent, target) {
    if (intent.kind !== 'select' || intent.anchor.kind !== target.kind)
      return { status: 'unavailable', reason: 'different-date-kinds' };
    const anchor = intent.anchor;
    if (anchor.resourceId !== target.resourceId) return { status: 'rejected', reason: 'different-resources' };
    const resourceIds = target.resourceId ? [target.resourceId] : undefined;
    if (anchor.kind === 'timed' && target.kind === 'timed') {
      const forward = Temporal.ZonedDateTime.compare(anchor.at, target.at) < 0;
      const start = forward ? anchor.at : target.at;
      const end = forward ? target.at : anchor.at;
      if (start.equals(end)) return { status: 'rejected', reason: 'empty-range' };
      return { status: 'valid', proposal: { kind: 'select', range: { kind: 'timed', start, end, resourceIds } } };
    }
    if (anchor.kind === 'allDay' && target.kind === 'allDay') {
      const forward = Temporal.PlainDate.compare(anchor.at, target.at) <= 0;
      return {
        status: 'valid',
        proposal: {
          kind: 'select',
          range: {
            kind: 'allDay',
            start: forward ? anchor.at : target.at,
            end: forward ? target.at : anchor.at,
            resourceIds,
          },
        },
      };
    }
    return { status: 'unavailable', reason: 'different-date-kinds' };
  },
};

const moveOperation: Operation = {
  kind: 'move',
  create(intent, target, input) {
    if (intent.kind !== 'move') return { status: 'unavailable', reason: 'wrong-operation' };
    const before = input.events.find(event => event.id === intent.eventId);
    if (!before) return { status: 'rejected', reason: 'source-removed' };
    const resourceIds = target.resourceId ? [target.resourceId] : before.resourceIds;
    if (before.kind === 'timed' && target.kind === 'timed') {
      const milliseconds = before.end.epochMilliseconds - before.start.epochMilliseconds;
      if (milliseconds <= 0) return { status: 'rejected', reason: 'invalid-source-range' };
      return {
        status: 'valid',
        proposal: {
          kind: 'move',
          before,
          after: { ...before, start: target.at, end: target.at.add({ milliseconds }), resourceIds },
        },
      };
    }
    if (before.kind === 'allDay' && target.kind === 'allDay') {
      const days = before.start.until(before.end ?? before.start).days;
      if (days < 0) return { status: 'rejected', reason: 'invalid-source-range' };
      return {
        status: 'valid',
        proposal: {
          kind: 'move',
          before,
          after: { ...before, start: target.at, end: target.at.add({ days }), resourceIds },
        },
      };
    }
    return { status: 'unavailable', reason: 'conversion-not-prototyped' };
  },
};

export const interactionFeature = { trackedOptions: [] } as const satisfies Feature;
export const dateSelectionFeature = {
  trackedOptions: [],
  requires: ['interactionFeature'],
  operation: selectOperation,
} as const satisfies Feature;
export const eventMoveFeature = {
  trackedOptions: [],
  requires: ['interactionFeature'],
  operation: moveOperation,
} as const satisfies Feature;
export const constraintsFeature = {
  trackedOptions: [],
  requires: ['interactionFeature'],
  validate(proposal, input) {
    if ((input.views[input.view].constraints?.preventOverlap ?? input.constraints?.preventOverlap) === false) return;
    const range = proposal.kind === 'select' ? proposal.range : proposal.after;
    if (range.kind === 'allDay') return;
    const overlapping = input.events.some(event => {
      if (event.kind !== 'timed' || (proposal.kind === 'move' && event.id === proposal.before.id)) return false;
      if (
        range.resourceIds?.length &&
        event.resourceIds?.length &&
        !range.resourceIds.some(id => event.resourceIds!.includes(id))
      )
        return false;
      return (
        range.start.epochMilliseconds < event.end.epochMilliseconds &&
        range.end.epochMilliseconds > event.start.epochMilliseconds
      );
    });
    return overlapping ? 'overlap' : undefined;
  },
} as const satisfies Feature;

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

const sameTarget = (a: Target | undefined, b: Target) =>
  a?.kind === b.kind && a.resourceId === b.resourceId && a.at.toString() === b.at.toString();

export const createRuntime = (host: {
  features: Features;
  read: () => Input;
  emit: (proposal: Proposal) => void;
  ownership?: Ownership;
}) => {
  const ownership = host.ownership ?? { mode: 'internal' };
  let internal = idle();
  let sequence = 0;
  let lease: number | null = null;
  let pending: Snapshot | null = null;
  const listeners = new Set<() => void>();
  const read = () =>
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
  const publish = (next: Snapshot) => {
    if (ownership.mode === 'controlled') {
      pending = next;
      ownership.onChange(next);
      if (read() === next) pending = null;
    } else if (ownership.mode === 'external') ownership.atom.setState(() => next);
    else internal = next;
    notify();
  };
  const errors = validateRegistration(host.features, host.read());
  if (errors.length) throw new Error(errors.join('; '));
  let context = host.read();
  const evaluate = (intent: Intent, target: Target): Evaluation => {
    const input = host.read();
    const active = activeKeys(host.features, input).map(key => host.features[key]);
    const operation = active.find(feature => feature.operation?.kind === intent.kind)?.operation;
    if (!operation) return { status: 'unavailable', reason: 'operation-disabled' };
    const setting = intent.kind === 'select' ? 'selection' : 'movement';
    if ((input.views[input.view][setting]?.enabled ?? input[setting]?.enabled) === false)
      return { status: 'unavailable', reason: 'operation-disabled' };
    const result = operation.create(intent, target, input);
    if (result.status !== 'valid') return result;
    for (const feature of active) {
      const reason = feature.validate?.(result.proposal, input);
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
    const changed = changedContext || input.events !== context.events || input.views !== context.views;
    if (changedContext && lease !== null) {
      cancel(lease, 'context-changed');
      context = input;
      return;
    }
    if (!session || session.token !== lease) return;
    context = input;
    if (!changed) return;
    if (session.intent.kind === 'move') {
      const id = session.intent.eventId;
      if (input.events.find(event => event.id === id) !== session.source) {
        cancel(session.token, 'source-changed');
        return;
      }
    }
    if (session.target) publish({ ...read(), candidate: evaluate(session.intent, session.target) });
  };
  const begin = (intent: Intent) => {
    if (lease !== null) return { status: 'busy' } as const;
    refresh();
    if (pending) return { status: 'awaiting-owner' } as const;
    const input = host.read();
    const operation = activeKeys(host.features, input).some(key => host.features[key].operation?.kind === intent.kind);
    if (!operation) return { status: 'unavailable' } as const;
    const setting = intent.kind === 'select' ? 'selection' : 'movement';
    if ((input.views[input.view][setting]?.enabled ?? input[setting]?.enabled) === false)
      return { status: 'unavailable' } as const;
    const source = intent.kind === 'move' ? input.events.find(event => event.id === intent.eventId) : undefined;
    if (intent.kind === 'move' && !source) return { status: 'unavailable' } as const;
    const token = ++sequence;
    lease = token;
    context = input;
    publish({ session: { token, intent, source }, candidate: null, outcome: null });
    return { status: 'active', token } as const;
  };
  const update = (token: number, target: Target) => {
    if (lease !== token) return 'stale-token';
    refresh();
    if (lease !== token) return 'stale-token';
    if (pending || read().session?.token !== token) return 'awaiting-owner';
    const current = read();
    if (!current.session) return current.outcome;
    if (sameTarget(current.session.target, target)) return 'unchanged';
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
    if (!session.target) return 'no-target';
    const result = evaluate(session.intent, session.target);
    if (result.status !== 'valid') {
      publish({ ...read(), candidate: result });
      return result.status;
    }
    lease = null;
    publish({ ...idle(), outcome: 'committed' });
    host.emit(result.proposal);
    return 'committed';
  };
  return {
    store: {
      get state() {
        return read();
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    evaluate,
    begin,
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
    dispose() {
      if (lease !== null) cancel(lease, 'unmounted');
      listeners.clear();
    },
  };
};

export type Runtime = ReturnType<typeof createRuntime>;

export const resolveClockTarget = (local: string, timeZone: string, sourceOffset?: string): Evaluation<Target> => {
  const dateTime = Temporal.PlainDateTime.from(local);
  const earlier = dateTime.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
  const later = dateTime.toZonedDateTime(timeZone, { disambiguation: 'later' });
  const choices = [earlier, later].filter(at => at.toPlainDateTime().equals(dateTime));
  const at = choices.find(choice => choice.offset === sourceOffset) ?? choices[0];
  return at
    ? { status: 'valid', proposal: { kind: 'timed', at } }
    : { status: 'unavailable', reason: 'nonexistent-time' };
};
